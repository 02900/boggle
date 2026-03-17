import { debugLog } from "../../utils/debug";
import { SCRABBLE_GRACE_PERIOD } from "../../config/scrabbleConstants";
import { saveSession, loadSession, deleteSession } from "../../game/scrabble/gameSessionStore";
import { ScrabbleGame } from "../../game/scrabble/ScrabbleGame";
import type { ScrabbleTypedServer, ScrabbleTypedSocket } from "../../src/interfaces/server";

const sessionCreatedAt = new Map<string, string>();
const graceTimers = new Map<string, ReturnType<typeof setTimeout>>(); // keyed by playerName

function autoSave(game: ScrabbleGame, gameId: string): void {
  if (game.gameState === "playing") {
    const createdAt = sessionCreatedAt.get(gameId);
    saveSession(gameId, game.serialize(gameId, createdAt));
    if (!createdAt) {
      sessionCreatedAt.set(gameId, new Date().toISOString());
    }
  } else if (game.gameState === "finished") {
    deleteSession(gameId);
    sessionCreatedAt.delete(gameId);
  }
}

export function setupScrabbleHandlers(
  io: ScrabbleTypedServer,
  socket: ScrabbleTypedSocket,
  game: ScrabbleGame,
  gameId: string = "default-scrabble"
): void {
  socket.on("start-game", () => {
    debugLog("EVENT: start-game (scrabble)", null, socket.id);

    const result = game.startGame();
    if (result && result.success) {
      io.emit("game-started", game.getGameState());
      // Send each player their private rack
      for (const [, s] of io.sockets.sockets) {
        const raw = s.handshake.query.game;
        const sGameType = Array.isArray(raw) ? raw[0] : raw;
        if (sGameType === "scrabble" && game.players.has(s.id)) {
          s.emit("game-state", game.getGameStateForPlayer(s.id));
        }
      }
      autoSave(game, gameId);
    }
  });

  socket.on("place-tiles", (data) => {
    debugLog("EVENT: place-tiles", { count: data?.placements?.length }, socket.id);

    if (!data?.placements || !Array.isArray(data.placements)) {
      socket.emit("word-result", { valid: false, reason: "Datos inválidos" });
      return;
    }

    const result = game.placeTiles(socket.id, data.placements);

    if (result.success) {
      socket.broadcast.emit("game-state", game.getGameState());
      socket.emit("game-state", game.getGameStateForPlayer(socket.id));
    } else {
      socket.emit("word-result", { valid: false, reason: result.reason });
    }
  });

  socket.on("recall-tiles", () => {
    debugLog("EVENT: recall-tiles", null, socket.id);

    game.recallTiles(socket.id);
    socket.broadcast.emit("game-state", game.getGameState());
    socket.emit("game-state", game.getGameStateForPlayer(socket.id));
  });

  socket.on("submit-turn", () => {
    debugLog("EVENT: submit-turn", null, socket.id);

    const result = game.submitTurn(socket.id);

    socket.emit("word-result", {
      valid: result.valid,
      reason: result.reason,
      points: result.score,
      word: result.words?.map((w) => w.word).join(", "),
    });

    if (result.valid) {
      socket.broadcast.emit("game-state", game.getGameState());
      socket.emit("game-state", game.getGameStateForPlayer(socket.id));
      autoSave(game, gameId);
    }
  });

  socket.on("pass-turn", () => {
    debugLog("EVENT: pass-turn", null, socket.id);

    const result = game.passTurn(socket.id);

    if (result.success) {
      socket.broadcast.emit("game-state", game.getGameState());
      socket.emit("game-state", game.getGameStateForPlayer(socket.id));
      autoSave(game, gameId);
    } else {
      socket.emit("word-result", { valid: false, reason: result.reason });
    }
  });

  socket.on("exchange-tiles", (data) => {
    debugLog("EVENT: exchange-tiles", { count: data?.tileIds?.length }, socket.id);

    if (!data?.tileIds || !Array.isArray(data.tileIds)) {
      socket.emit("word-result", { valid: false, reason: "Datos inválidos" });
      return;
    }

    const result = game.exchangeTiles(socket.id, data.tileIds);

    if (result.success) {
      socket.broadcast.emit("game-state", game.getGameState());
      socket.emit("game-state", game.getGameStateForPlayer(socket.id));
      autoSave(game, gameId);
    } else {
      socket.emit("word-result", { valid: false, reason: result.reason });
    }
  });

  socket.on("rejoin-game", (data) => {
    debugLog("EVENT: rejoin-game", data, socket.id);

    if (!data?.playerName || !data?.gameId) {
      socket.emit("rejoin-failed", { reason: "Datos inválidos para reconexión" });
      return;
    }

    const sessionData = loadSession(data.gameId);
    if (!sessionData) {
      socket.emit("rejoin-failed", { reason: "Sesión no encontrada" });
      return;
    }

    if (sessionData.gameState === "finished") {
      socket.emit("rejoin-failed", { reason: "El juego ya terminó" });
      deleteSession(data.gameId);
      return;
    }

    const playerInGame = sessionData.players.find((p) => p.name === data.playerName);
    if (!playerInGame) {
      socket.emit("rejoin-failed", { reason: "No estás en este juego" });
      return;
    }

    if (game.players.size === 0 || game.gameState === "waiting") {
      const restoredGame = ScrabbleGame.deserialize(sessionData);
      game.board = restoredGame.board;
      game.tileBag = restoredGame.tileBag;
      game.gameState = restoredGame.gameState;
      game.turnTimeLeft = restoredGame.turnTimeLeft;
      game.consecutivePasses = restoredGame.consecutivePasses;
      game.moveHistory = restoredGame.moveHistory;
      game.isFirstTurn = restoredGame.isFirstTurn;
      game.players = restoredGame.players;
      game.gameHistory = restoredGame.gameHistory;
      game.playerOrder = restoredGame.playerOrder;
      game.playerRacks = restoredGame.playerRacks;
      game.currentTurnIndex = restoredGame.currentTurnIndex;
      game.tentativePlacements = restoredGame.tentativePlacements;
      sessionCreatedAt.set(data.gameId, sessionData.createdAt);
    }

    const reconnected = game.reconnectPlayer(data.playerName, socket.id);
    if (!reconnected) {
      socket.emit("rejoin-failed", { reason: "Error al reconectar" });
      return;
    }

    // Cancel grace period if active
    const existingTimer = graceTimers.get(data.playerName);
    if (existingTimer) {
      clearTimeout(existingTimer);
      graceTimers.delete(data.playerName);
      debugLog("SCRABBLE_GRACE_TIMER_CANCELLED", { playerName: data.playerName });
    }

    socket.emit("rejoin-success", game.getGameStateForPlayer(socket.id));
    socket.broadcast.emit("player-joined", {
      playerId: socket.id,
      playerName: data.playerName,
    });

    debugLog("SCRABBLE_REJOIN_SUCCESS", {
      playerName: data.playerName,
      gameId: data.gameId,
    });
  });

  // Grace period disconnect handler (overrides shared handler which is skipped for Scrabble)
  socket.on("disconnect", () => {
    debugLog("EVENT: disconnect (scrabble)", null, socket.id);

    const player = game.players.get(socket.id);
    if (!player || game.gameState !== "playing") {
      game.removePlayer(socket.id);
      socket.broadcast.emit("player-left", socket.id);
      return;
    }

    // Mark as disconnected but DON'T remove yet
    player.isConnected = false;
    socket.broadcast.emit("player-left", socket.id);

    const playerName = player.name;

    // Start grace period — auto-pass and remove after SCRABBLE_GRACE_PERIOD
    const timer = setTimeout(() => {
      graceTimers.delete(playerName);
      const isCurrentTurn = game.getCurrentTurnPlayerId() === socket.id;
      if (isCurrentTurn) {
        game.passTurn(socket.id);
      }

      // passTurn may have triggered endGame (e.g. all players passed consecutively),
      // which already emitted game-ended and cleaned up. Don't removePlayer on a finished game.
      if (game.gameState === "finished") {
        autoSave(game, gameId);
        debugLog("SCRABBLE_GRACE_PERIOD_EXPIRED", { playerName, gameEnded: true });
        return;
      }

      game.removePlayer(socket.id);
      io.emit("game-state", game.getGameState());
      autoSave(game, gameId);
      debugLog("SCRABBLE_GRACE_PERIOD_EXPIRED", { playerName });
    }, SCRABBLE_GRACE_PERIOD);

    graceTimers.set(playerName, timer);
    debugLog("SCRABBLE_GRACE_TIMER_STARTED", { playerName, gracePeriod: SCRABBLE_GRACE_PERIOD });
  });

  socket.on("reset-game", () => {
    debugLog("EVENT: reset-game (scrabble)", null, socket.id);

    // Clear all active grace timers to prevent stale callbacks
    for (const [name, timer] of graceTimers) {
      clearTimeout(timer);
      debugLog("SCRABBLE_GRACE_TIMER_CLEARED_ON_RESET", { playerName: name });
    }
    graceTimers.clear();

    game.resetGame();
    deleteSession(gameId);
    sessionCreatedAt.delete(gameId);
    io.emit("game-reset", game.getGameState());
  });
}
