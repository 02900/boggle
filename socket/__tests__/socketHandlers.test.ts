import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupSocketHandlers } from "../socketHandlers";
import { RoomManager } from "../../game/rooms/RoomManager";
import { rejoinScrabble } from "../scrabble/scrabbleHandlers";
import { loadScoreboard } from "../../utils/scoreboard";
import { loadSession } from "../../game/scrabble/gameSessionStore";
import { createMockSocket, createMockIO, type FakeRoomGame, type MockIO, type MockSocket } from "./mock-helpers";

vi.mock("../../utils/debug", () => ({ debugLog: vi.fn() }));
vi.mock("../../utils/scoreboard", () => ({ loadScoreboard: vi.fn(() => []) }));
vi.mock("../../game/scrabble/gameSessionStore", () => ({
  loadSession: vi.fn(() => null),
  saveSession: vi.fn(),
  deleteSession: vi.fn(),
}));
// Real rooms and handlers, light fake games
vi.mock("../../game/boggle/BoggleGame", async () => {
  const { createFakeRoomGame } = await import("./mock-helpers");
  return { BoggleGame: vi.fn(function () { return createFakeRoomGame("boggle"); }) };
});
vi.mock("../../game/scrabble/ScrabbleGame", async () => {
  const { createFakeRoomGame } = await import("./mock-helpers");
  return { ScrabbleGame: vi.fn(function () { return createFakeRoomGame("scrabble"); }) };
});
vi.mock("../scrabble/scrabbleHandlers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../scrabble/scrabbleHandlers")>()),
  rejoinScrabble: vi.fn(() => true),
}));

const lastCall = (socket: MockSocket, event: string) =>
  socket.emit.mock.calls.filter((c: unknown[]) => c[0] === event).at(-1)?.[1];

