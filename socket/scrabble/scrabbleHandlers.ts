import { debugLog } from "../../utils/debug";
import { SCRABBLE_GRACE_PERIOD } from "../../config/scrabbleConstants";
import { saveSession, loadSession, deleteSession } from "../../game/scrabble/gameSessionStore";
import { ScrabbleGame } from "../../game/scrabble/ScrabbleGame";
import { LETTER_VALUES } from "../../game/scrabble/scrabbleConfig";
import type { Room } from "../../game/rooms/RoomManager";
import type { GameStatus } from "../../src/interfaces/game";
import type { ScrabbleTypedServer, ScrabbleTypedSocket } from "../../src/interfaces/server";

// Shared by all Scrabble rooms. Sessions are keyed by room code (= gameId), grace
// timers by "<code>:<playerName>" so rooms never touch each other's players.
const sessionCreatedAt = new Map<string, string>();
const graceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const graceKey = (room: Room, playerName: string) => `${room.code}:${playerName}`;

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

/** Scrabble events for a socket inside `room`; broadcasts go to that room only. */
export function setupScrabbleHandlers(io: ScrabbleTypedServer, socket: ScrabbleTypedSocket, room: Room): void {
  const game = room.game as ScrabbleGame;
  // The room code doubles as the persisted session id
  const gameId = room.code;
  const toRoom = () => io.to(room.key);
  const toOthers = () => socket.to(room.key);

  socket.on("start-game", () => {
    debugLog("EVENT: start-game (scrabble)", null, socket.id);

    const result = game.startGame();
    if (!result || !result.success) {
      socket.emit("start-failed", {
        reason: game.players.size < 2 ? "Se necesitan al menos 2 jugadores" : "No se pudo iniciar la partida",
      });
      return;
    }

    // gameId lets clients persist a session for reconnection
    toRoom().emit("game-started", { ...game.getGameState(), gameId });
    // Send each player their private rack
    for (const playerId of game.players.keys()) {
      io.sockets.sockets.get(playerId)?.emit("game-state", game.getGameStateForPlayer(playerId));
    }
    autoSave(game, gameId);
  });

  socket.on("place-tiles", (data) => {
    debugLog("EVENT: place-tiles", { count: data?.placements?.length }, socket.id);

    if (!data?.placements || !Array.isArray(data.placements)) {
      socket.emit("word-result", { valid: false, reason: "Datos inválidos" });
      return;
    }

    const result = game.placeTiles(socket.id, data.placements);

    if (result.success) {
      toOthers().emit("game-state", game.getGameState());
    } else {
      socket.emit("word-result", { valid: false, reason: result.reason });
    }
    // Always send the player their authoritative rack + tentative placements
    socket.emit("game-state", game.getGameStateForPlayer(socket.id));
  });

  socket.on("recall-tiles", () => {
    debugLog("EVENT: recall-tiles", null, socket.id);

    game.recallTiles(socket.id);
    toOthers().emit("game-state", game.getGameState());
    socket.emit("game-state", game.getGameStateForPlayer(socket.id));
  });

  socket.on("recall-tile", (data) => {
    debugLog("EVENT: recall-tile", data, socket.id);

    if (typeof data?.tileId !== "string") {
      socket.emit("word-result", { valid: false, reason: "Datos inválidos" });
      return;
    }

    const result = game.recallTile(socket.id, data.tileId);
    if (result.success) {
      toOthers().emit("game-state", game.getGameState());
    } else {
      socket.emit("word-result", { valid: false, reason: result.reason });
    }
    // Always resync the player's rack + tentative placements
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

    // On invalid turns the game recalls the tentative tiles server-side, so the
    // player must receive the refreshed state too or their view desyncs.
    toOthers().emit("game-state", game.getGameState());
    socket.emit("game-state", game.getGameStateForPlayer(socket.id));
    if (result.valid) autoSave(game, gameId);
  });

  socket.on("pass-turn", () => {
    debugLog("EVENT: pass-turn", null, socket.id);

    const result = game.passTurn(socket.id);

    if (result.success) {
      toOthers().emit("game-state", game.getGameState());
      socket.emit("game-state", game.getGameStateForPlayer(socket.id));
      autoSave(game, gameId);
    } else {
      socket.emit("word-result", { valid: false, reason: result.reason });
    }
  });

  socket.on("skip-turn", () => {
    debugLog("EVENT: skip-turn", null, socket.id);

    const result = game.skipTurn(socket.id);
    if (!result.success || !result.skippedPlayerId) {
      socket.emit("word-result", { valid: false, reason: result.reason });
      return;
    }

    // The skipped player's tentative tiles were recalled: they need their private state
    const skippedId = result.skippedPlayerId;
    toRoom().emit("game-state", game.getGameState());
    io.sockets.sockets.get(skippedId)?.emit("game-state", game.getGameStateForPlayer(skippedId));
    socket.emit("game-state", game.getGameStateForPlayer(socket.id));
    autoSave(game, gameId);
  });

  socket.on("exchange-tiles", (data) => {
    debugLog("EVENT: exchange-tiles", { count: data?.tileIds?.length }, socket.id);

    if (!data?.tileIds || !Array.isArray(data.tileIds)) {
      socket.emit("word-result", { valid: false, reason: "Datos inválidos" });
      return;
    }

    const result = game.exchangeTiles(socket.id, data.tileIds);

    if (result.success) {
      toOthers().emit("game-state", game.getGameState());
      socket.emit("game-state", game.getGameStateForPlayer(socket.id));
      autoSave(game, gameId);
    } else {
      socket.emit("word-result", { valid: false, reason: result.reason });
    }
  });

  socket.on("leave-game", () => {
    debugLog("EVENT: leave-game", null, socket.id);

    if (!game.players.has(socket.id)) return;

    // Leaving on purpose skips the reconnection grace period. During a game this
    // hands the turn on, or ends the game by abandon if only one player is left.
    game.removePlayer(socket.id);
    autoSave(game, gameId);
    if ((game.gameState as GameStatus) !== "finished") {
      toRoom().emit("player-left", socket.id);
      toRoom().emit("game-state", game.getGameState());
    }
  });

  // Deterministic racks for e2e tests (a random rack rarely has a blank). Never
  // registered unless the server was started with SCRABBLE_E2E_HOOKS=1.
  if (process.env.SCRABBLE_E2E_HOOKS === "1") {
    socket.on("e2e-set-rack", (data) => {
      if (!game.players.has(socket.id) || !Array.isArray(data?.letters)) return;
      game.playerRacks.set(
        socket.id,
        data.letters.map((letter, i) => ({
          id: `e2e-${Date.now()}-${i}`,
          letter,
          value: letter ? LETTER_VALUES[letter] ?? 0 : 0,
          isBlank: letter === "",
        }))
      );
      socket.emit("game-state", game.getGameStateForPlayer(socket.id));
    });
  }

  // Grace period disconnect handler (overrides shared handler which is skipped for Scrabble)
  socket.on("disconnect", () => {
    debugLog("EVENT: disconnect (scrabble)", null, socket.id);

    const player = game.players.get(socket.id);
    // Already remapped to a new socket (reconnect) or never joined: nothing to announce
    if (!player) return;

    if (game.gameState !== "playing") {
      game.removePlayer(socket.id);
      toOthers().emit("player-left", socket.id);
      return;
    }

    // Mark as disconnected but DON'T remove yet — others see them greyed out with a countdown
    player.isConnected = false;
    game.notifyStatusChange();
    const playerName = player.name;
    toOthers().emit("player-disconnected", {
      playerId: socket.id,
      playerName,
      graceSeconds: SCRABBLE_GRACE_PERIOD / 1000,
    });
    toOthers().emit("game-state", game.getGameState());

    // Start grace period — auto-pass and remove after SCRABBLE_GRACE_PERIOD
    const timer = setTimeout(() => {
      graceTimers.delete(graceKey(room, playerName));
      const isCurrentTurn = game.getCurrentTurnPlayerId() === socket.id;
      if (isCurrentTurn) {
        game.passTurn(socket.id, "disconnect");
      }

      // passTurn may have triggered endGame (e.g. all players passed consecutively),
      // which already emitted game-ended and cleaned up. Don't removePlayer on a finished game.
      if (game.gameState === "finished") {
        autoSave(game, gameId);
        debugLog("SCRABBLE_GRACE_PERIOD_EXPIRED", { playerName, gameEnded: true });
        return;
      }

      game.removePlayer(socket.id);
      autoSave(game, gameId);
      // With fewer than 2 players left, removePlayer ended the game by abandon
      // and game-ended already carries the final state.
      // (cast: TS keeps the narrowing from the check above across the call)
      if ((game.gameState as GameStatus) !== "finished") {
        toRoom().emit("player-left", socket.id);
        toRoom().emit("game-state", game.getGameState());
      }
      debugLog("SCRABBLE_GRACE_PERIOD_EXPIRED", { playerName, gameState: game.gameState });
    }, SCRABBLE_GRACE_PERIOD);

    graceTimers.set(graceKey(room, playerName), timer);
    debugLog("SCRABBLE_GRACE_TIMER_STARTED", { playerName, gracePeriod: SCRABBLE_GRACE_PERIOD });
  });

  socket.on("reset-game", () => {
    debugLog("EVENT: reset-game (scrabble)", null, socket.id);

    // Clear this room's grace timers to prevent stale callbacks
    for (const [key, timer] of graceTimers) {
      if (!key.startsWith(`${room.code}:`)) continue;
      clearTimeout(timer);
      graceTimers.delete(key);
      debugLog("SCRABBLE_GRACE_TIMER_CLEARED_ON_RESET", { key });
    }

    game.resetGame();
    deleteSession(gameId);
    sessionCreatedAt.delete(gameId);
    toRoom().emit("game-reset", game.getGameState());
  });
}

