import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dictionaryService before importing ClientWordValidator
vi.mock("@/services/dictionaryService", () => {
  const dictionary = new Set(["casa", "mesa", "silla", "perro", "gato", "elefante", "caballo"]);
  return {
    dictionaryService: {
      loadDictionary: vi.fn().mockResolvedValue({
        success: true,
        wordsLoaded: dictionary.size,
        source: "remote" as const,
        loadTime: 10,
      }),
      hasWord: vi.fn((word: string) => dictionary.has(word.toLowerCase())),
      isReady: vi.fn(() => true),
      getDictionarySize: vi.fn(() => dictionary.size),
      getStats: vi.fn(() => ({
        isLoaded: true,
        isLoading: false,
        size: dictionary.size,
        hasFallback: true,
        fallbackSize: 100,
      })),
      forceReload: vi.fn().mockResolvedValue({
        success: true,
        wordsLoaded: dictionary.size,
        source: "remote" as const,
        loadTime: 10,
      }),
    },
    DictionaryLoadResult: {},
  };
});

import { ClientWordValidator } from "../clientWordValidator";
import { dictionaryService } from "@/services/dictionaryService";

describe("ClientWordValidator", () => {
  let validator: ClientWordValidator;

  // Board: C A T S
  //        R E P O
  //        L I N K
  //        D U M B
  const board = [
    ["C", "A", "T", "S"],
    ["R", "E", "P", "O"],
    ["L", "I", "N", "K"],
    ["D", "U", "M", "B"],
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(dictionaryService.isReady).mockReturnValue(true);
    validator = new ClientWordValidator();
    await validator.waitForLoad();
  });

  describe("validateWord", () => {
    it("rejects words shorter than 3 letters", () => {
      const result = validator.validateWord(board, "ca", [[0, 0], [0, 1]]);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("corta");
    });

    it("rejects already found words", () => {
      const result = validator.validateWord(
        board,
        "casa",
        [[0, 0], [0, 1], [0, 3], [0, 1]],
        ["casa"]
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Ya encontraste");
    });

    it("rejects invalid path (non-adjacent cells)", () => {
      const result = validator.validateWord(
        board,
        "cat",
        [[0, 0], [0, 1], [2, 2]], // [2,2] not adjacent to [0,1]
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("inválida");
    });

    it("rejects invalid path (reused cell)", () => {
      const result = validator.validateWord(
        board,
        "cac",
        [[0, 0], [0, 1], [0, 0]],
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("inválida");
    });

    it("rejects invalid path (out of bounds)", () => {
      const result = validator.validateWord(
        board,
        "cat",
        [[0, 0], [0, 1], [-1, 0]],
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("inválida");
    });

    it("rejects word not in dictionary", () => {
      const result = validator.validateWord(
        board,
        "cat",
        [[0, 0], [0, 1], [0, 2]],
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("diccionario");
    });

    it("accepts valid word in dictionary with valid path", () => {
      // We need a word from our mock dictionary that can be formed on the board
      // "casa" = C(0,0) A(0,1) S(0,3)... but S is not adjacent to A
      // Let's mock hasWord to accept "cat"
      vi.mocked(dictionaryService.hasWord).mockReturnValue(true);

      const result = validator.validateWord(
        board,
        "cat",
        [[0, 0], [0, 1], [0, 2]],
      );
      expect(result.valid).toBe(true);
      expect(result.isClientValidation).toBe(true);
      expect(result.points).toBe(1); // 3 letters = 1 point
      expect(result.word).toBe("cat");
    });

    it("returns valid when dictionary is not ready (defers to server)", () => {
      vi.mocked(dictionaryService.isReady).mockReturnValue(false);
      vi.mocked(dictionaryService.hasWord).mockReturnValue(false);

      const result = validator.validateWord(
        board,
        "cat",
        [[0, 0], [0, 1], [0, 2]],
      );
      expect(result.valid).toBe(true);
      expect(result.reason).toContain("servidor");
    });
  });

  describe("point calculation via validateWord", () => {
    beforeEach(() => {
      vi.mocked(dictionaryService.hasWord).mockReturnValue(true);
    });

    it("gives 1 point for 3-letter word", () => {
      const result = validator.validateWord(board, "cat", [[0, 0], [0, 1], [0, 2]]);
      expect(result.points).toBe(1);
    });

    it("gives 1 point for 4-letter word", () => {
      // C A T S on first row: C(0,0) A(0,1) T(0,2) S(0,3) — all adjacent
      const result = validator.validateWord(board, "cats", [[0, 0], [0, 1], [0, 2], [0, 3]]);
      expect(result.points).toBe(1);
    });

    it("gives 2 points for 5-letter word", () => {
      // C A T S O: (0,0)(0,1)(0,2)(0,3)(1,3) — all adjacent
      const result = validator.validateWord(board, "catso", [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]]);
      expect(result.points).toBe(2);
    });

    it("gives 3 points for 6-letter word", () => {
      // C A T S O K: (0,0)(0,1)(0,2)(0,3)(1,3)(2,3) — all adjacent
      const result = validator.validateWord(board, "catsok", [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3]]);
      expect(result.points).toBe(3);
    });

    it("gives 5 points for 7-letter word", () => {
      // C A T S O K N: (0,0)(0,1)(0,2)(0,3)(1,3)(2,3)(2,2) — all adjacent
      const result = validator.validateWord(board, "catsokn", [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [2, 2]]);
      expect(result.points).toBe(5);
    });

    it("gives 11 points for 8+ letter word", () => {
      // C A T S O K N I: (0,0)(0,1)(0,2)(0,3)(1,3)(2,3)(2,2)(2,1) — all adjacent
      const result = validator.validateWord(board, "catsokni", [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [2, 2], [2, 1]]);
      expect(result.points).toBe(11);
    });
  });

  describe("isReady", () => {
    it("delegates to dictionaryService.isReady", () => {
      vi.mocked(dictionaryService.isReady).mockReturnValue(true);
      expect(validator.isReady()).toBe(true);

      vi.mocked(dictionaryService.isReady).mockReturnValue(false);
      expect(validator.isReady()).toBe(false);
    });
  });

  describe("getDictionarySize", () => {
    it("delegates to dictionaryService.getDictionarySize", () => {
      vi.mocked(dictionaryService.getDictionarySize).mockReturnValue(42);
      expect(validator.getDictionarySize()).toBe(42);
    });
  });
});
