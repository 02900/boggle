import { describe, it, expect } from "vitest";
import { createEmptyBoard } from "../scrabbleConfig";
import { evaluateMove, isBoardEmpty } from "../moveEvaluation";
import type { ScrabbleTile, TilePlacement } from "../../../src/interfaces/scrabble";

const tile = (letter: string, value: number, id = `t-${letter}-${Math.random()}`): ScrabbleTile => ({
  id,
  letter,
  value,
  isBlank: false,
});

const row = (r: number, startCol: number, tiles: ScrabbleTile[]): TilePlacement[] =>
  tiles.map((t, i) => ({ tile: t, row: r, col: startCol + i }));

describe("evaluateMove", () => {
  it("scores a first move through the center (double word)", () => {
    const board = createEmptyBoard();
    const result = evaluateMove(board, row(7, 6, [tile("C", 3), tile("A", 1), tile("S", 1), tile("A", 1)]), true);

    expect(result).toMatchObject({ valid: true, score: 12 });
    expect(result.valid && result.words.map((w) => w.word)).toEqual(["CASA"]);
  });

  it("uses a blank's assigned letter for the word and 0 for its value", () => {
    const board = createEmptyBoard();
    const blank: ScrabbleTile = { id: "b", letter: "", value: 0, isBlank: true, assignedLetter: "S" };
    const result = evaluateMove(board, row(7, 7, [tile("E", 1), blank]), true);

    expect(result).toMatchObject({ valid: true, score: 2 });
    expect(result.valid && result.words[0].word).toBe("ES");
  });

  it("counts cross words and ignores premiums under existing tiles", () => {
    const board = createEmptyBoard();
    for (const p of row(7, 6, [tile("C", 3), tile("A", 1), tile("S", 1), tile("A", 1)])) {
      board[p.row][p.col].tile = p.tile;
    }
    // "LA" down from (6,7): L above the existing A at (7,7)
    const result = evaluateMove(board, [{ tile: tile("L", 1), row: 6, col: 7 }], false);

    expect(result.valid && result.words.map((w) => w.word)).toEqual(["LA"]);
    expect(result).toMatchObject({ valid: true, score: 2 });
  });

  it("reports why a placement is invalid", () => {
    const board = createEmptyBoard();
    expect(evaluateMove(board, row(3, 3, [tile("A", 1), tile("S", 1)]), true)).toEqual({
      valid: false,
      reason: "La primera palabra debe cubrir la casilla central",
    });
    expect(evaluateMove(board, [{ tile: tile("A", 1), row: 7, col: 7 }], true)).toEqual({
      valid: false,
      reason: "No se formó ninguna palabra válida",
    });
  });
});

describe("isBoardEmpty", () => {
  it("is true only while no tile has been committed", () => {
    const board = createEmptyBoard();
    expect(isBoardEmpty(board)).toBe(true);
    board[7][7].tile = tile("A", 1);
    expect(isBoardEmpty(board)).toBe(false);
  });
});
