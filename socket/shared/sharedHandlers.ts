import { debugLog } from "../../utils/debug";
import { loadScoreboard } from "../../utils/scoreboard";
import type { WordGame } from "../../game/shared/WordGame";
import type { TypedServer, TypedSocket } from "../../src/interfaces/server";

export interface SharedHandlerHooks {
  onPlayerJoined?: (socket: TypedSocket, playerName: string) => void;
}

export function setupSharedHandlers(
  io: TypedServer,
  socket: TypedSocket,
  game: WordGame,
  hooks?: SharedHandlerHooks
): void {
  socket.on("join-game", (playerName: string) => {
    debugLog("EVENT: join-game", { playerName }, socket.id);

    const finalName =
      playerName && playerName.trim()
        ? playerName.trim()
        : game.getRandomName();

    game.addPlayer(socket.id, finalName);

    debugLog(
      "EMIT: game-state (after join)",
      { playerCount: game.players.size, finalName },
      socket.id
    );

    // TODO(step5): remove `as any` when TypedSocket is game-generic
    socket.emit("game-state", game.getGameState() as any);

    debugLog("EMIT: join-confirmed", { finalName }, socket.id);
    socket.emit("join-confirmed", {
      playerId: socket.id,
      playerName: finalName,
    });

    hooks?.onPlayerJoined?.(socket, finalName);

    debugLog("BROADCAST: player-joined", { finalName }, socket.id);
    socket.broadcast.emit("player-joined", {
      playerId: socket.id,
      playerName: finalName,
    });
  });

  socket.on("get-scoreboard", () => {
    debugLog("EVENT: get-scoreboard", null, socket.id);
    const scoreboard = loadScoreboard();
    debugLog("EMIT: scoreboard-data", { count: scoreboard.length }, socket.id);
    socket.emit("scoreboard-data", scoreboard);
  });

  socket.on("toggle-client-side-validation", (enabled: boolean) => {
    debugLog("EVENT: toggle-client-side-validation", { enabled }, socket.id);
    game.setClientSideValidation(enabled);
    debugLog("EMIT: client-side-validation-changed", { enabled });
    io.emit("client-side-validation-changed", { enabled });
  });

  socket.on("disconnect", () => {
    debugLog("EVENT: disconnect", null, socket.id);
    game.removePlayer(socket.id);
    socket.broadcast.emit("player-left", socket.id);
  });
}
