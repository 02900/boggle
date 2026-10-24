import { debugLog } from "../../utils/debug";
import type { Room } from "../../game/rooms/RoomManager";
import type { TypedServer, TypedSocket } from "../../src/interfaces/server";

export interface SharedHandlerHooks {
  onPlayerJoined?: (socket: TypedSocket, playerName: string) => void;
  skipDisconnect?: boolean;
  /** Game-specific admission check; a rejected join gets `join-failed` instead of joining. */
  canJoin?: () => { ok: boolean; reason?: string };
}

/**
 * Adds the socket's player to the room's game (the socket must already be in the
 * Socket.IO room). Returns false, after telling the player why, if they can't join.
 */
export function joinPlayer(
  socket: TypedSocket,
  room: Room,
  playerName: string,
  hooks?: SharedHandlerHooks
): boolean {
  const { game } = room;
  debugLog("JOIN_ROOM_PLAYER", { room: room.key, playerName }, socket.id);

  const admission = hooks?.canJoin?.();
  if (admission && !admission.ok) {
    debugLog("EMIT: join-failed", { reason: admission.reason }, socket.id);
    socket.emit("join-failed", { reason: admission.reason ?? "No puedes unirte a esta partida" });
    return false;
  }

  const finalName = playerName && playerName.trim() ? playerName.trim() : game.getRandomName();

  game.addPlayer(socket.id, finalName);

  debugLog("EMIT: game-state (after join)", { playerCount: game.players.size, finalName }, socket.id);
  // getGameState() returns unknown from abstract WordGame; cast needed since TypedSocket
  // is the union type and can't infer which game state is returned
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket.emit("game-state", game.getGameState() as any);

  debugLog("EMIT: join-confirmed", { finalName, roomCode: room.code }, socket.id);
  socket.emit("join-confirmed", { playerId: socket.id, playerName: finalName, roomCode: room.code });

  hooks?.onPlayerJoined?.(socket, finalName);

  debugLog("BROADCAST: player-joined", { finalName }, socket.id);
  socket.to(room.key).emit("player-joined", { playerId: socket.id, playerName: finalName });
  return true;
}

/** Handlers every game registers once the socket is in a room. Emits stay inside the room. */
export function setupSharedHandlers(
  io: TypedServer,
  socket: TypedSocket,
  room: Room,
  hooks?: SharedHandlerHooks
): void {
  const { game } = room;

  socket.on("toggle-client-side-validation", (enabled: boolean) => {
    debugLog("EVENT: toggle-client-side-validation", { enabled }, socket.id);
    game.setClientSideValidation(enabled);
    debugLog("EMIT: client-side-validation-changed", { enabled });
    io.to(room.key).emit("client-side-validation-changed", { enabled });
  });

  if (!hooks?.skipDisconnect) {
    socket.on("disconnect", () => {
      debugLog("EVENT: disconnect", null, socket.id);
      game.removePlayer(socket.id);
      socket.to(room.key).emit("player-left", socket.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see joinPlayer
      io.to(room.key).emit("game-state", game.getGameState() as any);
    });
  }
}
