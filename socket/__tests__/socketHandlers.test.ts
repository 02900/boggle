import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupSocketHandlers } from "../socketHandlers";

vi.mock("../../utils/debug", () => ({ debugLog: vi.fn() }));
vi.mock("../../utils/scoreboard", () => ({ loadScoreboard: vi.fn(() => []) }));

function createMockSocket(id: string, gameType = "boggle") {
  const handlers = new Map<string, Function>();
  return {
    id,
    handshake: { query: { game: gameType } },
    on: vi.fn((event: string, handler: Function) => {
      handlers.set(event, handler);
    }),
    emit: vi.fn(),
    broadcast: { emit: vi.fn() },
    disconnect: vi.fn(),
    _trigger: (event: string, ...args: any[]) => {
      const h = handlers.get(event);
      if (h) h(...args);
    },
  };
}

function createMockRegistry(game: any) {
  return {
    getGame: vi.fn((type: string) => (type === "boggle" ? game : undefined)),
    hasGame: vi.fn((type: string) => type === "boggle"),
    getGameTypes: vi.fn(() => ["boggle"]),
    registerGame: vi.fn(),
  };
}

function createMockIO() {
  let connectionHandler: Function | null = null;
  return {
    on: vi.fn((event: string, handler: Function) => {
      if (event === "connection") connectionHandler = handler;
    }),
    emit: vi.fn(),
    _simulateConnection: (socket: any) => {
      if (connectionHandler) connectionHandler(socket);
    },
  };
}

function createMockGame() {
  return {
    addPlayer: vi.fn(),
    removePlayer: vi.fn(),
    getGameState: vi.fn(() => ({
      board: [],
      players: [],
      gameState: "waiting",
      timeLeft: 188,
      diceRolls: [],
      rotationVersion: 0,
    })),
    getRandomName: vi.fn(() => "TestPlayer"),
    startGame: vi.fn(() => ({ success: true, diceRolls: [] })),
    submitWord: vi.fn((): { valid: boolean; points?: number; word?: string; reason?: string } => ({ valid: true, points: 1, word: "casa" })),
    resetGame: vi.fn(),
    rotateBoard: vi.fn((): { success: boolean; cooldownTime?: number; rotationVersion?: number; reason?: string } => ({
      success: true,
      cooldownTime: 30,
      rotationVersion: 1,
    })),
    findAllPossibleWords: vi.fn(() => ({
      words: [],
      maxScore: 0,
      totalWords: 0,
    })),
    setEliminateCommonWords: vi.fn(),
    setClientSideValidation: vi.fn(),
    getClientSideValidation: vi.fn(() => false),
    eliminateCommonWords: true,
    board: [
      ["A", "B", "C", "D"],
      ["E", "F", "G", "H"],
      ["I", "J", "K", "L"],
      ["M", "N", "O", "P"],
    ],
    players: new Map(),
  };
}

