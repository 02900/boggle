import { describe, it, expect } from "vitest";
import {
  TILE_DISTRIBUTION,
  LETTER_VALUES,
  MULTIPLIER_BOARD,
  createEmptyBoard,
  createTileBag,
  getLetterValue,
  calculateWordScore,
  calculateTurnScore,
} from "../scrabbleConfig";

describe("TILE_DISTRIBUTION", () => {
  it("has exactly 100 total tiles", () => {
    const totalTiles = Object.values(TILE_DISTRIBUTION).reduce(
      (sum, { count }) => sum + count,
      0
    );
    expect(totalTiles).toBe(100);
  });

  it("has correct count for common letters", () => {
    expect(TILE_DISTRIBUTION["A"].count).toBe(12);
    expect(TILE_DISTRIBUTION["E"].count).toBe(12);
    expect(TILE_DISTRIBUTION["O"].count).toBe(9);
    expect(TILE_DISTRIBUTION["BLANK"].count).toBe(2);
  });

  it("has correct values for key letters", () => {
    expect(TILE_DISTRIBUTION["A"].value).toBe(1);
    expect(TILE_DISTRIBUTION["D"].value).toBe(2);
    expect(TILE_DISTRIBUTION["C"].value).toBe(3);
    expect(TILE_DISTRIBUTION["H"].value).toBe(4);
    expect(TILE_DISTRIBUTION["Q"].value).toBe(5);
    expect(TILE_DISTRIBUTION["J"].value).toBe(8);
    expect(TILE_DISTRIBUTION["Z"].value).toBe(10);
    expect(TILE_DISTRIBUTION["BLANK"].value).toBe(0);
  });
});

describe("LETTER_VALUES", () => {
  it("does not include BLANK", () => {
    expect(LETTER_VALUES["BLANK"]).toBeUndefined();
  });

  it("maps letters to their point values", () => {
    expect(LETTER_VALUES["A"]).toBe(1);
    expect(LETTER_VALUES["Z"]).toBe(10);
    expect(LETTER_VALUES["Ñ"]).toBe(8);
  });
});

describe("MULTIPLIER_BOARD", () => {
  it("is 15x15", () => {
    expect(MULTIPLIER_BOARD).toHaveLength(15);
    for (const row of MULTIPLIER_BOARD) {
      expect(row).toHaveLength(15);
    }
  });

  it("center square is CENTER", () => {
    expect(MULTIPLIER_BOARD[7][7]).toBe("CENTER");
  });

  it("has exactly 8 TW squares", () => {
    const count = MULTIPLIER_BOARD.flat().filter((m) => m === "TW").length;
    expect(count).toBe(8);
  });

  it("has correct DW count (16 DW + 1 CENTER = 17 double-word positions)", () => {
    const dw = MULTIPLIER_BOARD.flat().filter((m) => m === "DW").length;
    const center = MULTIPLIER_BOARD.flat().filter((m) => m === "CENTER").length;
    expect(dw + center).toBe(17);
  });

  it("has exactly 12 TL squares", () => {
    const count = MULTIPLIER_BOARD.flat().filter((m) => m === "TL").length;
    expect(count).toBe(12);
  });

  it("has exactly 24 DL squares", () => {
    const count = MULTIPLIER_BOARD.flat().filter((m) => m === "DL").length;
    expect(count).toBe(24);
  });

  it("is symmetric across the horizontal axis", () => {
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        expect(MULTIPLIER_BOARD[r][c]).toBe(MULTIPLIER_BOARD[14 - r][c]);
      }
    }
  });

  it("is symmetric across the vertical axis", () => {
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        expect(MULTIPLIER_BOARD[r][c]).toBe(MULTIPLIER_BOARD[r][14 - c]);
      }
    }
  });

  it("corners are TW", () => {
    expect(MULTIPLIER_BOARD[0][0]).toBe("TW");
    expect(MULTIPLIER_BOARD[0][14]).toBe("TW");
    expect(MULTIPLIER_BOARD[14][0]).toBe("TW");
    expect(MULTIPLIER_BOARD[14][14]).toBe("TW");
  });
});

describe("createEmptyBoard", () => {
  it("returns a 15x15 grid", () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(15);
    for (const row of board) {
      expect(row).toHaveLength(15);
    }
  });

  it("every cell has correct row/col and null tile", () => {
    const board = createEmptyBoard();
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        expect(board[r][c].row).toBe(r);
        expect(board[r][c].col).toBe(c);
        expect(board[r][c].tile).toBeNull();
      }
    }
  });

  it("preserves multiplier layout", () => {
    const board = createEmptyBoard();
    expect(board[0][0].multiplier).toBe("TW");
    expect(board[7][7].multiplier).toBe("CENTER");
  });
});

