import { debugLog } from "../../utils/debug";
import { saveSession, loadSession, deleteSession } from "../../game/scrabble/gameSessionStore";
import { ScrabbleGame } from "../../game/scrabble/ScrabbleGame";
import type { ScrabbleTypedServer, ScrabbleTypedSocket } from "../../src/interfaces/server";

const sessionCreatedAt = new Map<string, string>();

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
      io.emit("game-state", game.getGameState());
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

  socket.on("reset-game", () => {
    debugLog("EVENT: reset-game (scrabble)", null, socket.id);
    game.resetGame();
    deleteSession(gameId);
    sessionCreatedAt.delete(gameId);
    io.emit("game-reset", game.getGameState());
  });
}