describe("setupSocketHandlers", () => {
  let io: ReturnType<typeof createMockIO>;
  let socket: ReturnType<typeof createMockSocket>;
  let game: ReturnType<typeof createMockGame>;
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    io = createMockIO();
    socket = createMockSocket("socket-1");
    game = createMockGame();
    registry = createMockRegistry(game);
    setupSocketHandlers(io as any, registry as any);
    io._simulateConnection(socket);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ── Setup ──────────────────────────────────────────────────────────

  describe("setup", () => {
    it("registers a 'connection' handler on io", () => {
      expect(io.on).toHaveBeenCalledWith("connection", expect.any(Function));
    });

    it("registers socket event handlers when a connection fires", () => {
      const expectedEvents = [
        "join-game",
        "start-game",
        "submit-word",
        "reset-game",
        "rotate-board",
        "get-scoreboard",
        "get-max-score",
        "toggle-eliminate-common-words",
        "toggle-client-side-validation",
        "disconnect",
      ];
      for (const event of expectedEvents) {
        expect(socket.on).toHaveBeenCalledWith(event, expect.any(Function));
      }
    });
  });

  // ── join-game ──────────────────────────────────────────────────────

  describe("join-game", () => {
    it("uses the provided player name when it is non-empty", () => {
      socket._trigger("join-game", "  Alice  ");

      expect(game.addPlayer).toHaveBeenCalledWith("socket-1", "Alice");
    });

    it("falls back to game.getRandomName() when name is empty", () => {
      socket._trigger("join-game", "");

      expect(game.getRandomName).toHaveBeenCalled();
      expect(game.addPlayer).toHaveBeenCalledWith("socket-1", "TestPlayer");
    });

    it("emits game-state, join-confirmed, and eliminate-common-words-changed to the socket", () => {
      socket._trigger("join-game", "Alice");

      expect(socket.emit).toHaveBeenCalledWith(
        "game-state",
        game.getGameState()
      );
      expect(socket.emit).toHaveBeenCalledWith("join-confirmed", {
        playerId: "socket-1",
        playerName: "Alice",
      });
      expect(socket.emit).toHaveBeenCalledWith(
        "eliminate-common-words-changed",
        {
          enabled: true,
          eliminateCommonWords: true,
        }
      );
    });

    it("broadcasts player-joined to other sockets", () => {
      socket._trigger("join-game", "Alice");

      expect(socket.broadcast.emit).toHaveBeenCalledWith("player-joined", {
        playerId: "socket-1",
        playerName: "Alice",
      });
    });
  });

  // ── start-game ─────────────────────────────────────────────────────

  describe("start-game", () => {
    it("calls game.startGame()", () => {
      socket._trigger("start-game");

      expect(game.startGame).toHaveBeenCalled();
    });

    it("emits dice-rolling to all clients on success", () => {
      socket._trigger("start-game");

      expect(io.emit).toHaveBeenCalledWith("dice-rolling", []);
    });

    it("emits game-started to all clients after 3 seconds", () => {
      vi.useFakeTimers();

      socket._trigger("start-game");

      expect(io.emit).not.toHaveBeenCalledWith(
        "game-started",
        expect.anything()
      );

      vi.advanceTimersByTime(3000);

      expect(io.emit).toHaveBeenCalledWith(
        "game-started",
        game.getGameState()
      );
    });
  });

  // ── submit-word ────────────────────────────────────────────────────

  describe("submit-word", () => {
    it("emits word-result error when rotationVersion is not a number", () => {
      socket._trigger("submit-word", {
        word: "casa",
        path: [[0, 0]],
        rotationVersion: undefined,
      });

      expect(socket.emit).toHaveBeenCalledWith("word-result", {
        valid: false,
        reason: "Error de sincronización del tablero",
      });
      expect(game.submitWord).not.toHaveBeenCalled();
    });

    it("emits word-result to socket when server validation mode is active", () => {
      game.getClientSideValidation.mockReturnValue(false);

      socket._trigger("submit-word", {
        word: "casa",
        path: [[0, 0]],
        rotationVersion: 0,
      });

      expect(socket.emit).toHaveBeenCalledWith("word-result", {
        valid: true,
        points: 1,
        word: "casa",
      });
    });

    it("broadcasts player-scored for a valid word", () => {
      socket._trigger("submit-word", {
        word: "casa",
        path: [[0, 0]],
        rotationVersion: 0,
      });

      expect(socket.broadcast.emit).toHaveBeenCalledWith("player-scored", {
        playerId: "socket-1",
        word: "casa",
        points: 1,
      });
    });

    it("emits game-state to all clients for a valid word", () => {
      socket._trigger("submit-word", {
        word: "casa",
        path: [[0, 0]],
        rotationVersion: 0,
      });

      expect(io.emit).toHaveBeenCalledWith("game-state", game.getGameState());
    });

    it("does NOT emit word-result when client-side validation is active", () => {
      game.getClientSideValidation.mockReturnValue(true);

      socket._trigger("submit-word", {
        word: "casa",
        path: [[0, 0]],
        rotationVersion: 0,
      });

      expect(socket.emit).not.toHaveBeenCalledWith(
        "word-result",
        expect.anything()
      );
    });

    it("does NOT broadcast player-scored for an invalid word", () => {
      game.submitWord.mockReturnValue({
        valid: false,
        reason: "Palabra no encontrada",
      });

      socket._trigger("submit-word", {
        word: "xyz",
        path: [[0, 0]],
        rotationVersion: 0,
      });

      expect(socket.broadcast.emit).not.toHaveBeenCalledWith(
        "player-scored",
        expect.anything()
      );
    });
  });

  // ── reset-game ─────────────────────────────────────────────────────

  describe("reset-game", () => {
    it("calls game.resetGame()", () => {
      socket._trigger("reset-game");

      expect(game.resetGame).toHaveBeenCalled();
    });

    it("emits game-reset with game state to all clients", () => {
      socket._trigger("reset-game");

      expect(io.emit).toHaveBeenCalledWith(
        "game-reset",
        game.getGameState()
      );
    });
  });

  // ── rotate-board ───────────────────────────────────────────────────

  describe("rotate-board", () => {
    it("emits board-rotated to all clients on success", () => {
      socket._trigger("rotate-board");

      expect(io.emit).toHaveBeenCalledWith("board-rotated", {
        board: game.board,
        cooldownTime: 30,
        rotationVersion: 1,
      });
    });

    it("emits rotation-error to socket only on failure", () => {
      game.rotateBoard.mockReturnValue({
        success: false,
        reason: "Cooldown activo",
      });

      socket._trigger("rotate-board");

      expect(socket.emit).toHaveBeenCalledWith("rotation-error", {
        message: "Cooldown activo",
      });
      expect(io.emit).not.toHaveBeenCalledWith(
        "board-rotated",
        expect.anything()
      );
    });
  });

  // ── get-scoreboard ─────────────────────────────────────────────────

  describe("get-scoreboard", () => {
    it("emits scoreboard-data to the requesting socket", () => {
      socket._trigger("get-scoreboard");

      expect(socket.emit).toHaveBeenCalledWith("scoreboard-data", []);
    });
  });

  // ── get-max-score ──────────────────────────────────────────────────

  describe("get-max-score", () => {
    it("emits max-score-data from findAllPossibleWords when board is valid", () => {
      socket._trigger("get-max-score");

      expect(game.findAllPossibleWords).toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith("max-score-data", {
        words: [],
        maxScore: 0,
        totalWords: 0,
      });
    });

    it("emits empty max-score-data when board is not valid", () => {
      game.board = [];

      socket._trigger("get-max-score");

      expect(game.findAllPossibleWords).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith("max-score-data", {
        words: [],
        maxScore: 0,
        totalWords: 0,
      });
    });
  });

  // ── toggle events ──────────────────────────────────────────────────

  describe("toggle events", () => {
    it("toggle-eliminate-common-words calls setter and emits to all", () => {
      socket._trigger("toggle-eliminate-common-words", true);

      expect(game.setEliminateCommonWords).toHaveBeenCalledWith(true);
      expect(io.emit).toHaveBeenCalledWith(
        "eliminate-common-words-changed",
        {
          enabled: true,
          eliminateCommonWords: game.eliminateCommonWords,
        }
      );
    });

    it("toggle-client-side-validation calls setter and emits to all", () => {
      socket._trigger("toggle-client-side-validation", true);

      expect(game.setClientSideValidation).toHaveBeenCalledWith(true);
      expect(io.emit).toHaveBeenCalledWith(
        "client-side-validation-changed",
        { enabled: true }
      );
    });
  });

  // ── disconnect ─────────────────────────────────────────────────────

  describe("disconnect", () => {
    it("calls game.removePlayer with the socket id", () => {
      socket._trigger("disconnect");

      expect(game.removePlayer).toHaveBeenCalledWith("socket-1");
    });

    it("broadcasts player-left to other sockets", () => {
      socket._trigger("disconnect");

      expect(socket.broadcast.emit).toHaveBeenCalledWith(
        "player-left",
        "socket-1"
      );
    });
  });

  // ── Game routing ─────────────────────────────────────────────────

  describe("game routing", () => {
    it("defaults to boggle when no game query param", () => {
      const noQuerySocket = createMockSocket("socket-2");
      delete (noQuerySocket.handshake.query as any).game;
      io._simulateConnection(noQuerySocket);

      noQuerySocket._trigger("join-game", "Alice");
      expect(game.addPlayer).toHaveBeenCalledWith("socket-2", "Alice");
    });

    it("routes to boggle when game=boggle", () => {
      const boggleSocket = createMockSocket("socket-3", "boggle");
      io._simulateConnection(boggleSocket);

      boggleSocket._trigger("join-game", "Bob");
      expect(game.addPlayer).toHaveBeenCalledWith("socket-3", "Bob");
    });

    it("disconnects socket for unknown game type", () => {
      const unknownSocket = createMockSocket("socket-4", "chess");
      io._simulateConnection(unknownSocket);

      expect(unknownSocket.disconnect).toHaveBeenCalled();
    });

    it("does not register handlers for unknown game type", () => {
      const unknownSocket = createMockSocket("socket-5", "chess");
      io._simulateConnection(unknownSocket);

      // join-game should not be registered since the socket was disconnected
      unknownSocket._trigger("join-game", "Test");
      expect(game.addPlayer).not.toHaveBeenCalledWith("socket-5", expect.anything());
    });
  });
});
