import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupSharedHandlers } from "../sharedHandlers";
import {
  createMockSocket,
  createMockIO,
  createMockBoggleGame,
  type MockSocket,
  type MockIO,
  type MockBoggleGame,
} from "../../__tests__/mock-helpers";

vi.mock("../../../utils/debug", () => ({ debugLog: vi.fn() }));
vi.mock("../../../utils/scoreboard", () => ({ loadScoreboard: vi.fn(() => []) }));

describe("setupSharedHandlers", () => {
  let io: MockIO;
  let socket: MockSocket;
  let game: MockBoggleGame;

  beforeEach(() => {
    io = createMockIO();
    socket = createMockSocket("socket-1");
    game = createMockBoggleGame();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("join-game", () => {
    it("uses the provided name after trimming whitespace", () => {
      setupSharedHandlers(io as any, socket as any, game as any);
      socket._trigger("join-game", "  Alice  ");

      expect(game.addPlayer).toHaveBeenCalledWith("socket-1", "Alice");
      expect(game.getRandomName).not.toHaveBeenCalled();
    });

    it("falls back to getRandomName when name is empty", () => {
      setupSharedHandlers(io as any, socket as any, game as any);
      socket._trigger("join-game", "   ");

      expect(game.getRandomName).toHaveBeenCalled();
      expect(game.addPlayer).toHaveBeenCalledWith("socket-1", "TestPlayer");
    });

    it("emits game-state and join-confirmed to the socket", () => {
      setupSharedHandlers(io as any, socket as any, game as any);
      socket._trigger("join-game", "Alice");

      expect(socket.emit).toHaveBeenCalledWith(
        "game-state",
        expect.objectContaining({ players: [], gameState: "waiting" })
      );
      expect(socket.emit).toHaveBeenCalledWith("join-confirmed", {
        playerId: "socket-1",
        playerName: "Alice",
      });
    });

    it("broadcasts player-joined to other clients", () => {
      setupSharedHandlers(io as any, socket as any, game as any);
      socket._trigger("join-game", "Alice");

      expect(socket.broadcast.emit).toHaveBeenCalledWith("player-joined", {
        playerId: "socket-1",
        playerName: "Alice",
      });
    });

    it("calls onPlayerJoined hook when provided", () => {
      const onPlayerJoined = vi.fn();
      setupSharedHandlers(io as any, socket as any, game as any, { onPlayerJoined });
      socket._trigger("join-game", "Alice");

      expect(onPlayerJoined).toHaveBeenCalledWith(socket, "Alice");
    });

    it("works without hooks (no crash)", () => {
      setupSharedHandlers(io as any, socket as any, game as any);

      expect(() => {
        socket._trigger("join-game", "Alice");
      }).not.toThrow();
    });
  });

  describe("get-scoreboard", () => {
    it("emits scoreboard-data to the socket", async () => {
      setupSharedHandlers(io as any, socket as any, game as any);
      socket._trigger("get-scoreboard");

      // loadScoreboard may be async, allow microtasks to flush
      await vi.dynamicImportSettled?.() ?? Promise.resolve();

      expect(socket.emit).toHaveBeenCalledWith("scoreboard-data", expect.anything());
    });
  });

  describe("toggle-client-side-validation", () => {
    it("calls setClientSideValidation and emits to all clients", () => {
      setupSharedHandlers(io as any, socket as any, game as any);
      socket._trigger("toggle-client-side-validation", true);

      expect(game.setClientSideValidation).toHaveBeenCalledWith(true);
      expect(io.emit).toHaveBeenCalledWith(
        "client-side-validation-changed",
        expect.anything()
      );
    });
  });

  describe("disconnect", () => {
    it("calls removePlayer and broadcasts player-left", () => {
      setupSharedHandlers(io as any, socket as any, game as any);
      socket._trigger("disconnect");

      expect(game.removePlayer).toHaveBeenCalledWith("socket-1");
      expect(socket.broadcast.emit).toHaveBeenCalledWith(
        "player-left",
        "socket-1"
      );
    });
  });
});