/**
 * A player coming back (reload, network drop, server restart) to the Scrabble game in
 * `room`, identified by name. Returns whether they got their seat back.
 */
export function rejoinScrabble(
  io: ScrabbleTypedServer,
  socket: ScrabbleTypedSocket,
  room: Room,
  data: { playerName: string; gameId: string }
): boolean {
  const game = room.game as ScrabbleGame;
  debugLog("EVENT: rejoin-game", data, socket.id);

  if (!data?.playerName || !data?.gameId) {
    socket.emit("rejoin-failed", { reason: "Datos inválidos para reconexión" });
    return false;
  }

  const sessionData = loadSession(data.gameId);
  if (!sessionData) {
    socket.emit("rejoin-failed", { reason: "Sesión no encontrada" });
    return false;
  }

  if (sessionData.gameState === "finished") {
    socket.emit("rejoin-failed", { reason: "El juego ya terminó" });
    deleteSession(data.gameId);
    return false;
  }

  const playerInGame = sessionData.players.find((p) => p.name === data.playerName);
  if (!playerInGame) {
    socket.emit("rejoin-failed", { reason: "No estás en este juego" });
    return false;
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
    game.turnTimes = restoredGame.turnTimes;
    sessionCreatedAt.set(data.gameId, sessionData.createdAt);
    // The restored turn's timer is not running yet (e.g. after a server restart)
    game.resumeTurnTimer();
  }

  // Newest connection wins: on a page reload the new socket's rejoin can arrive
  // before the old socket's disconnect is processed. Drop the stale one first.
  const existing = [...game.players.values()].find((p) => p.name === data.playerName);
  if (existing && existing.isConnected && existing.id !== socket.id) {
    io.sockets.sockets.get(existing.id)?.disconnect(true);
    existing.isConnected = false;
  }

  const reconnected = game.reconnectPlayer(data.playerName, socket.id);
  if (!reconnected) {
    socket.emit("rejoin-failed", { reason: "Error al reconectar" });
    return false;
  }

  // Cancel grace period if active
  const existingTimer = graceTimers.get(graceKey(room, data.playerName));
  if (existingTimer) {
    clearTimeout(existingTimer);
    graceTimers.delete(graceKey(room, data.playerName));
    debugLog("SCRABBLE_GRACE_TIMER_CANCELLED", { playerName: data.playerName });
  }

  socket.emit("rejoin-success", game.getGameStateForPlayer(socket.id));
  socket.to(room.key).emit("player-reconnected", {
    playerId: socket.id,
    playerName: data.playerName,
  });
  socket.to(room.key).emit("game-state", game.getGameState());

  debugLog("SCRABBLE_REJOIN_SUCCESS", {
    playerName: data.playerName,
    gameId: data.gameId,
  });
  return true;
}
