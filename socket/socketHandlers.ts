import { debugLog } from "../utils/debug";
import { loadScoreboard } from "../utils/scoreboard";
import { joinPlayer, setupSharedHandlers, type SharedHandlerHooks } from "./shared/sharedHandlers";
import { setupBoggleHandlers } from "./boggle/boggleHandlers";
import { rejoinScrabble, setupScrabbleHandlers } from "./scrabble/scrabbleHandlers";
import { lobbyKey, normalizeRoomCode, type Room, type RoomManager } from "../game/rooms/RoomManager";
import type { GameType } from "../config/constants";
import type { BoggleGame } from "../game/boggle/BoggleGame";
import type { ScrabbleGame } from "../game/scrabble/ScrabbleGame";
import type {
  TypedServer,
  TypedSocket,
  BoggleTypedServer,
  BoggleTypedSocket,
  ScrabbleTypedServer,
  ScrabbleTypedSocket,
} from "../src/interfaces/server";

const GAME_TYPES: readonly GameType[] = ["boggle", "scrabble"];
const MAX_NAME_LENGTH = 20;

const isGameType = (value: string): value is GameType => (GAME_TYPES as readonly string[]).includes(value);
const cleanName = (name: unknown) => (typeof name === "string" ? name.trim().slice(0, MAX_NAME_LENGTH) : "");

function hooksFor(io: TypedServer, gameType: GameType, room: Room): SharedHandlerHooks {
  if (gameType === "scrabble") {
    const game = room.game as ScrabbleGame;
    return { skipDisconnect: true, canJoin: () => game.canJoin() };
  }
  const game = room.game as BoggleGame;
  return {
    onPlayerJoined: (s) => {
      debugLog("EMIT: eliminate-common-words-changed (initial sync)", { enabled: game.eliminateCommonWords }, s.id);
      s.emit("eliminate-common-words-changed", {
        enabled: game.eliminateCommonWords,
        eliminateCommonWords: game.eliminateCommonWords,
      });
      // Boggle's client only shows a message on player-joined: send the room the new player list
      (io as unknown as BoggleTypedServer).to(room.key).emit("game-state", game.getGameState());
    },
  };
}

/**
 * A socket connects for one game type (`?game=boggle|scrabble`) and starts in that
 * game's lobby: it can list, create and join rooms. Once in a room, the game's own
 * handlers are registered and every broadcast stays inside the room. One room per
 * socket: switching rooms means a new connection.
 */
export function setupSocketHandlers(io: TypedServer, rooms: RoomManager): void {
  io.on("connection", (socket: TypedSocket) => {
    const raw = socket.handshake.query.game;
    const requested = (Array.isArray(raw) ? raw[0] : raw) || "boggle";
    debugLog("EVENT: connection", { gameType: requested }, socket.id);

    if (!isGameType(requested)) {
      debugLog("ERROR: unknown game type", { gameType: requested }, socket.id);
      socket.disconnect();
      return;
    }
    const gameType = requested;
    let current: Room | null = null;

    const enterRoom = (room: Room): SharedHandlerHooks => {
      current = room;
      socket.leave(lobbyKey(gameType));
      socket.join(room.key);
      const hooks = hooksFor(io, gameType, room);
      setupSharedHandlers(io, socket, room, hooks);
      if (gameType === "boggle") {
        setupBoggleHandlers(io as unknown as BoggleTypedServer, socket as unknown as BoggleTypedSocket, room);
      } else {
        setupScrabbleHandlers(io as unknown as ScrabbleTypedServer, socket as unknown as ScrabbleTypedSocket, room);
      }
      return hooks;
    };

    socket.on("get-scoreboard", () => {
      // Each game has its own leaderboard, shared by all its rooms
      const scoreboard = loadScoreboard(gameType);
      debugLog("EMIT: scoreboard-data", { gameType, count: scoreboard.length }, socket.id);
      socket.emit("scoreboard-data", scoreboard);
    });

    socket.on("list-rooms", () => {
      if (current) return;
      socket.join(lobbyKey(gameType));
      socket.emit("rooms-list", rooms.listRooms(gameType));
    });

    const rejectIfInRoom = (): boolean => {
      if (current) socket.emit("join-failed", { reason: "Ya estás en una sala" });
      return current !== null;
    };

    socket.on("create-room", (data) => {
      if (rejectIfInRoom()) return;
      const playerName = cleanName(data?.playerName);
      const room = rooms.createRoom(gameType, playerName || "Anónimo");
      debugLog("EVENT: create-room", { gameType, code: room.code, playerName }, socket.id);
      joinPlayer(socket, room, playerName, enterRoom(room));
    });

    socket.on("join-room", (data) => {
      if (rejectIfInRoom()) return;
      const code = normalizeRoomCode(data?.code);
      const room = code ? rooms.getRoom(gameType, code) : undefined;
      debugLog("EVENT: join-room", { gameType, code, found: !!room }, socket.id);
      if (!room) {
        socket.emit("join-failed", { reason: "La sala no existe" });
        return;
      }
      // Check before entering, so a rejected socket stays in the lobby
      const admission = hooksFor(io, gameType, room).canJoin?.();
      if (admission && !admission.ok) {
        socket.emit("join-failed", { reason: admission.reason ?? "No puedes unirte a esta sala" });
        return;
      }
      joinPlayer(socket, room, cleanName(data?.playerName), enterRoom(room));
    });

    if (gameType === "scrabble") {
      // Comes back to a saved seat (reload, network drop, server restart) by room code
      socket.on("rejoin-game", (data) => {
        if (current) return;
        const code = normalizeRoomCode(data?.gameId);
        const room = code ? rooms.restoreScrabbleRoom(code) : undefined;
        if (!code || !room) {
          socket.emit("rejoin-failed", { reason: "Sesión no encontrada" });
          return;
        }
        const s = socket as unknown as ScrabbleTypedSocket;
        if (rejoinScrabble(io as unknown as ScrabbleTypedServer, s, room, { playerName: data.playerName, gameId: code })) {
          enterRoom(room);
        }
      });
    }
  });
}
