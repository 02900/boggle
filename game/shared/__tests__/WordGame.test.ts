import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";

vi.mock("fs");
vi.mock("../../../utils/debug", () => ({ debugLog: vi.fn() }));

vi.mocked(fs.readFileSync).mockReturnValue(
  "casa\nmesa\nsilla\nagua\nfuego\ngato\nperro\ntierra\naire\namor\ntiempo\nlugar\ncosa\npersona\nanimal\nplanta\ncomida\n"
);

import { WordGame, type WordGameConfig } from "../WordGame";

// Concrete test subclass with minimal abstract method implementations
class TestWordGame extends WordGame {
  startGameCalled = false;
  endGameCalled = false;

  constructor(config: WordGameConfig = { timeLimit: 100 }) {
    super(config);
  }

  startGame() {
    this.startGameCalled = true;
    return true;
  }

  endGame(): void {
    this.endGameCalled = true;
    this.gameState = "finished";
  }

  getGameState() {
    return {
      players: Array.from(this.players.values()),
      gameState: this.gameState,
      timeLeft: this.timeLeft,
    };
  }
}

describe("WordGame", () => {
  let game: TestWordGame;

  beforeEach(() => {
    vi.clearAllMocks();
    game = new TestWordGame();
  });

  afterEach(() => {
    game.clearTimers();
  });

  describe("constructor", () => {
    it("initializes with waiting state", () => {
      expect(game.gameState).toBe("waiting");
    });

    it("sets timeLeft from config", () => {
      expect(game.timeLeft).toBe(100);
      const game200 = new TestWordGame({ timeLimit: 200 });
      expect(game200.timeLeft).toBe(200);
    });

    it("loads dictionary from fs mock", () => {
      expect(game.words.size).toBeGreaterThan(0);
      expect(game.words.has("casa")).toBe(true);
      expect(game.words.has("gato")).toBe(true);
    });

    it("falls back to basic dictionary on fs error", () => {
      vi.mocked(fs.readFileSync).mockImplementationOnce(() => {
        throw new Error("file not found");
      });
      const errorGame = new TestWordGame();
      expect(errorGame.words.size).toBeGreaterThan(0);
      expect(errorGame.words.has("gato")).toBe(true);
    });

    it("initializes with empty players and history", () => {
      expect(game.players.size).toBe(0);
      expect(game.gameHistory.size).toBe(0);
    });
  });

  describe("addPlayer", () => {
    it("adds player to players Map with correct fields", () => {
      game.addPlayer("p1", "Alice");
      const player = game.players.get("p1");
      expect(player).toBeDefined();
      expect(player!.name).toBe("Alice");
      expect(player!.score).toBe(0);
      expect(player!.wordsFound).toEqual([]);
      expect(player!.isConnected).toBe(true);
    });

    it("adds player to gameHistory Map", () => {
      game.addPlayer("p1", "Alice");
      expect(game.gameHistory.has("p1")).toBe(true);
    });

    it("supports multiple players", () => {
      game.addPlayer("p1", "Alice");
      game.addPlayer("p2", "Bob");
      expect(game.players.size).toBe(2);
      expect(game.gameHistory.size).toBe(2);
    });
  });

  describe("removePlayer", () => {
    it("removes player from players Map", () => {
      game.addPlayer("p1", "Alice");
      game.removePlayer("p1");
      expect(game.players.has("p1")).toBe(false);
    });

    it("marks player as disconnected in gameHistory", () => {
      game.addPlayer("p1", "Alice");
      game.removePlayer("p1");
      const historyPlayer = game.gameHistory.get("p1");
      expect(historyPlayer!.isConnected).toBe(false);
      expect(historyPlayer!.disconnectedAt).toBeDefined();
    });

    it("does nothing for unknown player", () => {
      game.addPlayer("p1", "Alice");
      game.removePlayer("unknown");
      expect(game.players.size).toBe(1);
    });
  });

  describe("getRandomName / releaseName", () => {
    it("returns a name and removes it from pool", () => {
      const initialLength = game.availableNames.length;
      const name = game.getRandomName();
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
      expect(game.availableNames.length).toBe(initialLength - 1);
    });

    it("refills pool when exhausted", () => {
      game.availableNames = [];
      const name = game.getRandomName();
      expect(typeof name).toBe("string");
      expect(game.availableNames.length).toBeGreaterThan(0);
    });

    it("releaseName adds name back to pool", () => {
      const name = game.getRandomName();
      const lengthAfterTake = game.availableNames.length;
      game.releaseName(name);
      expect(game.availableNames.length).toBe(lengthAfterTake + 1);
      expect(game.availableNames).toContain(name);
    });
  });

  describe("clearTimers", () => {
    it("clears internal timer", () => {
      vi.useFakeTimers();
      game.timer = setInterval(() => {}, 1000);
      expect(game.timer).not.toBeNull();
      game.clearInternalTimer();
      expect(game.timer).toBeNull();
      vi.useRealTimers();
    });

    it("clears update timer", () => {
      vi.useFakeTimers();
      game.updateTimer = setInterval(() => {}, 1000);
      expect(game.updateTimer).not.toBeNull();
      game.clearUpdateTimer();
      expect(game.updateTimer).toBeNull();
      vi.useRealTimers();
    });

    it("clears both timers", () => {
      vi.useFakeTimers();
      game.timer = setInterval(() => {}, 1000);
      game.updateTimer = setInterval(() => {}, 1000);
      game.clearTimers();
      expect(game.timer).toBeNull();
      expect(game.updateTimer).toBeNull();
      vi.useRealTimers();
    });
  });

  describe("resetGame", () => {
    it("sets state to waiting", () => {
      game.gameState = "playing";
      game.resetGame();
      expect(game.gameState).toBe("waiting");
    });

    it("resets timeLeft to config value", () => {
      game.timeLeft = 50;
      game.resetGame();
      expect(game.timeLeft).toBe(100);
    });

    it("resets player scores and words", () => {
      game.addPlayer("p1", "Alice");
      const player = game.players.get("p1")!;
      player.score = 10;
      player.wordsFound = ["casa", "mesa"];
      game.resetGame();
      expect(player.score).toBe(0);
      expect(player.wordsFound).toEqual([]);
    });

    it("rebuilds gameHistory from current players", () => {
      game.addPlayer("p1", "Alice");
      game.addPlayer("p2", "Bob");
      game.removePlayer("p2");
      expect(game.gameHistory.has("p2")).toBe(true);
      game.resetGame();
      // After reset, only connected players should be in history
      expect(game.gameHistory.has("p1")).toBe(true);
      expect(game.gameHistory.has("p2")).toBe(false);
    });
  });

  describe("clientSideValidation", () => {
    it("defaults to true", () => {
      expect(game.getClientSideValidation()).toBe(true);
    });

    it("can be toggled", () => {
      game.setClientSideValidation(false);
      expect(game.getClientSideValidation()).toBe(false);
      game.setClientSideValidation(true);
      expect(game.getClientSideValidation()).toBe(true);
    });
  });

  describe("setIO", () => {
    it("sets the io reference", () => {
      const mockIO = { emit: vi.fn() };
      game.setIO(mockIO as any);
      expect(game.io).toBe(mockIO);
    });
  });
});
