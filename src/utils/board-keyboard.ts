import type { ScrabbleBoardCell, ScrabbleTile, TilePlacement } from "@/interfaces/scrabble";
import { VALID_BLANK_LETTERS } from "../../game/scrabble/scrabbleConfig";

/**
 * Keyboard play on the board (pure helpers, used by ScrabbleBoard):
 * arrows move the focused cell, typing a letter places a matching rack tile and
 * advances in the word's direction, Backspace takes tiles back.
 */

export const BOARD_SIZE = 15;

export type Direction = "across" | "down";

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/** New focus index after an arrow / Home / End key, or null if the key isn't a move. */
export function moveFocus(index: number, key: string): number | null {
  const row = Math.floor(index / BOARD_SIZE);
  const col = index % BOARD_SIZE;
  if (key === "Home") return row * BOARD_SIZE;
  if (key === "End") return row * BOARD_SIZE + BOARD_SIZE - 1;
  const delta = ARROWS[key];
  if (!delta) return null;
  const r = Math.min(BOARD_SIZE - 1, Math.max(0, row + delta[0]));
  const c = Math.min(BOARD_SIZE - 1, Math.max(0, col + delta[1]));
  return r * BOARD_SIZE + c;
}

/** The typed key as a board letter ("ñ" → "Ñ"), or null for non-letter keys. */
export function keyToLetter(key: string): string | null {
  return /^[a-zñ]$/i.test(key) ? key.toUpperCase() : null;
}

/**
 * Which rack tile a typed letter plays: the exact letter first, then a digraph
 * starting with it (C → CH), then a blank standing for the letter.
 */
export function pickTileForLetter(
  rack: ScrabbleTile[],
  letter: string
): { tile: ScrabbleTile; assignedLetter?: string } | null {
  const exact = rack.find((t) => !t.isBlank && t.letter === letter);
  if (exact) return { tile: exact };
  const digraph = rack.find((t) => !t.isBlank && t.letter.length > 1 && t.letter.startsWith(letter));
  if (digraph) return { tile: digraph };
  // K / W aren't Spanish tiles, so a blank can't stand for them either
  const blank = VALID_BLANK_LETTERS.has(letter) ? rack.find((t) => t.isBlank) : undefined;
  return blank ? { tile: blank, assignedLetter: letter } : null;
}

/** Tentative tiles stacked in one column read downwards; anything else reads across. */
export function placementDirection(tentatives: TilePlacement[]): Direction {
  if (tentatives.length < 2) return "across";
  const col = tentatives[0].col;
  return tentatives.every((p) => p.col === col) ? "down" : "across";
}

/**
 * The next free cell after (row, col) going `direction`, skipping over committed
 * and tentative tiles (so typing continues through letters already on the board).
 */
export function nextFreeCell(
  board: ScrabbleBoardCell[][],
  tentatives: TilePlacement[],
  row: number,
  col: number,
  direction: Direction
): number | null {
  const taken = new Set(tentatives.map((p) => p.row * BOARD_SIZE + p.col));
  const [dr, dc] = direction === "across" ? [0, 1] : [1, 0];
  for (let r = row + dr, c = col + dc; r < BOARD_SIZE && c < BOARD_SIZE; r += dr, c += dc) {
    if (!board[r][c].tile && !taken.has(r * BOARD_SIZE + c)) return r * BOARD_SIZE + c;
  }
  return null;
}
