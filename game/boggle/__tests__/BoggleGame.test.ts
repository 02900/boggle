import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";

// Mock modules before BoggleGame import
vi.mock("fs");
vi.mock("../../../utils/scoreboard", () => ({
  updateScoreboard: vi.fn(),
}));
vi.mock("../../../utils/streakTracker", () => ({
  streakTracker: {
    recordWin: vi.fn(() => ({
      wins: 1,
      lastWinTime: Date.now(),
      sessionStartTime: Date.now(),
    })),
    getPlayersStreaks: vi.fn(() => ({})),
  },
}));
vi.mock("../../../utils/debug", () => ({
  debugLog: vi.fn(),
}));

// Configure fs mock BEFORE importing BoggleGame
vi.mocked(fs.readFileSync).mockReturnValue(
  "casa\nmesa\nsilla\nagua\nfuego\ngato\nperro\ntierra\naire\namor\ntiempo\nlugar\ncosa\npersona\nanimal\nplanta\ncomida\ncasas\nmesas\nsillas\npiedras\npersonas\nanimales\n"
);

import { BoggleGame } from "../BoggleGame";
import { updateScoreboard } from "../../../utils/scoreboard";
import { streakTracker } from "../../../utils/streakTracker";
import { TIME_LIMIT } from "../../../config/boggleConstants";
import { RANDOM_NAMES } from "../../../utils/names";

// ---- Helpers ----

function createGame(): BoggleGame {
  return new BoggleGame();
}

/** Known board layout:
 *  C A S A
 *  M E S A
 *  G A T O
 *  P E R R
 *
 *  "casa" -> [[0,0],[0,1],[0,2],[0,3]]
 *  "mesa" -> [[1,0],[1,1],[1,2],[1,3]]
 *  "gato" -> [[2,0],[2,1],[2,2],[2,3]]
 */
function setupKnownBoard(game: BoggleGame): void {
  game.board = [
    ["C", "A", "S", "A"],
    ["M", "E", "S", "A"],
    ["G", "A", "T", "O"],
    ["P", "E", "R", "R"],
  ];
  game.gameState = "playing";
  game.rotationVersion = 0;
  game.saveBoardToHistory();
}

// ---- Tests ----

