import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  RoomManager,
  ROOM_IDLE_TTL_MS,
  normalizeRoomCode,
  roomKey,
} from "../RoomManager";
import { loadSession } from "../../scrabble/gameSessionStore";
import { createMockIO, type FakeRoomGame, type MockIO } from "../../../socket/__tests__/mock-helpers";

vi.mock("../../../utils/debug", () => ({ debugLog: vi.fn() }));
vi.mock("../../scrabble/gameSessionStore", () => ({ loadSession: vi.fn(() => null) }));
vi.mock("../../boggle/BoggleGame", async () => {
  const { createFakeRoomGame } = await import("../../../socket/__tests__/mock-helpers");
  return { BoggleGame: vi.fn(function () { return createFakeRoomGame("boggle"); }) };
});
vi.mock("../../scrabble/ScrabbleGame", async () => {
  const { createFakeRoomGame } = await import("../../../socket/__tests__/mock-helpers");
  return { ScrabbleGame: vi.fn(function () { return createFakeRoomGame("scrabble"); }) };
});

const fake = (game: unknown) => game as FakeRoomGame;

describe("RoomManager", () => {
  let io: MockIO;
  let rooms: RoomManager;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(loadSession).mockReset().mockReturnValue(null);
    io = createMockIO();
    rooms = new RoomManager(io as any);
  });

  afterEach(() => {
    rooms.dispose();
    vi.useRealTimers();
  });

  it("creates a game per room whose emits are scoped to the room", () => {
    const room = rooms.createRoom("scrabble", "Ana");

    expect(room.key).toBe(roomKey("scrabble", room.code));
    expect(fake(room.game).setIO).toHaveBeenCalledWith(io.to(room.key));
    expect(rooms.getRoom("scrabble", room.code)).toBe(room);
    expect(rooms.getRoom("boggle", room.code)).toBeUndefined();
  });

  it("generates unambiguous 4-character codes, unique among live rooms", () => {
    // Random always lands on the same code first: the second room must get another
    const values = [0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5];
    rooms = new RoomManager(io as any, () => values.shift() ?? 0.9);

    const a = rooms.createRoom("boggle", "Ana");
    const b = rooms.createRoom("boggle", "Bob");

    expect(a.code).toBe("AAAA");
    expect(b.code).not.toBe("AAAA");
    expect(b.code).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
  });

  it("never hands out a code that still has a saved Scrabble game", () => {
    const values = [0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5];
    rooms = new RoomManager(io as any, () => values.shift() ?? 0.9);
    vi.mocked(loadSession).mockImplementation((code) => (code === "AAAA" ? ({} as any) : null));

    expect(rooms.createRoom("scrabble", "Ana").code).not.toBe("AAAA");
  });

  it("lists rooms of one game, newest first, with what the lobby shows", () => {
    const first = rooms.createRoom("scrabble", "Ana");
    vi.advanceTimersByTime(1000);
    const second = rooms.createRoom("scrabble", "Bob");
    rooms.createRoom("boggle", "Caro");
    fake(first.game).addPlayer("a", "Ana");
    fake(first.game).canJoin.mockReturnValue({ ok: false, reason: "llena" });

    expect(rooms.listRooms("scrabble")).toEqual([
      { code: second.code, hostName: "Bob", playerCount: 0, maxPlayers: 4, status: "waiting", joinable: true },
      { code: first.code, hostName: "Ana", playerCount: 1, maxPlayers: 4, status: "waiting", joinable: false },
    ]);
    expect(rooms.listRooms("boggle")[0]).toMatchObject({ hostName: "Caro", maxPlayers: null });
  });

  it("pushes the updated list to the game's lobby when a room changes", () => {
    const room = rooms.createRoom("boggle", "Ana");
    const lobby = io.to("boggle:lobby").emit;
    lobby.mockClear();

    fake(room.game).addPlayer("a", "Ana");

    expect(lobby).toHaveBeenCalledWith("rooms-updated", [expect.objectContaining({ code: room.code, playerCount: 1 })]);
    expect(io.to("scrabble:lobby").emit).not.toHaveBeenCalled();
  });

  describe("empty rooms", () => {
    it("are deleted after the idle TTL", () => {
      const room = rooms.createRoom("boggle", "Ana");
      fake(room.game).addPlayer("a", "Ana");
      fake(room.game).removePlayer("a");

      vi.advanceTimersByTime(ROOM_IDLE_TTL_MS - 1);
      expect(rooms.getRoom("boggle", room.code)).toBe(room);
      vi.advanceTimersByTime(1);

      expect(rooms.getRoom("boggle", room.code)).toBeUndefined();
      expect(fake(room.game).clearTimers).toHaveBeenCalled();
      expect(io.to("boggle:lobby").emit).toHaveBeenLastCalledWith("rooms-updated", []);
    });

    it("survive if someone comes back in time", () => {
      const room = rooms.createRoom("boggle", "Ana");
      vi.advanceTimersByTime(ROOM_IDLE_TTL_MS - 1000);
      fake(room.game).addPlayer("a", "Ana");

      vi.advanceTimersByTime(ROOM_IDLE_TTL_MS * 2);

      expect(rooms.getRoom("boggle", room.code)).toBe(room);
    });

    it("count only connected players (Scrabble keeps disconnected ones during the grace period)", () => {
      const room = rooms.createRoom("scrabble", "Ana");
      fake(room.game).addPlayer("a", "Ana");
      fake(room.game).players.get("a")!.isConnected = false;
      fake(room.game).notifyStatusChange();

      vi.advanceTimersByTime(ROOM_IDLE_TTL_MS);

      expect(rooms.getRoom("scrabble", room.code)).toBeUndefined();
    });
  });

  describe("restoreScrabbleRoom", () => {
    it("recreates a room from a saved game with the same code", () => {
      vi.mocked(loadSession).mockReturnValue({ gameState: "playing", players: [{ name: "Ana" }] } as any);

      const room = rooms.restoreScrabbleRoom("K7QF")!;

      expect(room.code).toBe("K7QF");
      expect(room.hostName).toBe("Ana");
      expect(rooms.getRoom("scrabble", "K7QF")).toBe(room);
    });

    it("returns the live room if it exists, and nothing for unknown or finished games", () => {
      const live = rooms.createRoom("scrabble", "Ana");
      expect(rooms.restoreScrabbleRoom(live.code)).toBe(live);

      expect(rooms.restoreScrabbleRoom("ZZZZ")).toBeUndefined();
      vi.mocked(loadSession).mockReturnValue({ gameState: "finished", players: [] } as any);
      expect(rooms.restoreScrabbleRoom("YYYY")).toBeUndefined();
    });
  });
});

describe("normalizeRoomCode", () => {
  it("accepts codes in any case with spaces around, rejects anything else", () => {
    expect(normalizeRoomCode(" k7qf ")).toBe("K7QF");
    expect(normalizeRoomCode("K7Q")).toBeNull();
    expect(normalizeRoomCode("K0QF")).toBeNull(); // 0 isn't in the alphabet
    expect(normalizeRoomCode("default-scrabble")).toBeNull();
    expect(normalizeRoomCode(42)).toBeNull();
  });
});
