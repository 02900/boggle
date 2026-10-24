import { BoggleGame } from "../boggle/BoggleGame";
import { ScrabbleGame } from "../scrabble/ScrabbleGame";
import { loadSession } from "../scrabble/gameSessionStore";
import { SCRABBLE_MAX_PLAYERS } from "../../config/scrabbleConstants";
import { debugLog } from "../../utils/debug";
import type { GameType } from "../../config/constants";
import type { WordGame, GameIO } from "../shared/WordGame";
import type { RoomSummary } from "../../src/interfaces/game";

/** Letters and digits that can't be confused when read aloud or typed (no 0/O, 1/I). */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 4;
/** An empty room (nobody connected) is deleted this long after it empties. */
export const ROOM_IDLE_TTL_MS = Number(process.env.ROOM_IDLE_TTL_MS) || 10 * 60 * 1000;

export interface Room {
  code: string;
  gameType: GameType;
  /** Socket.IO room name: everything the room's game emits goes only here */
  key: string;
  game: WordGame;
  hostName: string;
  createdAt: number;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
}

/** The minimal server surface rooms need: scoped broadcasting. */
export interface RoomsIO {
  to(room: string): GameIO;
}

const GAME_FACTORIES: Record<GameType, () => WordGame> = {
  boggle: () => new BoggleGame(),
  scrabble: () => new ScrabbleGame(),
};

export const roomKey = (gameType: GameType, code: string) => `${gameType}:${code}`;
export const lobbyKey = (gameType: GameType) => `${gameType}:lobby`;

/** Normalizes user input ("k7qf ") to a room code, or null if it can't be one. */
export function normalizeRoomCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.trim().toUpperCase();
  if (code.length !== ROOM_CODE_LENGTH) return null;
  return [...code].every((ch) => ROOM_CODE_ALPHABET.includes(ch)) ? code : null;
}

/**
 * All live game rooms. Each room owns one game instance whose emits are scoped to
 * the room, so any number of Boggle and Scrabble games can run at the same time.
 */
export class RoomManager {
  private rooms = new Map<string, Room>();

  constructor(
    private io: RoomsIO,
    private random: () => number = Math.random
  ) {}

  createRoom(gameType: GameType, hostName: string, code: string = this.newCode(gameType)): Room {
    const game = GAME_FACTORIES[gameType]();
    const room: Room = {
      code,
      gameType,
      key: roomKey(gameType, code),
      game,
      hostName,
      createdAt: Date.now(),
      cleanupTimer: null,
    };
    game.setIO(this.io.to(room.key));
    game.onStatusChange = () => this.roomChanged(room);
    this.rooms.set(room.key, room);

    debugLog("ROOM_CREATED", { gameType, code, hostName });
    // Born empty: if the creator never actually joins, it still gets cleaned up
    this.roomChanged(room);
    return room;
  }

  getRoom(gameType: GameType, code: string): Room | undefined {
    return this.rooms.get(roomKey(gameType, code));
  }

  /**
   * A Scrabble room that only exists on disk (the server restarted mid-game): it's
   * recreated empty with the same code, and the rejoin restores the saved game into it.
   */
  restoreScrabbleRoom(code: string): Room | undefined {
    const existing = this.getRoom("scrabble", code);
    if (existing) return existing;
    const session = loadSession(code);
    if (!session || session.gameState === "finished") return undefined;
    return this.createRoom("scrabble", session.players[0]?.name ?? "?", code);
  }

  listRooms(gameType: GameType): RoomSummary[] {
    return [...this.rooms.values()]
      .filter((room) => room.gameType === gameType)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((room) => this.summarize(room));
  }

  deleteRoom(room: Room): void {
    if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
    room.game.onStatusChange = null;
    room.game.clearTimers();
    this.rooms.delete(room.key);
    debugLog("ROOM_DELETED", { gameType: room.gameType, code: room.code });
    this.notifyLobby(room.gameType);
  }

  /** Players, connection or status changed: refresh the lobby and the empty-room timer. */
  roomChanged(room: Room): void {
    if (!this.rooms.has(room.key)) return;

    const empty = connectedPlayers(room.game) === 0;
    if (empty && !room.cleanupTimer) {
      room.cleanupTimer = setTimeout(() => this.deleteRoom(room), ROOM_IDLE_TTL_MS);
    } else if (!empty && room.cleanupTimer) {
      clearTimeout(room.cleanupTimer);
      room.cleanupTimer = null;
    }

    this.notifyLobby(room.gameType);
  }

  notifyLobby(gameType: GameType): void {
    this.io.to(lobbyKey(gameType)).emit("rooms-updated", this.listRooms(gameType));
  }

  /** Stops every timer; for tests and shutdown. */
  dispose(): void {
    for (const room of [...this.rooms.values()]) this.deleteRoom(room);
  }

  private summarize(room: Room): RoomSummary {
    const { game } = room;
    const maxPlayers = room.gameType === "scrabble" ? SCRABBLE_MAX_PLAYERS : null;
    const joinable =
      room.gameType === "scrabble" ? (game as ScrabbleGame).canJoin().ok : true;
    return {
      code: room.code,
      hostName: room.hostName,
      playerCount: connectedPlayers(game),
      maxPlayers,
      status: game.gameState,
      joinable,
    };
  }

  private newCode(gameType: GameType): string {
    // 32^4 ≈ 1M codes: collisions are rare, but never loop forever
    for (let attempt = 0; attempt < 1000; attempt++) {
      let code = "";
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_CODE_ALPHABET[Math.floor(this.random() * ROOM_CODE_ALPHABET.length)];
      }
      if (this.rooms.has(roomKey(gameType, code))) continue;
      // A saved Scrabble game keeps its code reserved, so an old link/session can't
      // load it into someone else's new room
      if (gameType === "scrabble" && loadSession(code)) continue;
      return code;
    }
    throw new Error("No hay códigos de sala disponibles");
  }
}

/** Players who are actually here (Scrabble keeps disconnected players during the grace period). */
function connectedPlayers(game: WordGame): number {
  let count = 0;
  for (const player of game.players.values()) if (player.isConnected !== false) count++;
  return count;
}
