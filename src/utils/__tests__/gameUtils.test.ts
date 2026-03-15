import { describe, it, expect } from "vitest";
import {
  calculateWordScore,
  formatTime,
  areAdjacent,
  isValidPath,
  generateRandomPlayerName,
  getGameStatusEmoji,
  getBoardDifficulty,
} from "../gameUtils";

describe("calculateWordScore", () => {
  it("returns 1 for words of 3 letters", () => {
    expect(calculateWordScore("cat")).toBe(1);
  });

  it("returns 1 for words of 4 letters", () => {
    expect(calculateWordScore("casa")).toBe(1);
  });

  it("returns 2 for words of 5 letters", () => {
    expect(calculateWordScore("perro")).toBe(2);
  });

  it("returns 3 for words of 6 letters", () => {
    expect(calculateWordScore("animal")).toBe(3);
  });

  it("returns 5 for words of 7 letters", () => {
    expect(calculateWordScore("caballo")).toBe(5);
  });

  it("returns 11 for words of 8+ letters", () => {
    expect(calculateWordScore("elefante")).toBe(11);
    expect(calculateWordScore("hipopotamo")).toBe(11);
  });
});

describe("formatTime", () => {
  it("formats 0 seconds", () => {
    expect(formatTime(0)).toBe("0:00");
  });

  it("formats seconds under a minute", () => {
    expect(formatTime(59)).toBe("0:59");
  });

  it("formats exactly one minute", () => {
    expect(formatTime(60)).toBe("1:00");
  });

  it("formats 3 minutes (180s)", () => {
    expect(formatTime(180)).toBe("3:00");
  });

  it("formats mixed minutes and seconds", () => {
    expect(formatTime(125)).toBe("2:05");
  });

  it("pads single-digit seconds", () => {
    expect(formatTime(61)).toBe("1:01");
  });
});

describe("areAdjacent", () => {
  it("returns true for horizontally adjacent cells", () => {
    expect(areAdjacent([0, 0], [0, 1])).toBe(true);
  });

  it("returns true for vertically adjacent cells", () => {
    expect(areAdjacent([0, 0], [1, 0])).toBe(true);
  });

  it("returns true for diagonally adjacent cells", () => {
    expect(areAdjacent([0, 0], [1, 1])).toBe(true);
    expect(areAdjacent([1, 1], [0, 0])).toBe(true);
    expect(areAdjacent([1, 1], [0, 2])).toBe(true);
    expect(areAdjacent([1, 1], [2, 0])).toBe(true);
  });

  it("returns false for the same cell", () => {
    expect(areAdjacent([1, 1], [1, 1])).toBe(false);
  });

  it("returns false for non-adjacent cells", () => {
    expect(areAdjacent([0, 0], [0, 2])).toBe(false);
    expect(areAdjacent([0, 0], [2, 0])).toBe(false);
    expect(areAdjacent([0, 0], [3, 3])).toBe(false);
  });
});

describe("isValidPath", () => {
  const board = [
    ["C", "A", "T", "S"],
    ["R", "E", "P", "O"],
    ["L", "I", "N", "K"],
    ["D", "U", "M", "B"],
  ];

  it("returns true for a valid path", () => {
    const path: [number, number][] = [
      [0, 0],
      [1, 1],
      [0, 2],
    ];
    expect(isValidPath(path, board, "CET")).toBe(true);
  });

  it("returns false when path length differs from word length", () => {
    const path: [number, number][] = [
      [0, 0],
      [0, 1],
    ];
    expect(isValidPath(path, board, "CAT")).toBe(false);
  });

  it("returns false when a cell is reused", () => {
    const path: [number, number][] = [
      [0, 0],
      [0, 1],
      [0, 0],
    ];
    expect(isValidPath(path, board, "CAC")).toBe(false);
  });

  it("returns false when cells are not adjacent", () => {
    const path: [number, number][] = [
      [0, 0],
      [0, 2],
    ];
    expect(isValidPath(path, board, "CT")).toBe(false);
  });

  it("returns false when letter doesn't match", () => {
    const path: [number, number][] = [
      [0, 0],
      [0, 1],
      [0, 2],
    ];
    expect(isValidPath(path, board, "CAX")).toBe(false);
  });

  it("returns false for out of bounds path", () => {
    const path: [number, number][] = [
      [0, 0],
      [-1, 0],
    ];
    expect(isValidPath(path, board, "CX")).toBe(false);
  });

  it("handles case-insensitive matching", () => {
    const path: [number, number][] = [
      [0, 0],
      [0, 1],
      [0, 2],
    ];
    expect(isValidPath(path, board, "cat")).toBe(true);
  });
});

describe("generateRandomPlayerName", () => {
  it("generates a non-empty string", () => {
    const name = generateRandomPlayerName();
    expect(name.length).toBeGreaterThan(0);
  });

  it("matches the pattern AdjectiveNounNumber", () => {
    const name = generateRandomPlayerName();
    // Should end with 1-2 digit number
    expect(name).toMatch(/[A-Z][a-z]+[A-Z][a-z]+\d{1,2}$/);
  });

  it("generates different names (probabilistic)", () => {
    const names = new Set(Array.from({ length: 20 }, () => generateRandomPlayerName()));
    // With 15*15*99 combinations, 20 random names should almost certainly be unique
    expect(names.size).toBeGreaterThan(1);
  });
});

describe("getGameStatusEmoji", () => {
  it("returns clock for waiting", () => {
    expect(getGameStatusEmoji("waiting")).toBe("⏳");
  });

  it("returns controller for playing", () => {
    expect(getGameStatusEmoji("playing")).toBe("🎮");
  });

  it("returns flag for finished", () => {
    expect(getGameStatusEmoji("finished")).toBe("🏁");
  });

  it("returns question mark for unknown status", () => {
    expect(getGameStatusEmoji("unknown")).toBe("❓");
  });
});

describe("getBoardDifficulty", () => {
  it("returns Easy for empty board", () => {
    expect(getBoardDifficulty([])).toBe("Easy");
  });

  it("returns Easy for high vowel ratio (>=30%)", () => {
    const board = [
      ["A", "E", "I", "O"],
      ["U", "A", "E", "I"],
      ["B", "C", "D", "F"],
      ["G", "H", "J", "K"],
    ];
    // 8 vowels out of 16 = 50%
    expect(getBoardDifficulty(board)).toBe("Easy");
  });

  it("returns Medium for moderate vowel ratio (20-30%)", () => {
    // 4 vowels out of 16 = 25%
    const board = [
      ["A", "E", "I", "O"],
      ["B", "C", "D", "F"],
      ["G", "H", "J", "K"],
      ["L", "M", "N", "P"],
    ];
    expect(getBoardDifficulty(board)).toBe("Medium");
  });

  it("returns Hard for low vowel ratio (<20%)", () => {
    const board = [
      ["B", "C", "D", "F"],
      ["G", "H", "J", "K"],
      ["L", "M", "N", "P"],
      ["Q", "R", "S", "A"],
    ];
    // 1 vowel out of 16 = 6.25%
    expect(getBoardDifficulty(board)).toBe("Hard");
  });
});
