import { describe, it, expect } from "vitest";
import {
  keyToLetter,
  moveFocus,
  nextFreeCell,
  pickTileForLetter,
  placementDirection,
} from "../board-keyboard";
import { createEmptyBoard } from "../../../game/scrabble/scrabbleConfig";
import type { ScrabbleTile } from "@/interfaces/scrabble";

const t = (letter: string, id = letter): ScrabbleTile => ({ id, letter, value: 1, isBlank: false });
const blank: ScrabbleTile = { id: "?", letter: "", value: 0, isBlank: true };
const at = (row: number, col: number) => row * 15 + col;

describe("moveFocus", () => {
  it("moves with arrows and clamps at the edges", () => {
    expect(moveFocus(at(7, 7), "ArrowRight")).toBe(at(7, 8));
    expect(moveFocus(at(7, 7), "ArrowUp")).toBe(at(6, 7));
    expect(moveFocus(at(0, 0), "ArrowLeft")).toBe(at(0, 0));
    expect(moveFocus(at(14, 14), "ArrowDown")).toBe(at(14, 14));
  });

  it("Home / End go to the row's ends; other keys aren't moves", () => {
    expect(moveFocus(at(3, 5), "Home")).toBe(at(3, 0));
    expect(moveFocus(at(3, 5), "End")).toBe(at(3, 14));
    expect(moveFocus(at(3, 5), "a")).toBeNull();
  });
});

describe("keyToLetter", () => {
  it("accepts single letters including ñ", () => {
    expect(keyToLetter("c")).toBe("C");
    expect(keyToLetter("ñ")).toBe("Ñ");
    expect(keyToLetter("Enter")).toBeNull();
    expect(keyToLetter("1")).toBeNull();
  });
});

describe("pickTileForLetter", () => {
  it("prefers the exact letter, then a digraph, then a blank", () => {
    expect(pickTileForLetter([t("CH"), t("C")], "C")).toEqual({ tile: t("C") });
    expect(pickTileForLetter([t("CH"), blank], "C")).toEqual({ tile: t("CH") });
    expect(pickTileForLetter([blank], "E")).toEqual({ tile: blank, assignedLetter: "E" });
  });

  it("returns null when nothing fits, and never uses a blank for K/W", () => {
    expect(pickTileForLetter([t("A")], "E")).toBeNull();
    expect(pickTileForLetter([blank], "K")).toBeNull();
  });
});

describe("placementDirection / nextFreeCell", () => {
  it("reads down only when tentatives stack in one column", () => {
    expect(placementDirection([])).toBe("across");
    expect(placementDirection([{ tile: t("A"), row: 1, col: 1 }, { tile: t("B"), row: 2, col: 1 }])).toBe("down");
    expect(placementDirection([{ tile: t("A"), row: 1, col: 1 }, { tile: t("B"), row: 1, col: 2 }])).toBe("across");
  });

  it("skips committed and tentative tiles, stops at the edge", () => {
    const board = createEmptyBoard();
    board[7][8].tile = t("X");
    const tentatives = [{ tile: t("A"), row: 7, col: 9 }];
    expect(nextFreeCell(board, tentatives, 7, 7, "across")).toBe(at(7, 10));
    expect(nextFreeCell(board, [], 7, 7, "down")).toBe(at(8, 7));
    expect(nextFreeCell(board, [], 7, 14, "across")).toBeNull();
  });
});
