import { debugLog } from "../../utils/debug";
import type { ScrabbleGame } from "../../game/scrabble/ScrabbleGame";
import type { TypedServer, TypedSocket } from "../../src/interfaces/server";
import type { TilePlacement } from "../../src/interfaces/scrabble";

export function setupScrabbleHandlers(
  io: TypedServer,
  socket: TypedSocket,
  game: ScrabbleGame
): void {
  socket.on("start-game", () => {
    debugLog("EVENT: start-game (scrabble)", null, socket.id);

    const result = game.startGame();
    if (result && result.success) {
      io.emit("game-started" as any, game.getGameState());
    }
  });

  // Scrabble-specific events (using rawSocket since TypedSocket doesn't have these yet)
  const rawSocket = socket as any;

  rawSocket.on("place-tiles", (data: { placements: TilePlacement[] }) => {
    debugLog("EVENT: place-tiles", { count: data?.placements?.length }, socket.id);

    if (!data?.placements || !Array.isArray(data.placements)) {
      socket.emit("word-result", { valid: false, reason: "Datos inválidos" });
      return;
    }

    const result = game.placeTiles(socket.id, data.placements);

    if (result.success) {
      io.emit("game-state" as any, game.getGameState());
    } else {
      socket.emit("word-result", { valid: false, reason: result.reason });
    }
  });

  rawSocket.on("recall-tiles", () => {
    debugLog("EVENT: recall-tiles", null, socket.id);

    game.recallTiles(socket.id);
    io.emit("game-state" as any, game.getGameState());
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
      // Send public state (no racks) to other players
      socket.broadcast.emit("game-state" as any, game.getGameState());
      // Send private state (with rack) to submitter
      socket.emit("game-state" as any, game.getGameStateForPlayer(socket.id));
    }
  });

  rawSocket.on("pass-turn", () => {
    debugLog("EVENT: pass-turn", null, socket.id);

    const result = game.passTurn(socket.id);

    if (result.success) {
      io.emit("game-state" as any, game.getGameState());
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
      // Send public state to others, private state (with rack) to exchanger
      socket.broadcast.emit("game-state" as any, game.getGameState());
      socket.emit("game-state" as any, game.getGameStateForPlayer(socket.id));
    } else {
      socket.emit("word-result", { valid: false, reason: result.reason });
    }
  });

  socket.on("reset-game", () => {
    debugLog("EVENT: reset-game (scrabble)", null, socket.id);
    game.resetGame();
    io.emit("game-reset" as any, game.getGameState());
  });
}
