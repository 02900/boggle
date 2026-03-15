import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupSharedHandlers } from "../sharedHandlers";

vi.mock("../../../utils/debug", () => ({ debugLog: vi.fn() }));
vi.mock("../../../utils/scoreboard", () => ({ loadScoreboard: vi.fn(() => []) }));

function createMockSocket(id: string) {
  const handlers = new Map<string, Function>();
  return {
    id,
    on: vi.fn((event: string, handler: Function) => {
      handlers.set(event, handler);
    }),
    emit: vi.fn(),
    broadcast: { emit: vi.fn() },
    _trigger: (event: string, ...args: any[]) => {
      const h = handlers.get(event);
      if (h) h(...args);
    },
  };
}

function createMockIO() {
  return { on: vi.fn(), emit: vi.fn() };
}

function createMockGame() {
  return {
    addPlayer: vi.fn(),
    removePlayer: vi.fn(),
    getGameState: vi.fn(() => ({
      players: [],
      gameState: "waiting",
      timeLeft: 100,
    })),
    getRandomName: vi.fn(() => "RandomName"),
    setClientSideValidation: vi.fn(),
    getClientSideValidation: vi.fn(() => false),
    players: new Map(),
  };
}

describe("setupSharedHandlers", () => {
  let io: ReturnType<typeof createMockIO>;
  let socket: ReturnType<typeof createMockSocket>;
  let game: ReturnType<typeof createMockGame>;

  beforeEach(() => {
    io = createMockIO();
    socket = createMockSocket("socket-1");
    game = createMockGame();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("join-game", () => {
    it("uses the provided name after trimming whitespace", () => {
      setupSharedHandlers(io, socket, game);
      socket._trigger("join-game", "  Alice  ");

      expect(game.addPlayer).toHaveBeenCalledWith("socket-1", "Alice");
      expect(game.getRandomName).not.toHaveBeenCalled();
    });

    it("falls back to getRandomName when name is empty", () => {
      setupSharedHandlers(io, socket, game);
      socket._trigger("join-game", "   ");

      expect(game.getRandomName).toHaveBeenCalled();
      expect(game.addPlayer).toHaveBeenCalledWith("socket-1", "RandomName");
    });

    it("emits game-state and join-confirmed to the socket", () => {
      setupSharedHandlers(io, socket, game);
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
      setupSharedHandlers(io, socket, game);
      socket._trigger("join-game", "Alice");

      expect(socket.broadcast.emit).toHaveBeenCalledWith("player-joined", {
        playerId: "socket-1",
        playerName: "Alice",
      });
    });

    it("calls onPlayerJoined hook when provided", () => {
      const onPlayerJoined = vi.fn();
      setupSharedHandlers(io, socket, game, { onPlayerJoined });
      socket._trigger("join-game", "Alice");

      expect(onPlayerJoined).toHaveBeenCalledWith(socket, "Alice");
    });

    it("works without hooks (no crash)", () => {
      setupSharedHandlers(io, socket, game);

      expect(() => {
        socket._trigger("join-game", "Alice");
      }).not.toThrow();
    });
  });

  describe("get-scoreboard", () => {
    it("emits scoreboard-data to the socket", async () => {
      setupSharedHandlers(io, socket, game);
      socket._trigger("get-scoreboard");

      // loadScoreboard may be async, allow microtasks to flush
      await vi.dynamicImportSettled?.() ?? Promise.resolve();

      expect(socket.emit).toHaveBeenCalledWith("scoreboard-data", expect.anything());
    });
  });

  describe("toggle-client-side-validation", () => {
    it("calls setClientSideValidation and emits to all clients", () => {
      setupSharedHandlers(io, socket, game);
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
      setupSharedHandlers(io, socket, game);
      socket._trigger("disconnect");

      expect(game.removePlayer).toHaveBeenCalledWith("socket-1");
      expect(socket.broadcast.emit).toHaveBeenCalledWith(
        "player-left",
        "socket-1"
      );
    });
  });
});
