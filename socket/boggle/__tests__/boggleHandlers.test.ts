import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupBoggleHandlers } from "../boggleHandlers";

vi.mock("../../../utils/debug", () => ({ debugLog: vi.fn() }));

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
    startGame: vi.fn(() => ({ success: true, diceRolls: [] })),
    submitWord: vi.fn(
      (): {
        valid: boolean;
        points?: number;
        word?: string;
        reason?: string;
      } => ({ valid: true, points: 1, word: "casa" })
    ),
    resetGame: vi.fn(),
    rotateBoard: vi.fn(
      (): {
        success: boolean;
        cooldownTime?: number;
        rotationVersion?: number;
        reason?: string;
      } => ({ success: true, cooldownTime: 30, rotationVersion: 1 })
    ),
    findAllPossibleWords: vi.fn(() => ({
      words: [],
      maxScore: 0,
      totalWords: 0,
    })),
    setEliminateCommonWords: vi.fn(),
    getClientSideValidation: vi.fn(() => false),
    getGameState: vi.fn(() => ({
      board: [],
      players: [],
      gameState: "waiting",
      timeLeft: 188,
      diceRolls: [],
      rotationVersion: 0,
    })),
    eliminateCommonWords: true,
    board: [
      ["A", "B", "C", "D"],
      ["E", "F", "G", "H"],
      ["I", "J", "K", "L"],
      ["M", "N", "O", "P"],
    ],
  };
}

describe("setupBoggleHandlers", () => {
  let io: ReturnType<typeof createMockIO>;
  let socket: ReturnType<typeof createMockSocket>;
  let game: ReturnType<typeof createMockGame>;

  beforeEach(() => {
    vi.useFakeTimers();
    io = createMockIO();
    socket = createMockSocket("socket-1");
    game = createMockGame();
    setupBoggleHandlers(io, socket, game);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("start-game", () => {
    it("calls startGame and emits dice-rolling", () => {
      socket._trigger("start-game");

      expect(game.startGame).toHaveBeenCalled();
      expect(io.emit).toHaveBeenCalledWith("dice-rolling", []);
    });

    it("emits game-started after 3 seconds", () => {
      socket._trigger("start-game");

      // Should not have emitted game-started yet
      const gameStartedCalls = io.emit.mock.calls.filter(
        ([event]: [string]) => event === "game-started"
      );
      expect(gameStartedCalls).toHaveLength(0);

      vi.advanceTimersByTime(3000);

      const gameStartedCallsAfter = io.emit.mock.calls.filter(
        ([event]: [string]) => event === "game-started"
      );
      expect(gameStartedCallsAfter).toHaveLength(1);
    });
  });

  describe("submit-word", () => {
    it("emits error when rotationVersion is not a number", () => {
      socket._trigger("submit-word", {
        word: "casa",
        path: [[0, 0]],
        rotationVersion: "bad",
      });

      expect(socket.emit).toHaveBeenCalledWith(
        "word-result",
        expect.objectContaining({ valid: false })
      );
      expect(game.submitWord).not.toHaveBeenCalled();
    });

    it("emits word-result in server validation mode", () => {
      game.getClientSideValidation.mockReturnValue(false);

      socket._trigger("submit-word", {
        word: "casa",
        path: [[0, 0]],
        rotationVersion: 0,
      });

      expect(game.submitWord).toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith(
        "word-result",
        expect.objectContaining({ valid: true, word: "casa" })
      );
    });

    it("does NOT emit word-result in client validation mode", () => {
      game.getClientSideValidation.mockReturnValue(true);

      socket._trigger("submit-word", {
        word: "casa",
        path: [[0, 0]],
        rotationVersion: 0,
      });

      const wordResultCalls = socket.emit.mock.calls.filter(
        ([event]: [string]) => event === "word-result"
      );
      expect(wordResultCalls).toHaveLength(0);
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

    it("emits game-state for a valid word", () => {
      socket._trigger("submit-word", {
        word: "casa",
        path: [[0, 0]],
        rotationVersion: 0,
      });

      expect(io.emit).toHaveBeenCalledWith(
        "game-state",
        expect.anything()
      );
    });

    it("does NOT broadcast player-scored for an invalid word", () => {
      game.submitWord.mockReturnValue({
        valid: false,
        reason: "not a word",
      });

      socket._trigger("submit-word", {
        word: "xyz",
        path: [[0, 0]],
        rotationVersion: 0,
      });

      const playerScoredCalls = io.emit.mock.calls.filter(
        ([event]: [string]) => event === "player-scored"
      );
      expect(playerScoredCalls).toHaveLength(0);
    });
  });

  describe("reset-game", () => {
    it("calls resetGame and emits game-reset to all", () => {
      socket._trigger("reset-game");

      expect(game.resetGame).toHaveBeenCalled();
      expect(io.emit).toHaveBeenCalledWith(
        "game-reset",
        expect.anything()
      );
    });
  });

  describe("rotate-board", () => {
    it("emits board-rotated on success", () => {
      socket._trigger("rotate-board");

      expect(game.rotateBoard).toHaveBeenCalled();
      expect(io.emit).toHaveBeenCalledWith("board-rotated", {
        board: game.board,
        cooldownTime: 30,
        rotationVersion: 1,
      });
    });

    it("emits rotation-error on failure", () => {
      game.rotateBoard.mockReturnValue({
        success: false,
        reason: "cooldown active",
      });

      socket._trigger("rotate-board");

      expect(socket.emit).toHaveBeenCalledWith("rotation-error", {
        message: "cooldown active",
      });
    });
  });

  describe("get-max-score", () => {
    it("emits max-score-data with a valid board", () => {
      socket._trigger("get-max-score");

      expect(game.findAllPossibleWords).toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith(
        "max-score-data",
        expect.objectContaining({ maxScore: 0, totalWords: 0 })
      );
    });

    it("emits empty data without a valid board", () => {
      game.board = [];

      socket._trigger("get-max-score");

      expect(socket.emit).toHaveBeenCalledWith(
        "max-score-data",
        expect.objectContaining({ maxScore: 0, totalWords: 0 })
      );
    });
  });

  describe("toggle-eliminate-common-words", () => {
    it("calls setEliminateCommonWords and emits to all clients", () => {
      socket._trigger("toggle-eliminate-common-words", true);

      expect(game.setEliminateCommonWords).toHaveBeenCalledWith(true);
      expect(io.emit).toHaveBeenCalledWith(
        "eliminate-common-words-changed",
        expect.anything()
      );
    });
  });
});