describe("BoggleGame", () => {
  let game: BoggleGame;

  beforeEach(() => {
    vi.clearAllMocks();
    game = createGame();
  });

  afterEach(() => {
    game.clearTimers();
    vi.useRealTimers();
  });

  // ===========================================================================
  // constructor
  // ===========================================================================
  describe("constructor", () => {
    it("initializes with gameState 'waiting', empty board, and timeLeft=188", () => {
      expect(game.gameState).toBe("waiting");
      expect(game.board).toEqual([]);
      expect(game.timeLeft).toBe(188);
    });

    it("loads dictionary from mock fs (words Set has entries)", () => {
      expect(game.words.size).toBeGreaterThan(0);
      expect(game.words.has("casa")).toBe(true);
      expect(game.words.has("mesa")).toBe(true);
      expect(game.words.has("gato")).toBe(true);
    });

    it("falls back to basic dictionary on fs error", () => {
      vi.mocked(fs.readFileSync).mockImplementationOnce(() => {
        throw new Error("File not found");
      });
      const errorGame = new BoggleGame();
      expect(errorGame.words.size).toBeGreaterThan(0);
      expect(errorGame.words.has("gato")).toBe(true);
      expect(errorGame.words.has("casa")).toBe(true);
    });
  });

  // ===========================================================================
  // generateBoard
  // ===========================================================================
  describe("generateBoard", () => {
    it("returns 16 DiceRoll objects", () => {
      const diceRolls = game.generateBoard();
      expect(diceRolls).toHaveLength(16);
    });

    it("sets board to a 4x4 grid", () => {
      game.generateBoard();
      expect(game.board).toHaveLength(4);
      for (const row of game.board) {
        expect(row).toHaveLength(4);
      }
    });

    it("each cell is a non-empty string", () => {
      game.generateBoard();
      for (const row of game.board) {
        for (const cell of row) {
          expect(typeof cell).toBe("string");
          expect(cell.length).toBeGreaterThan(0);
        }
      }
    });

    it("sets rotationVersion to 0", () => {
      game.rotationVersion = 5;
      game.generateBoard();
      expect(game.rotationVersion).toBe(0);
    });

    it("saves initial board to history as version 0", () => {
      game.generateBoard();
      expect(game.boardHistory.has(0)).toBe(true);
      const historicalBoard = game.boardHistory.get(0);
      expect(historicalBoard).toEqual(game.board);
    });
  });

  // ===========================================================================
  // getRandomName / releaseName
  // ===========================================================================
  describe("getRandomName / releaseName", () => {
    it("returns a name from the available pool", () => {
      const name = game.getRandomName();
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
      expect(RANDOM_NAMES).toContain(name);
    });

    it("removes the selected name from the pool", () => {
      const initialLength = game.availableNames.length;
      const name = game.getRandomName();
      expect(game.availableNames).toHaveLength(initialLength - 1);
      expect(game.availableNames).not.toContain(name);
    });

    it("refills the pool when exhausted", () => {
      game.availableNames = [];
      const name = game.getRandomName();
      expect(typeof name).toBe("string");
      // After refill and picking one, should have RANDOM_NAMES.length - 1
      expect(game.availableNames).toHaveLength(RANDOM_NAMES.length - 1);
    });

    it("releaseName adds the name back to the pool", () => {
      const name = game.getRandomName();
      expect(game.availableNames).not.toContain(name);
      game.releaseName(name);
      expect(game.availableNames).toContain(name);
    });
  });

  // ===========================================================================
  // addPlayer / removePlayer
  // ===========================================================================
  describe("addPlayer / removePlayer", () => {
    it("addPlayer adds to players Map with correct fields", () => {
      game.addPlayer("p1", "Alice");
      const player = game.players.get("p1");
      expect(player).toBeDefined();
      expect(player!.id).toBe("p1");
      expect(player!.name).toBe("Alice");
      expect(player!.score).toBe(0);
      expect(player!.wordsFound).toEqual([]);
      expect(player!.eliminatedWords).toEqual([]);
      expect(player!.isConnected).toBe(true);
      expect(typeof player!.joinedAt).toBe("number");
    });

    it("addPlayer adds to gameHistory Map", () => {
      game.addPlayer("p1", "Alice");
      const historyPlayer = game.gameHistory.get("p1");
      expect(historyPlayer).toBeDefined();
      expect(historyPlayer!.name).toBe("Alice");
    });

    it("removePlayer removes from players Map", () => {
      game.addPlayer("p1", "Alice");
      game.removePlayer("p1");
      expect(game.players.has("p1")).toBe(false);
    });

    it("removePlayer updates gameHistory (isConnected=false, disconnectedAt set)", () => {
      game.addPlayer("p1", "Alice");
      game.removePlayer("p1");
      const historyPlayer = game.gameHistory.get("p1");
      expect(historyPlayer).toBeDefined();
      expect(historyPlayer!.isConnected).toBe(false);
      expect(typeof historyPlayer!.disconnectedAt).toBe("number");
    });

    it("removePlayer releases the player name back to the pool", () => {
      const name = RANDOM_NAMES[0];
      game.addPlayer("p1", name);
      // Ensure name is not in available pool (addPlayer doesn't remove, but let's manually simulate)
      game.availableNames = game.availableNames.filter((n) => n !== name);
      game.removePlayer("p1");
      expect(game.availableNames).toContain(name);
    });

    it("removePlayer does nothing for an unknown id", () => {
      const playersBefore = game.players.size;
      game.removePlayer("nonexistent");
      expect(game.players.size).toBe(playersBefore);
    });
  });

  // ===========================================================================
  // startGame
  // ===========================================================================
  describe("startGame", () => {
    it("returns false if no players are present", () => {
      const result = game.startGame();
      expect(result).toBe(false);
    });

    it("returns { success: true, diceRolls } when players exist", () => {
      game.addPlayer("p1", "Alice");
      const result = game.startGame();
      game.clearTimers();
      expect(result).not.toBe(false);
      expect((result as { success: boolean; diceRolls: unknown[] }).success).toBe(true);
      expect((result as { success: boolean; diceRolls: unknown[] }).diceRolls).toHaveLength(16);
    });

    it("sets gameState to 'playing'", () => {
      game.addPlayer("p1", "Alice");
      game.startGame();
      game.clearTimers();
      expect(game.gameState).toBe("playing");
    });

    it("sets timeLeft to TIME_LIMIT", () => {
      game.addPlayer("p1", "Alice");
      game.timeLeft = 50;
      game.startGame();
      game.clearTimers();
      expect(game.timeLeft).toBe(TIME_LIMIT);
    });

    it("timer decrements timeLeft over time", () => {
      vi.useFakeTimers();
      game.addPlayer("p1", "Alice");
      game.startGame();
      const initialTime = game.timeLeft;
      vi.advanceTimersByTime(3000);
      expect(game.timeLeft).toBe(initialTime - 3);
      game.clearTimers();
    });
  });

  // ===========================================================================
  // endGame
  // ===========================================================================
  describe("endGame", () => {
    beforeEach(() => {
      game.addPlayer("p1", "Alice");
      game.addPlayer("p2", "Bob");
      setupKnownBoard(game);
    });

    it("sets gameState to 'finished'", () => {
      game.endGame();
      expect(game.gameState).toBe("finished");
    });

    it("clears timers", () => {
      vi.useFakeTimers();
      game.startGame();
      expect(game.timer).not.toBeNull();
      game.endGame();
      expect(game.timer).toBeNull();
      expect(game.updateTimer).toBeNull();
    });

    it("calls updateScoreboard with all participants", () => {
      game.endGame();
      expect(updateScoreboard).toHaveBeenCalledTimes(1);
      const call = vi.mocked(updateScoreboard).mock.calls[0];
      expect(call[1]).toBe(game.gameHistory.size);
    });

    it("records streak wins for winners when >1 participant and score > 0", () => {
      // Must give players valid wordsFound so revalidation preserves their scores
      const p1 = game.players.get("p1")!;
      p1.wordsFound = ["casa", "mesa", "gato"];
      p1.score = 3;
      const hp1 = game.gameHistory.get("p1")!;
      hp1.wordsFound = ["casa", "mesa", "gato"];
      hp1.score = 3;

      const p2 = game.players.get("p2")!;
      p2.wordsFound = ["silla"];
      p2.score = 2;
      const hp2 = game.gameHistory.get("p2")!;
      hp2.wordsFound = ["silla"];
      hp2.score = 2;

      // After elimination, "casa","mesa","gato" are unique to p1, "silla" unique to p2
      // p1 score: 3 (1+1+1), p2 score: 2
      game.endGame();
      expect(streakTracker.recordWin).toHaveBeenCalledWith("Alice");
      expect(streakTracker.recordWin).not.toHaveBeenCalledWith("Bob");
    });

    it("does NOT record streaks if only 1 participant", () => {
      game.players.delete("p2");
      game.gameHistory.delete("p2");
      const p1 = game.players.get("p1")!;
      p1.wordsFound = ["casa"];
      p1.score = 1;
      const hp1 = game.gameHistory.get("p1")!;
      hp1.wordsFound = ["casa"];
      hp1.score = 1;

      game.endGame();
      expect(streakTracker.recordWin).not.toHaveBeenCalled();
    });

    it("does NOT record streaks if max score is 0", () => {
      // Both players have score 0
      game.endGame();
      expect(streakTracker.recordWin).not.toHaveBeenCalled();
    });

    it("emits 'game-ended' via io", () => {
      const mockIO = { emit: vi.fn() };
      game.setIO(mockIO as any);
      game.endGame();
      expect(mockIO.emit).toHaveBeenCalledWith("game-ended", expect.any(Object));
    });
  });

  // ===========================================================================
  // submitWord
  // ===========================================================================
  describe("submitWord", () => {
    beforeEach(() => {
      game.addPlayer("p1", "Alice");
      setupKnownBoard(game);
    });

    it("rejects when game is not 'playing'", () => {
      game.gameState = "waiting";
      const result = game.submitWord("p1", "casa", [[0, 0], [0, 1], [0, 2], [0, 3]], 0);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Juego no activo");
    });

    it("rejects unknown player", () => {
      const result = game.submitWord("unknown", "casa", [[0, 0], [0, 1], [0, 2], [0, 3]], 0);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Jugador no encontrado");
    });

    it("rejects duplicate word", () => {
      game.submitWord("p1", "casa", [[0, 0], [0, 1], [0, 2], [0, 3]], 0);
      const result = game.submitWord("p1", "casa", [[0, 0], [0, 1], [0, 2], [0, 3]], 0);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Palabra ya encontrada");
    });

    it("rejects word shorter than 3 characters", () => {
      const result = game.submitWord("p1", "ca", [[0, 0], [0, 1]], 0);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Palabra muy corta");
    });

    it("rejects word not in dictionary", () => {
      const result = game.submitWord("p1", "xyz", [[0, 0], [0, 1], [0, 2]], 0);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Palabra no está en el diccionario");
    });

    it("rejects invalid path", () => {
      // "casa" but with a non-adjacent jump
      const result = game.submitWord("p1", "casa", [[0, 0], [0, 1], [0, 3], [0, 2]], 0);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Ruta inválida en el tablero");
    });

    it("accepts a valid word and returns correct score", () => {
      const result = game.submitWord("p1", "casa", [[0, 0], [0, 1], [0, 2], [0, 3]], 0);
      expect(result.valid).toBe(true);
      expect(result.points).toBe(1); // 4-letter word = 1 point
      expect(result.word).toBe("casa");
    });

    it("is case insensitive", () => {
      const result = game.submitWord("p1", "CASA", [[0, 0], [0, 1], [0, 2], [0, 3]], 0);
      expect(result.valid).toBe(true);
      expect(result.word).toBe("casa");
    });

    it("updates gameHistory for valid word", () => {
      game.submitWord("p1", "casa", [[0, 0], [0, 1], [0, 2], [0, 3]], 0);
      const historyPlayer = game.gameHistory.get("p1");
      expect(historyPlayer).toBeDefined();
      expect(historyPlayer!.wordsFound).toContain("casa");
      expect(historyPlayer!.score).toBe(1);
    });

    it("returns correct points based on word length", () => {
      // 4-letter word "casa" -> 1 point
      const r1 = game.submitWord("p1", "casa", [[0, 0], [0, 1], [0, 2], [0, 3]], 0);
      expect(r1.points).toBe(1);

      // 4-letter word "mesa" -> 1 point
      const r2 = game.submitWord("p1", "mesa", [[1, 0], [1, 1], [1, 2], [1, 3]], 0);
      expect(r2.points).toBe(1);

      // 4-letter word "gato" -> 1 point
      const r3 = game.submitWord("p1", "gato", [[2, 0], [2, 1], [2, 2], [2, 3]], 0);
      expect(r3.points).toBe(1);

      // Verify cumulative score
      expect(game.players.get("p1")!.score).toBe(3);
    });
  });

  // ===========================================================================
  // validatePathOnBoard
  // ===========================================================================
  describe("validatePathOnBoard", () => {
    const board = [
      ["C", "A", "S", "A"],
      ["M", "E", "S", "A"],
      ["G", "A", "T", "O"],
      ["P", "E", "R", "R"],
    ];

    it("returns false for out-of-bounds coordinates", () => {
      expect(game.validatePathOnBoard([[0, 0], [-1, 0]], "cx", board)).toBe(false);
      expect(game.validatePathOnBoard([[0, 0], [0, 4]], "ca", board)).toBe(false);
      expect(game.validatePathOnBoard([[4, 0]], "x", board)).toBe(false);
    });

    it("returns false for reused cells", () => {
      // Trying to use cell [0,0] twice
      expect(game.validatePathOnBoard([[0, 0], [0, 1], [0, 0]], "cac", board)).toBe(false);
    });

    it("returns false for non-adjacent cells", () => {
      // [0,0] to [0,2] is not adjacent (gap of 2 cols)
      expect(game.validatePathOnBoard([[0, 0], [0, 2]], "cs", board)).toBe(false);
    });

    it("returns false when path letters do not match the word", () => {
      // Path spells "cas" but word is "cat"
      expect(game.validatePathOnBoard([[0, 0], [0, 1], [0, 2]], "cat", board)).toBe(false);
    });

    it("returns true for a valid adjacent path", () => {
      // "casa" along row 0
      expect(game.validatePathOnBoard([[0, 0], [0, 1], [0, 2], [0, 3]], "casa", board)).toBe(true);
    });

    it("handles digraphs (multi-char cell like QU) on the board", () => {
      const boardWithQU = [
        ["QU", "E", "S", "O"],
        ["A", "B", "C", "D"],
        ["E", "F", "G", "H"],
        ["I", "J", "K", "L"],
      ];
      // path [0,0] -> "qu", [0,1] -> "e" => "que"
      expect(game.validatePathOnBoard([[0, 0], [0, 1]], "que", boardWithQU)).toBe(true);
    });

    it("returns false when same cell used with rowDiff=0 and colDiff=0", () => {
      // Path has two consecutive entries pointing to same cell implicitly via adjacency check
      // Actually this triggers the reused-cell check first; let's test adjacency check
      // with rowDiff=0,colDiff=0 (not possible without reuse, but we can test the logic)
      // Two distinct cells but same position is caught by reuse check.
      // The adjacency check catches (rowDiff===0 && colDiff===0) when i>0:
      // This would only happen with duplicate coords, which also fails reuse check.
      // We can still verify it returns false:
      expect(game.validatePathOnBoard([[0, 0], [0, 0]], "cc", board)).toBe(false);
    });

    it("works correctly for a single-cell path forming a 1-letter path-word", () => {
      // A single cell path is valid structurally, it just needs to match a 1-char word
      // (though the game requires 3+ chars, the method itself should still work)
      expect(game.validatePathOnBoard([[0, 0]], "c", board)).toBe(true);
    });
  });

  // ===========================================================================
  // rotateBoard
  // ===========================================================================
  describe("rotateBoard", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      game.addPlayer("p1", "Alice");
      setupKnownBoard(game);
      game.lastRotationTime = 0; // Ensure no cooldown
    });

    it("rotates the board 90 degrees clockwise correctly", () => {
      // Original:        After 90 CW rotation:
      // C A S A          P G M C
      // M E S A    =>    E A E A
      // G A T O          R T S S
      // P E R R          R O A A
      const result = game.rotateBoard();
      expect(result.success).toBe(true);
      expect(game.board).toEqual([
        ["P", "G", "M", "C"],
        ["E", "A", "E", "A"],
        ["R", "T", "S", "S"],
        ["R", "O", "A", "A"],
      ]);
    });

    it("increments rotationVersion", () => {
      expect(game.rotationVersion).toBe(0);
      game.rotateBoard();
      expect(game.rotationVersion).toBe(1);
      // Advance past cooldown for second rotation
      vi.advanceTimersByTime(31000);
      game.rotateBoard();
      expect(game.rotationVersion).toBe(2);
    });

    it("returns error during cooldown", () => {
      game.rotateBoard();
      // Try immediately again
      const result = game.rotateBoard();
      expect(result.success).toBe(false);
      expect(result.reason).toContain("esperar");
    });

    it("returns error when game is not 'playing'", () => {
      game.gameState = "waiting";
      game.lastRotationTime = 0;
      const result = game.rotateBoard();
      expect(result.success).toBe(false);
      expect(result.reason).toBe("Solo se puede rotar el tablero durante el juego");
    });

    it("saves pre-rotation board to history", () => {
      const boardBeforeRotation = game.board.map((row) => [...row]);
      game.rotateBoard();
      // Version 0 was saved by setupKnownBoard, and rotateBoard saves again before rotating
      const historicalBoard = game.boardHistory.get(0);
      expect(historicalBoard).toEqual(boardBeforeRotation);
    });

    it("returns success with cooldownTime and rotationVersion", () => {
      const result = game.rotateBoard();
      expect(result.success).toBe(true);
      expect(result.cooldownTime).toBe(30); // 30000ms / 1000
      expect(result.rotationVersion).toBe(1);
    });
  });

  // ===========================================================================
  // saveBoardToHistory / getBoardByVersion / transformCoordinates
  // ===========================================================================
  describe("saveBoardToHistory / getBoardByVersion / transformCoordinates", () => {
    it("saveBoardToHistory stores a deep copy of the board", () => {
      setupKnownBoard(game);
      const savedBoard = game.boardHistory.get(0);
      expect(savedBoard).toEqual(game.board);
      // Verify it's a deep copy, not a reference
      game.board[0][0] = "Z";
      expect(savedBoard![0][0]).toBe("C");
    });

    it("prunes entries beyond maxBoardHistory (5)", () => {
      setupKnownBoard(game);
      // Fill up history beyond max
      for (let i = 1; i <= 6; i++) {
        game.rotationVersion = i;
        game.board = [
          [`${i}`, "A", "B", "C"],
          ["D", "E", "F", "G"],
          ["H", "I", "J", "K"],
          ["L", "M", "N", "O"],
        ];
        game.saveBoardToHistory();
      }
      expect(game.boardHistory.size).toBeLessThanOrEqual(game.maxBoardHistory);
    });

    it("getBoardByVersion returns current board for current version", () => {
      setupKnownBoard(game);
      const board = game.getBoardByVersion(game.rotationVersion);
      expect(board).toBe(game.board); // same reference
    });

    it("getBoardByVersion returns null for unknown version", () => {
      setupKnownBoard(game);
      const board = game.getBoardByVersion(999);
      expect(board).toBeNull();
    });

    it("transformCoordinates returns identity for same version", () => {
      const path: [number, number][] = [[0, 0], [0, 1], [1, 1]];
      const result = game.transformCoordinates(path, 2, 2);
      expect(result).toEqual(path);
    });

    it("transformCoordinates applies correct 90-degree rotation", () => {
      // One 90 CW rotation: (row, col) -> (col, 3 - row)
      const path: [number, number][] = [[0, 0]];
      const result = game.transformCoordinates(path, 0, 1);
      // newRow = col = 0, newCol = 3 - row = 3
      expect(result).toEqual([[0, 3]]);
    });
  });

  // ===========================================================================
  // eliminateCommonWordsFromPlayers
  // ===========================================================================
  describe("eliminateCommonWordsFromPlayers", () => {
    it("skips when fewer than 2 participants", () => {
      game.addPlayer("p1", "Alice");
      const hp1 = game.gameHistory.get("p1")!;
      hp1.wordsFound = ["casa"];
      hp1.score = 1;

      game.eliminateCommonWordsFromPlayers();
      expect(hp1.wordsFound).toContain("casa");
      expect(hp1.score).toBe(1);
    });

    it("removes words found by 2+ players from all of them", () => {
      game.addPlayer("p1", "Alice");
      game.addPlayer("p2", "Bob");
      const hp1 = game.gameHistory.get("p1")!;
      const hp2 = game.gameHistory.get("p2")!;

      hp1.wordsFound = ["casa", "mesa"];
      hp2.wordsFound = ["casa", "gato"];

      game.eliminateCommonWordsFromPlayers();

      // "casa" is common, removed from both
      expect(hp1.wordsFound).not.toContain("casa");
      expect(hp2.wordsFound).not.toContain("casa");
      // unique words remain
      expect(hp1.wordsFound).toContain("mesa");
      expect(hp2.wordsFound).toContain("gato");
    });

    it("adds removed words to eliminatedWords array", () => {
      game.addPlayer("p1", "Alice");
      game.addPlayer("p2", "Bob");
      const hp1 = game.gameHistory.get("p1")!;
      const hp2 = game.gameHistory.get("p2")!;

      hp1.wordsFound = ["casa", "mesa"];
      hp2.wordsFound = ["casa"];

      game.eliminateCommonWordsFromPlayers();

      expect(hp1.eliminatedWords).toContain("casa");
      expect(hp2.eliminatedWords).toContain("casa");
    });

    it("recalculates scores correctly after elimination", () => {
      game.addPlayer("p1", "Alice");
      game.addPlayer("p2", "Bob");
      const hp1 = game.gameHistory.get("p1")!;
      const hp2 = game.gameHistory.get("p2")!;

      // "casa" (4 letters = 1pt), "silla" (5 letters = 2pt)
      hp1.wordsFound = ["casa", "silla"];
      hp1.score = 3;
      hp2.wordsFound = ["casa"];
      hp2.score = 1;

      game.eliminateCommonWordsFromPlayers();

      // "casa" eliminated. hp1 keeps "silla" (2pts), hp2 keeps nothing (0pts)
      expect(hp1.score).toBe(2);
      expect(hp2.score).toBe(0);
    });

    it("updates both gameHistory and active players", () => {
      game.addPlayer("p1", "Alice");
      game.addPlayer("p2", "Bob");
      const hp1 = game.gameHistory.get("p1")!;
      const hp2 = game.gameHistory.get("p2")!;
      const ap1 = game.players.get("p1")!;
      const ap2 = game.players.get("p2")!;

      hp1.wordsFound = ["casa", "mesa"];
      hp2.wordsFound = ["casa"];
      ap1.wordsFound = ["casa", "mesa"];
      ap2.wordsFound = ["casa"];

      game.eliminateCommonWordsFromPlayers();

      // Active players should mirror history
      expect(ap1.wordsFound).toEqual(hp1.wordsFound);
      expect(ap1.eliminatedWords).toEqual(hp1.eliminatedWords);
      expect(ap1.score).toBe(hp1.score);
      expect(ap2.wordsFound).toEqual(hp2.wordsFound);
      expect(ap2.score).toBe(hp2.score);
    });
  });

  // ===========================================================================
  // revalidateClientWords
  // ===========================================================================
  describe("revalidateClientWords", () => {
    it("removes words not in dictionary", () => {
      game.addPlayer("p1", "Alice");
      const hp1 = game.gameHistory.get("p1")!;
      hp1.wordsFound = ["casa", "zzznotaword"];
      hp1.score = 2;

      game.revalidateClientWords();

      expect(hp1.wordsFound).toContain("casa");
      expect(hp1.wordsFound).not.toContain("zzznotaword");
    });

    it("removes words shorter than 3 characters", () => {
      game.addPlayer("p1", "Alice");
      const hp1 = game.gameHistory.get("p1")!;
      hp1.wordsFound = ["casa", "ab"];
      hp1.score = 2;

      game.revalidateClientWords();

      expect(hp1.wordsFound).toContain("casa");
      expect(hp1.wordsFound).not.toContain("ab");
    });

    it("recalculates scores after removing invalid words", () => {
      game.addPlayer("p1", "Alice");
      const hp1 = game.gameHistory.get("p1")!;
      // "casa" (4 letters -> 1pt via BoggleGame.calculateWordPoints), "invalidword" will be removed
      hp1.wordsFound = ["casa", "invalidword"];
      hp1.score = 99;

      game.revalidateClientWords();

      // Only "casa" remains, 4 letters => 1 point (BoggleGame.calculateWordPoints)
      expect(hp1.score).toBe(1);
    });

    it("emits 'words-revalidated' when words are removed", () => {
      const mockIO = { emit: vi.fn() };
      game.setIO(mockIO as any);
      game.addPlayer("p1", "Alice");
      const hp1 = game.gameHistory.get("p1")!;
      hp1.wordsFound = ["casa", "badword"];
      hp1.score = 2;

      game.revalidateClientWords();

      expect(mockIO.emit).toHaveBeenCalledWith(
        "words-revalidated",
        expect.objectContaining({
          totalWordsRemoved: 1,
        })
      );
    });
  });

  // ===========================================================================
  // resetGame
  // ===========================================================================
  describe("resetGame", () => {
    it("sets state to 'waiting'", () => {
      game.addPlayer("p1", "Alice");
      game.startGame();
      game.clearTimers();
      game.resetGame();
      expect(game.gameState).toBe("waiting");
    });

    it("resets all player scores and words", () => {
      game.addPlayer("p1", "Alice");
      const player = game.players.get("p1")!;
      player.score = 10;
      player.wordsFound = ["casa", "mesa"];

      game.resetGame();

      expect(player.score).toBe(0);
      expect(player.wordsFound).toEqual([]);
    });

    it("clears timers", () => {
      vi.useFakeTimers();
      game.addPlayer("p1", "Alice");
      game.startGame();
      expect(game.timer).not.toBeNull();
      game.resetGame();
      expect(game.timer).toBeNull();
    });

    it("rebuilds gameHistory from current players", () => {
      game.addPlayer("p1", "Alice");
      game.addPlayer("p2", "Bob");

      // Simulate some history from a previous game
      game.gameHistory.set("old", { id: "old", name: "OldPlayer", score: 5, wordsFound: [], eliminatedWords: [], isConnected: false, joinedAt: 0 });

      game.resetGame();

      // Old history entry should be gone
      expect(game.gameHistory.has("old")).toBe(false);
      // Current players should be in history
      expect(game.gameHistory.has("p1")).toBe(true);
      expect(game.gameHistory.has("p2")).toBe(true);
      expect(game.gameHistory.get("p1")!.score).toBe(0);
    });
  });

  // ===========================================================================
  // getGameState
  // ===========================================================================
  describe("getGameState", () => {
    it("returns the correct structure", () => {
      game.addPlayer("p1", "Alice");
      setupKnownBoard(game);

      const state = game.getGameState();
      expect(state.board).toEqual(game.board);
      expect(state.players).toHaveLength(1);
      expect(state.gameState).toBe("playing");
      expect(state.timeLeft).toBe(game.timeLeft);
      expect(state.rotationVersion).toBe(0);
      expect(typeof state.clientSideValidation).toBe("boolean");
    });

    it("includes playerStreaks when game is finished", () => {
      game.addPlayer("p1", "Alice");
      game.gameState = "finished";
      game.gameHistory.set("p1", {
        id: "p1",
        name: "Alice",
        score: 5,
        wordsFound: [],
        eliminatedWords: [],
        isConnected: true,
        joinedAt: Date.now(),
      });

      const state = game.getGameState();
      expect(state.playerStreaks).toBeDefined();
      expect(streakTracker.getPlayersStreaks).toHaveBeenCalledWith(["Alice"]);
    });

    it("does not include streaks when game is not finished", () => {
      game.addPlayer("p1", "Alice");
      game.gameState = "playing";

      const state = game.getGameState();
      expect(state.playerStreaks).toBeUndefined();
    });
  });

  // ===========================================================================
  // setEliminateCommonWords / setClientSideValidation
  // ===========================================================================
  describe("setEliminateCommonWords / setClientSideValidation", () => {
    it("toggles eliminateCommonWords", () => {
      expect(game.eliminateCommonWords).toBe(true);
      game.setEliminateCommonWords(false);
      expect(game.eliminateCommonWords).toBe(false);
      game.setEliminateCommonWords(true);
      expect(game.eliminateCommonWords).toBe(true);
    });

    it("toggles clientSideValidation", () => {
      expect(game.getClientSideValidation()).toBe(true);
      game.setClientSideValidation(false);
      expect(game.getClientSideValidation()).toBe(false);
      game.setClientSideValidation(true);
      expect(game.getClientSideValidation()).toBe(true);
    });
  });

  // ===========================================================================
  // Integration tests
  // ===========================================================================
  describe("integration", () => {
    it("full game lifecycle: add players, start, submit words, end with scoring", () => {
      game.addPlayer("p1", "Alice");
      game.addPlayer("p2", "Bob");
      setupKnownBoard(game);

      // Both submit different words
      const r1 = game.submitWord("p1", "casa", [[0, 0], [0, 1], [0, 2], [0, 3]], 0);
      expect(r1.valid).toBe(true);

      const r2 = game.submitWord("p2", "mesa", [[1, 0], [1, 1], [1, 2], [1, 3]], 0);
      expect(r2.valid).toBe(true);

      const r3 = game.submitWord("p1", "gato", [[2, 0], [2, 1], [2, 2], [2, 3]], 0);
      expect(r3.valid).toBe(true);

      expect(game.players.get("p1")!.score).toBe(2); // casa(1) + gato(1)
      expect(game.players.get("p2")!.score).toBe(1); // mesa(1)

      game.endGame();
      expect(game.gameState).toBe("finished");
      expect(updateScoreboard).toHaveBeenCalled();
    });

    it("two players submit same word -> common word elimination removes it", () => {
      game.addPlayer("p1", "Alice");
      game.addPlayer("p2", "Bob");
      setupKnownBoard(game);

      game.submitWord("p1", "casa", [[0, 0], [0, 1], [0, 2], [0, 3]], 0);
      game.submitWord("p2", "casa", [[0, 0], [0, 1], [0, 2], [0, 3]], 0);
      game.submitWord("p1", "gato", [[2, 0], [2, 1], [2, 2], [2, 3]], 0);

      game.endGame();

      const hp1 = game.gameHistory.get("p1")!;
      const hp2 = game.gameHistory.get("p2")!;

      // "casa" was common => eliminated from both
      expect(hp1.eliminatedWords).toContain("casa");
      expect(hp2.eliminatedWords).toContain("casa");

      // p1 keeps "gato" (1pt), p2 has nothing (0pt)
      expect(hp1.wordsFound).toContain("gato");
      expect(hp1.score).toBe(1);
      expect(hp2.score).toBe(0);
    });

    it("player disconnects mid-game -> score still in endGame", () => {
      game.addPlayer("p1", "Alice");
      game.addPlayer("p2", "Bob");
      setupKnownBoard(game);

      game.submitWord("p1", "casa", [[0, 0], [0, 1], [0, 2], [0, 3]], 0);
      game.submitWord("p2", "mesa", [[1, 0], [1, 1], [1, 2], [1, 3]], 0);

      // p2 disconnects
      game.removePlayer("p2");
      expect(game.players.has("p2")).toBe(false);

      // p2's history should still exist
      const hp2 = game.gameHistory.get("p2")!;
      expect(hp2.isConnected).toBe(false);
      expect(hp2.wordsFound).toContain("mesa");

      game.endGame();

      // Scoreboard should include both participants
      const call = vi.mocked(updateScoreboard).mock.calls[0];
      const participantScores = call[0] as Array<{ name: string }>;
      const names = participantScores.map((p) => p.name);
      expect(names).toContain("Alice");
      expect(names).toContain("Bob");
    });

    it("board rotation -> submit word with old rotation version uses historical board", () => {
      vi.useFakeTimers();
      game.addPlayer("p1", "Alice");
      setupKnownBoard(game);
      game.lastRotationTime = 0;

      // Submit a word on version 0
      const r1 = game.submitWord("p1", "casa", [[0, 0], [0, 1], [0, 2], [0, 3]], 0);
      expect(r1.valid).toBe(true);

      // Rotate board -> version 1
      const rotResult = game.rotateBoard();
      expect(rotResult.success).toBe(true);
      expect(game.rotationVersion).toBe(1);

      // Submit "mesa" using old rotation version 0 path
      // The historical board (version 0) should still be available
      const r2 = game.submitWord("p1", "mesa", [[1, 0], [1, 1], [1, 2], [1, 3]], 0);
      expect(r2.valid).toBe(true);
    });

    it("findAllPossibleWords finds known words on a set board", () => {
      setupKnownBoard(game);

      const result = game.findAllPossibleWords();

      expect(result.totalWords).toBeGreaterThan(0);
      expect(result.maxScore).toBeGreaterThan(0);
      expect(result.words.length).toBe(result.totalWords);

      // Check that at least some known words from our board and dictionary are found
      const foundWordStrings = result.words.map((w) => w.word);
      // "mesa" path [[1,0],[1,1],[1,2],[1,3]] is valid adjacent path
      expect(foundWordStrings).toContain("mesa");
      // "gato" path [[2,0],[2,1],[2,2],[2,3]] is valid adjacent path
      expect(foundWordStrings).toContain("gato");
      // "casa" path [[0,0],[0,1],[0,2],[0,3]] is valid adjacent path
      expect(foundWordStrings).toContain("casa");
    });
  });
});