describe("setupSocketHandlers (lobby and rooms)", () => {
  let io: MockIO;
  let rooms: RoomManager;
  let sockets: MockSocket[];

  const connect = (id: string, game: string = "boggle") => {
    const socket = createMockSocket(id, game);
    io._simulateConnection(socket);
    sockets.push(socket);
    return socket;
  };

  /** Creates a room from a fresh socket and returns its code. */
  const createRoom = (game: "boggle" | "scrabble", name = "Ana", id = `host-${sockets.length}`) => {
    const host = connect(id, game);
    host._trigger("create-room", { playerName: name });
    return { host, code: lastCall(host, "join-confirmed").roomCode as string };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    io = createMockIO();
    rooms = new RoomManager(io as any);
    sockets = [];
    setupSocketHandlers(io as any, rooms);
  });

  afterEach(() => {
    // Rooms: nothing may ever be broadcast server-wide
    expect(io.emit).not.toHaveBeenCalled();
    for (const s of sockets) expect(s.broadcast.emit).not.toHaveBeenCalled();
    rooms.dispose();
  });

  it("disconnects sockets for unknown game types", () => {
    const socket = connect("x", "chess");
    expect(socket.disconnect).toHaveBeenCalled();
    expect(socket.on).not.toHaveBeenCalled();
  });

  it("list-rooms subscribes to the game's lobby and answers with its rooms", () => {
    createRoom("scrabble", "Ana");
    const socket = connect("viewer", "boggle");

    socket._trigger("list-rooms");

    expect(socket.join).toHaveBeenCalledWith("boggle:lobby");
    expect(lastCall(socket, "rooms-list")).toEqual([]); // Scrabble rooms aren't listed for Boggle
  });

  it("create-room makes a room, puts the creator in it and updates the lobby", () => {
    const viewer = connect("viewer");
    viewer._trigger("list-rooms");

    const { host, code } = createRoom("boggle", "Ana");

    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
    expect(host.join).toHaveBeenCalledWith(`boggle:${code}`);
    expect(lastCall(host, "join-confirmed")).toEqual({ playerId: host.id, playerName: "Ana", roomCode: code });
    const updates = io.to("boggle:lobby").emit.mock.calls.filter((c: unknown[]) => c[0] === "rooms-updated");
    expect(updates.at(-1)?.[1]).toEqual([
      expect.objectContaining({ code, hostName: "Ana", playerCount: 1, status: "waiting", joinable: true }),
    ]);
  });

  it("join-room puts a second player in the same room (code is case-insensitive)", () => {
    const { code } = createRoom("boggle");
    const guest = connect("guest");

    guest._trigger("join-room", { code: code.toLowerCase(), playerName: "Bob" });

    expect(guest.join).toHaveBeenCalledWith(`boggle:${code}`);
    expect(guest.leave).toHaveBeenCalledWith("boggle:lobby");
    expect(lastCall(guest, "join-confirmed")).toMatchObject({ playerName: "Bob", roomCode: code });
    const game = rooms.getRoom("boggle", code)!.game as unknown as FakeRoomGame;
    expect([...game.players.values()].map((p) => p.name)).toEqual(["Ana", "Bob"]);
    // Game handlers are registered only now
    expect(guest.on).toHaveBeenCalledWith("start-game", expect.any(Function));
  });

  it("join-room with an unknown code fails and leaves the socket in the lobby", () => {
    const socket = connect("lost");

    socket._trigger("join-room", { code: "ZZZZ", playerName: "Bob" });

    expect(lastCall(socket, "join-failed")).toEqual({ reason: "La sala no existe" });
    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.on).not.toHaveBeenCalledWith("start-game", expect.anything());
  });

  it("a Scrabble room that can't take players rejects before the socket enters it", () => {
    const { code } = createRoom("scrabble");
    const game = rooms.getRoom("scrabble", code)!.game as unknown as FakeRoomGame;
    game.canJoin.mockReturnValue({ ok: false, reason: "La partida ya empezó" });
    const late = connect("late", "scrabble");

    late._trigger("join-room", { code, playerName: "Carol" });

    expect(lastCall(late, "join-failed")).toEqual({ reason: "La partida ya empezó" });
    expect(late.join).not.toHaveBeenCalled();
    expect(game.addPlayer).toHaveBeenCalledTimes(1); // only the host
  });

  it("a socket can only be in one room", () => {
    const { host } = createRoom("boggle");
    const other = createRoom("boggle", "Bob");

    host._trigger("join-room", { code: other.code, playerName: "Ana" });

    expect(lastCall(host, "join-failed")).toEqual({ reason: "Ya estás en una sala" });
  });

  it("rooms are isolated: one room's broadcasts never reach another", () => {
    vi.useFakeTimers();
    const a = createRoom("boggle", "Ana");
    const b = createRoom("boggle", "Bob");
    io.to(`boggle:${b.code}`).emit.mockClear();

    a.host._trigger("start-game");
    vi.advanceTimersByTime(3000);

    expect(io.to(`boggle:${a.code}`).emit).toHaveBeenCalledWith("dice-rolling", expect.anything());
    expect(io.to(`boggle:${b.code}`).emit).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("get-scoreboard works from the lobby and uses the socket's game", () => {
    const socket = connect("viewer", "scrabble");

    socket._trigger("get-scoreboard");

    expect(loadScoreboard).toHaveBeenCalledWith("scrabble");
    expect(socket.emit).toHaveBeenCalledWith("scoreboard-data", []);
  });

  describe("Scrabble rejoin by room code", () => {
    it("restores a room that only exists on disk and enters it on success", () => {
      // Only the restore lookup finds a saved game for this code
      vi.mocked(loadSession).mockImplementation((code) =>
        code === "K7QF" ? ({ gameState: "playing", players: [{ name: "Ana" }] } as any) : null
      );
      const socket = connect("back", "scrabble");

      socket._trigger("rejoin-game", { playerName: "Ana", gameId: "k7qf" });

      expect(rooms.getRoom("scrabble", "K7QF")).toBeDefined();
      expect(rejoinScrabble).toHaveBeenCalledWith(io, socket, expect.objectContaining({ code: "K7QF" }), {
        playerName: "Ana",
        gameId: "K7QF",
      });
      expect(socket.join).toHaveBeenCalledWith("scrabble:K7QF");
    });

    it("fails for codes with no room and no saved game", () => {
      const socket = connect("back", "scrabble");

      socket._trigger("rejoin-game", { playerName: "Ana", gameId: "default-scrabble" });

      expect(socket.emit).toHaveBeenCalledWith("rejoin-failed", { reason: "Sesión no encontrada" });
      expect(socket.join).not.toHaveBeenCalled();
    });

    it("stays in the lobby when the rejoin itself is refused", () => {
      const { code } = createRoom("scrabble");
      vi.mocked(rejoinScrabble).mockReturnValueOnce(false);
      const socket = connect("stranger", "scrabble");

      socket._trigger("rejoin-game", { playerName: "Zoe", gameId: code });

      expect(socket.join).not.toHaveBeenCalled();
    });
  });
});