describe("createTileBag", () => {
  it("returns exactly 100 tiles", () => {
    const bag = createTileBag();
    expect(bag).toHaveLength(100);
  });

  it("has correct letter counts", () => {
    const bag = createTileBag();
    const counts: Record<string, number> = {};
    for (const tile of bag) {
      const key = tile.isBlank ? "BLANK" : tile.letter;
      counts[key] = (counts[key] || 0) + 1;
    }
    expect(counts["A"]).toBe(12);
    expect(counts["E"]).toBe(12);
    expect(counts["Z"]).toBe(1);
    expect(counts["BLANK"]).toBe(2);
  });

  it("blank tiles have value 0 and empty letter", () => {
    const bag = createTileBag();
    const blanks = bag.filter((t) => t.isBlank);
    expect(blanks).toHaveLength(2);
    for (const blank of blanks) {
      expect(blank.value).toBe(0);
      expect(blank.letter).toBe("");
    }
  });

  it("every tile has a unique id", () => {
    const bag = createTileBag();
    const ids = new Set(bag.map((t) => t.id));
    expect(ids.size).toBe(100);
  });
});

describe("getLetterValue", () => {
  it("returns correct value for known letters", () => {
    expect(getLetterValue("A")).toBe(1);
    expect(getLetterValue("Z")).toBe(10);
  });

  it("is case-insensitive", () => {
    expect(getLetterValue("a")).toBe(1);
    expect(getLetterValue("z")).toBe(10);
  });

  it("returns 0 for unknown letters", () => {
    expect(getLetterValue("?")).toBe(0);
  });
});

describe("calculateWordScore", () => {
  const emptyBoard = createEmptyBoard();

  function makePlacement(
    letter: string,
    value: number,
    row: number,
    col: number
  ) {
    return {
      tile: { id: "t", letter, value, isBlank: false },
      row,
      col,
    };
  }

  it("scores a word with no multipliers", () => {
    // Place on NONE squares (row 1, cols 2-4 are NONE)
    const placements = [
      makePlacement("C", 3, 1, 2),
      makePlacement("A", 1, 1, 3),
      makePlacement("S", 1, 1, 4),
    ];
    expect(calculateWordScore(placements, emptyBoard)).toBe(5); // 3+1+1
  });

  it("applies DL multiplier", () => {
    // (0,3) is DL
    const placements = [
      makePlacement("Z", 10, 0, 3),
    ];
    expect(calculateWordScore(placements, emptyBoard)).toBe(20); // 10*2
  });

  it("applies TL multiplier", () => {
    // (1,5) is TL
    const placements = [
      makePlacement("A", 1, 1, 5),
    ];
    expect(calculateWordScore(placements, emptyBoard)).toBe(3); // 1*3
  });

  it("applies DW multiplier", () => {
    // (1,1) is DW
    const placements = [
      makePlacement("A", 1, 1, 1),
      makePlacement("B", 3, 1, 2),
    ];
    expect(calculateWordScore(placements, emptyBoard)).toBe(8); // (1+3)*2
  });

  it("applies TW multiplier", () => {
    // (0,0) is TW
    const placements = [
      makePlacement("A", 1, 0, 0),
      makePlacement("B", 3, 0, 1),
    ];
    expect(calculateWordScore(placements, emptyBoard)).toBe(12); // (1+3)*3
  });

  it("applies CENTER as DW", () => {
    // (7,7) is CENTER
    const placements = [
      makePlacement("C", 3, 7, 7),
      makePlacement("A", 1, 7, 8),
    ];
    expect(calculateWordScore(placements, emptyBoard)).toBe(8); // (3+1)*2
  });

  it("blank tiles score 0", () => {
    const placements = [
      { tile: { id: "t", letter: "A", value: 0, isBlank: true }, row: 1, col: 2 },
      makePlacement("B", 3, 1, 3),
    ];
    expect(calculateWordScore(placements, emptyBoard)).toBe(3); // 0+3
  });

  it("does not apply multipliers to already-occupied cells", () => {
    const board = createEmptyBoard();
    // Pre-place a tile on (0,0) TW
    board[0][0].tile = { id: "existing", letter: "A", value: 1, isBlank: false };
    const placements = [
      makePlacement("A", 1, 0, 0), // existing tile — multiplier should NOT apply
      makePlacement("B", 3, 0, 1),
    ];
    // TW not applied since cell already has tile: (1+3)*1 = 4
    expect(calculateWordScore(placements, board)).toBe(4);
  });
});

describe("calculateTurnScore", () => {
  it("sums word scores", () => {
    const words = [
      { word: "CASA", score: 6, tiles: [] },
      { word: "AS", score: 2, tiles: [] },
    ];
    expect(calculateTurnScore(words, 4)).toBe(8);
  });

  it("adds bingo bonus when 7 tiles placed", () => {
    const words = [{ word: "PALABRA", score: 12, tiles: [] }];
    expect(calculateTurnScore(words, 7)).toBe(62); // 12 + 50
  });

  it("no bingo bonus for fewer than 7 tiles", () => {
    const words = [{ word: "SOL", score: 3, tiles: [] }];
    expect(calculateTurnScore(words, 3)).toBe(3);
  });

  it("returns 0 for empty words array", () => {
    expect(calculateTurnScore([], 0)).toBe(0);
  });
});
