import { SCRABBLE_BOARD_SIZE, SCRABBLE_BINGO_BONUS, SCRABBLE_RACK_SIZE } from "../../config/scrabbleConstants";
import type {
  MultiplierType,
  ScrabbleBoardCell,
  ScrabbleTile,
  TilePlacement,
  ScoredWord,
} from "../../src/interfaces/scrabble";

// ---- Spanish tile distribution (100 tiles) ----

export const TILE_DISTRIBUTION: Record<string, { count: number; value: number }> = {
  A: { count: 12, value: 1 },
  E: { count: 12, value: 1 },
  O: { count: 9, value: 1 },
  I: { count: 6, value: 1 },
  S: { count: 6, value: 1 },
  N: { count: 5, value: 1 },
  R: { count: 5, value: 1 },
  U: { count: 5, value: 1 },
  L: { count: 4, value: 1 },
  T: { count: 4, value: 1 },
  D: { count: 5, value: 2 },
  G: { count: 2, value: 2 },
  C: { count: 4, value: 3 },
  B: { count: 2, value: 3 },
  M: { count: 2, value: 3 },
  P: { count: 2, value: 3 },
  H: { count: 2, value: 4 },
  F: { count: 1, value: 4 },
  V: { count: 1, value: 4 },
  Y: { count: 1, value: 4 },
  CH: { count: 1, value: 5 },
  Q: { count: 1, value: 5 },
  J: { count: 1, value: 8 },
  LL: { count: 1, value: 8 },
  "Ñ": { count: 1, value: 8 },
  RR: { count: 1, value: 8 },
  X: { count: 1, value: 8 },
  Z: { count: 1, value: 10 },
  BLANK: { count: 2, value: 0 },
};

export const LETTER_VALUES: Record<string, number> = Object.fromEntries(
  Object.entries(TILE_DISTRIBUTION)
    .filter(([key]) => key !== "BLANK")
    .map(([letter, { value }]) => [letter, value])
);

// ---- Standard 15x15 Scrabble board multiplier layout ----
// Only upper-left quadrant + center row/col defined, then mirrored for symmetry

const MULTIPLIER_PATTERN: Array<[number, number, MultiplierType]> = [
  // Triple Word
  [0, 0, "TW"], [0, 7, "TW"], [7, 0, "TW"],
  // Double Word
  [1, 1, "DW"], [2, 2, "DW"], [3, 3, "DW"], [4, 4, "DW"],
  // Triple Letter
  [1, 5, "TL"], [5, 1, "TL"], [5, 5, "TL"],
  // Double Letter
  [0, 3, "DL"], [2, 6, "DL"], [3, 0, "DL"], [3, 7, "DL"],
  [6, 2, "DL"], [6, 6, "DL"], [7, 3, "DL"],
  // Center
  [7, 7, "CENTER"],
];

function buildMultiplierBoard(): MultiplierType[][] {
  const size = SCRABBLE_BOARD_SIZE;
  const board: MultiplierType[][] = Array.from({ length: size }, () =>
    Array(size).fill("NONE") as MultiplierType[]
  );

  for (const [row, col, type] of MULTIPLIER_PATTERN) {
    // Mirror across both axes for full symmetry
    const mirrors = [
      [row, col],
      [row, size - 1 - col],
      [size - 1 - row, col],
      [size - 1 - row, size - 1 - col],
    ];
    for (const [r, c] of mirrors) {
      board[r][c] = type;
    }
  }

  // Center is always CENTER (DW in standard rules, we use CENTER to distinguish)
  board[7][7] = "CENTER";

  return board;
}

export const MULTIPLIER_BOARD: MultiplierType[][] = buildMultiplierBoard();

// ---- Board creation ----

export function createEmptyBoard(): ScrabbleBoardCell[][] {
  return MULTIPLIER_BOARD.map((row, r) =>
    row.map((multiplier, c) => ({
      row: r,
      col: c,
      multiplier,
      tile: null,
    }))
  );
}

// ---- Tile bag creation ----

export function createTileBag(): ScrabbleTile[] {
  const tiles: ScrabbleTile[] = [];
  let tileId = 0;

  for (const [letter, { count, value }] of Object.entries(TILE_DISTRIBUTION)) {
    for (let i = 0; i < count; i++) {
      tiles.push({
        id: `tile-${tileId++}`,
        letter: letter === "BLANK" ? "" : letter,
        value,
        isBlank: letter === "BLANK",
      });
    }
  }

  // Shuffle using Fisher-Yates
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }

  return tiles;
}

// ---- Scoring ----

export function getLetterValue(letter: string): number {
  return LETTER_VALUES[letter.toUpperCase()] ?? 0;
}

export function calculateWordScore(
  placements: TilePlacement[],
  board: ScrabbleBoardCell[][]
): number {
  let wordScore = 0;
  let wordMultiplier = 1;

  for (const placement of placements) {
    const { tile, row, col } = placement;
    const cell = board[row][col];
    let letterScore = tile.isBlank ? 0 : tile.value;

    // Letter multipliers only apply to newly placed tiles (cell has no existing tile)
    if (!cell.tile) {
      const mult = cell.multiplier;
      if (mult === "DL") letterScore *= 2;
      else if (mult === "TL") letterScore *= 3;
      else if (mult === "DW" || mult === "CENTER") wordMultiplier *= 2;
      else if (mult === "TW") wordMultiplier *= 3;
    }

    wordScore += letterScore;
  }

  return wordScore * wordMultiplier;
}

export function calculateTurnScore(
  words: ScoredWord[],
  tilesPlaced: number
): number {
  const wordsTotal = words.reduce((sum, w) => sum + w.score, 0);
  const bingoBonus = tilesPlaced === SCRABBLE_RACK_SIZE ? SCRABBLE_BINGO_BONUS : 0;
  return wordsTotal + bingoBonus;
}
