import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { joinPlayer, setupSharedHandlers } from "../sharedHandlers";
import {
  createMockSocket,
  createMockIO,
  createMockBoggleGame,
  mockRoom,
  type MockSocket,
  type MockIO,
  type MockBoggleGame,
} from "../../__tests__/mock-helpers";

vi.mock("../../../utils/debug", () => ({ debugLog: vi.fn() }));

const ROOM = "boggle:TEST";

describe("shared room handlers", () => {
  let io: MockIO;
  let socket: MockSocket;
  let game: MockBoggleGame;
  let room: ReturnType<typeof mockRoom<MockBoggleGame>>;

  beforeEach(() => {
    io = createMockIO();
    socket = createMockSocket("socket-1");
    game = createMockBoggleGame();
    room = mockRoom(game, "boggle");
  });

  afterEach(() => {
    // Rooms: nothing may ever be broadcast server-wide
    expect(io.emit).not.toHaveBeenCalled();
    expect(socket.broadcast.emit).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  describe("joinPlayer", () => {
    it("uses the provided name after trimming whitespace", () => {
      joinPlayer(socket as any, room as any, "  Alice  ");

      expect(game.addPlayer).toHaveBeenCalledWith("socket-1", "Alice");
      expect(game.getRandomName).not.toHaveBeenCalled();
    });

    it("falls back to getRandomName when name is empty", () => {
      joinPlayer(socket as any, room as any, "   ");

      expect(game.getRandomName).toHaveBeenCalled();
      expect(game.addPlayer).toHaveBeenCalledWith("socket-1", "TestPlayer");
    });

    it("sends the joiner the state and a confirmation with the room code", () => {
      expect(joinPlayer(socket as any, room as any, "Alice")).toBe(true);

      expect(socket.emit).toHaveBeenCalledWith(
        "game-state",
        expect.objectContaining({ players: [], gameState: "waiting" })
      );
      expect(socket.emit).toHaveBeenCalledWith("join-confirmed", {
        playerId: "socket-1",
        playerName: "Alice",
        roomCode: "TEST",
      });
    });

    it("announces the new player to the rest of the room only", () => {
      joinPlayer(socket as any, room as any, "Alice");

      expect(socket.to).toHaveBeenCalledWith(ROOM);
      expect(socket.to(ROOM).emit).toHaveBeenCalledWith("player-joined", {
        playerId: "socket-1",
        playerName: "Alice",
      });
    });

    it("calls onPlayerJoined hook when provided", () => {
      const onPlayerJoined = vi.fn();
      joinPlayer(socket as any, room as any, "Alice", { onPlayerJoined });

      expect(onPlayerJoined).toHaveBeenCalledWith(socket, "Alice");
    });

    it("rejects with join-failed and does not add the player when canJoin says no", () => {
      const canJoin = vi.fn(() => ({ ok: false, reason: "La partida ya empezó" }));

      expect(joinPlayer(socket as any, room as any, "Alice", { canJoin })).toBe(false);

      expect(socket.emit).toHaveBeenCalledWith("join-failed", { reason: "La partida ya empezó" });
      expect(game.addPlayer).not.toHaveBeenCalled();
      expect(socket.to).not.toHaveBeenCalled();
    });
  });

  describe("toggle-client-side-validation", () => {
    it("updates the game and tells the room", () => {
      setupSharedHandlers(io as any, socket as any, room as any);
      socket._trigger("toggle-client-side-validation", true);

      expect(game.setClientSideValidation).toHaveBeenCalledWith(true);
      expect(io.to(ROOM).emit).toHaveBeenCalledWith("client-side-validation-changed", { enabled: true });
    });
  });

  describe("disconnect", () => {
    it("removes the player and tells the rest of the room", () => {
      setupSharedHandlers(io as any, socket as any, room as any);
      socket._trigger("disconnect");

      expect(game.removePlayer).toHaveBeenCalledWith("socket-1");
      expect(socket.to(ROOM).emit).toHaveBeenCalledWith("player-left", "socket-1");
      expect(io.to(ROOM).emit).toHaveBeenCalledWith("game-state", expect.anything());
    });

    it("is left to the game when skipDisconnect is set (Scrabble's grace period)", () => {
      setupSharedHandlers(io as any, socket as any, room as any, { skipDisconnect: true });

      expect(socket.on).not.toHaveBeenCalledWith("disconnect", expect.anything());
    });
  });
});
