import { debugLog } from "../../utils/debug";
import { saveSession, loadSession, deleteSession } from "../../game/scrabble/gameSessionStore";
import { ScrabbleGame } from "../../game/scrabble/ScrabbleGame";
import type { TypedServer, TypedSocket } from "../../src/interfaces/server";
import type { TilePlacement } from "../../src/interfaces/scrabble";

// Track createdAt per gameId so it's preserved across autoSaves
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
  io: TypedServer,
  socket: TypedSocket,
  game: ScrabbleGame,
  gameId: string = "default-scrabble"
): void {
  socket.on("start-game", () => {
    debugLog("EVENT: start-game (scrabble)", null, socket.id);

    const result = game.startGame();
    if (result && result.success) {
      io.emit("game-started" as any, game.getGameState());
      autoSave(game, gameId);
    }
  });

  const rawSocket = socket as any;

  rawSocket.on("place-tiles", (data: { placements: TilePlacement[] }) => {
    debugLog("EVENT: place-tiles", { count: data?.placements?.length }, socket.id);

    if (!data?.placements || !Array.isArray(data.placements)) {
      socket.emit("word-result", { valid: false, reason: "Datos inválidos" });
      return;
    }

    const result = game.placeTiles(socket.id, data.placements);

    if (result.success) {
      socket.broadcast.emit("game-state" as any, game.getGameState());
      socket.emit("game-state" as any, game.getGameStateForPlayer(socket.id));
    } else {
      socket.emit("word-result", { valid: false, reason: result.reason });
    }
  });

  rawSocket.on("recall-tiles", () => {
    debugLog("EVENT: recall-tiles", null, socket.id);

    game.recallTiles(socket.id);
    socket.broadcast.emit("game-state" as any, game.getGameState());
    socket.emit("game-state" as any, game.getGameStateForPlayer(socket.id));
  });

  rawSocket.on("submit-turn", () => {
    debugLog("EVENT: submit-turn", null, socket.id);

    const result = game.submitTurn(socket.id);

    socket.emit("word-result", {
      valid: result.valid,
      reason: result.reason,
      points: result.score,
      word: result.words?.map((w) => w.word).join(", "),
    });

    if (result.valid) {
      socket.broadcast.emit("game-state" as any, game.getGameState());
      socket.emit("game-state" as any, game.getGameStateForPlayer(socket.id));
      autoSave(game, gameId);
    }
  });

  rawSocket.on("pass-turn", () => {
    debugLog("EVENT: pass-turn", null, socket.id);

    const result = game.passTurn(socket.id);

    if (result.success) {
      io.emit("game-state" as any, game.getGameState());
      autoSave(game, gameId);
    } else {
      socket.emit("word-result", { valid: false, reason: result.reason });
    }
  });

  rawSocket.on("exchange-tiles", (data: { tileIds: string[] }) => {
    debugLog("EVENT: exchange-tiles", { count: data?.tileIds?.length }, socket.id);

    if (!data?.tileIds || !Array.isArray(data.tileIds)) {
      socket.emit("word-result", { valid: false, reason: "Datos inválidos" });
      return;
    }

    const result = game.exchangeTiles(socket.id, data.tileIds);

    if (result.success) {
      socket.broadcast.emit("game-state" as any, game.getGameState());
      socket.emit("game-state" as any, game.getGameStateForPlayer(socket.id));
      autoSave(game, gameId);
    } else {
      socket.emit("word-result", { valid: false, reason: result.reason });
    }
  });

  rawSocket.on("rejoin-game", (data: { playerName: string; gameId: string }) => {
    debugLog("EVENT: rejoin-game", data, socket.id);

    if (!data?.playerName || !data?.gameId) {
      rawSocket.emit("rejoin-failed", { reason: "Datos inválidos para reconexión" });
      return;
    }

    const sessionData = loadSession(data.gameId);
    if (!sessionData) {
      rawSocket.emit("rejoin-failed", { reason: "Sesión no encontrada" });
      return;
    }

    if (sessionData.gameState === "finished") {
      rawSocket.emit("rejoin-failed", { reason: "El juego ya terminó" });
      deleteSession(data.gameId);
      return;
    }

    const playerInGame = sessionData.players.find((p) => p.name === data.playerName);
    if (!playerInGame) {
      rawSocket.emit("rejoin-failed", { reason: "No estás en este juego" });
      return;
    }

    // If the in-memory game has no players (e.g. after server restart), hydrate from session
    if (game.players.size === 0 || game.gameState === "waiting") {
      const restoredGame = ScrabbleGame.deserialize(sessionData);
      // Copy restored state into the existing game instance
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

      // Preserve createdAt from session
      sessionCreatedAt.set(data.gameId, sessionData.createdAt);
    }

    const reconnected = game.reconnectPlayer(data.playerName, socket.id);
    if (!reconnected) {
      rawSocket.emit("rejoin-failed", { reason: "Error al reconectar" });
      return;
    }

    rawSocket.emit("rejoin-success", game.getGameStateForPlayer(socket.id));
    socket.broadcast.emit("player-joined" as any, {
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
    io.emit("game-reset" as any, game.getGameState());
  });
}
