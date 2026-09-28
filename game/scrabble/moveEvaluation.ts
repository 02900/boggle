import { SCRABBLE_BOARD_SIZE } from "../../config/scrabbleConstants";
import { calculateTurnScore, calculateWordScore } from "./scrabbleConfig";
import type { ScrabbleBoardCell, ScrabbleTile, ScoredWord, TilePlacement } from "../../src/interfaces/scrabble";

/**
 * Pure move rules shared by the server (ScrabbleGame) and the client (score preview),
 * so both always agree on what a placement forms and what it's worth.
 */

export interface FormedWord {
  word: string;
  tiles: TilePlacement[];
}

export type MoveEvaluation =
  | { valid: false; reason: string }
  | { valid: true; words: ScoredWord[]; score: number };

export function validatePlacement(
  board: ScrabbleBoardCell[][],
  placements: TilePlacement[],
  isFirstTurn: boolean
): { valid: boolean; reason?: string } {
  if (placements.length === 0) {
    return { valid: false, reason: "No se colocaron fichas" };
  }

  // 1. All tiles must be in the same row OR same column
  const rows = new Set(placements.map((p) => p.row));
  const cols = new Set(placements.map((p) => p.col));
  const sameRow = rows.size === 1;
  const sameCol = cols.size === 1;

  if (!sameRow && !sameCol) {
    return { valid: false, reason: "Las fichas deben estar en la misma fila o columna" };
  }

  // 2. Tiles must form a continuous line (existing board tiles can fill gaps)
  if (sameRow) {
    const row = placements[0].row;
    const placedCols = placements.map((p) => p.col).sort((a, b) => a - b);
    const minCol = placedCols[0];
    const maxCol = placedCols[placedCols.length - 1];

    for (let c = minCol; c <= maxCol; c++) {
      const hasPlaced = placedCols.includes(c);
      const hasExisting = board[row][c].tile !== null;
      if (!hasPlaced && !hasExisting) {
        return { valid: false, reason: "Las fichas deben formar una línea continua (sin huecos)" };
      }
    }
  } else {
    const col = placements[0].col;
    const placedRows = placements.map((p) => p.row).sort((a, b) => a - b);
    const minRow = placedRows[0];
    const maxRow = placedRows[placedRows.length - 1];

    for (let r = minRow; r <= maxRow; r++) {
      const hasPlaced = placedRows.includes(r);
      const hasExisting = board[r][col].tile !== null;
      if (!hasPlaced && !hasExisting) {
        return { valid: false, reason: "Las fichas deben formar una línea continua (sin huecos)" };
      }
    }
  }

  // 3. On first turn: at least one tile must cover center (7, 7)
  if (isFirstTurn) {
    const coversCenter = placements.some((p) => p.row === 7 && p.col === 7);
    if (!coversCenter) {
      return { valid: false, reason: "La primera palabra debe cubrir la casilla central" };
    }
  }

  // 4. On subsequent turns: at least one tile must be adjacent to an existing tile
  if (!isFirstTurn) {
    const isAdjacentToExisting = placements.some((p) => {
      const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1],
      ];
      return directions.some(([dr, dc]) => {
        const nr = p.row + dr;
        const nc = p.col + dc;
        if (nr < 0 || nr >= SCRABBLE_BOARD_SIZE || nc < 0 || nc >= SCRABBLE_BOARD_SIZE) {
          return false;
        }
        return board[nr][nc].tile !== null;
      });
    });

    if (!isAdjacentToExisting) {
      return { valid: false, reason: "La palabra debe conectar con fichas existentes en el tablero" };
    }
  }

  return { valid: true };
}

export function findFormedWords(
  board: ScrabbleBoardCell[][],
  placements: TilePlacement[]
): FormedWord[] {
  const words: FormedWord[] = [];

  // Build a combined view: board tiles + tentative placements
  const placementMap = new Map<string, TilePlacement>();
  for (const p of placements) {
    placementMap.set(`${p.row},${p.col}`, p);
  }

  const getTileAt = (row: number, col: number): ScrabbleTile | null => {
    const key = `${row},${col}`;
    const placement = placementMap.get(key);
    if (placement) return placement.tile;
    if (
      row >= 0 && row < SCRABBLE_BOARD_SIZE &&
      col >= 0 && col < SCRABBLE_BOARD_SIZE
    ) {
      return board[row][col].tile;
    }
    return null;
  };

  const getEffectiveLetter = (tile: ScrabbleTile): string => {
    if (tile.isBlank && tile.assignedLetter) {
      return tile.assignedLetter;
    }
    return tile.letter;
  };

  // Determine the direction of placement
  const rows = new Set(placements.map((p) => p.row));
  const isHorizontal = rows.size === 1;

  // Collect the main word along the primary direction
  const collectWord = (
    startRow: number,
    startCol: number,
    dRow: number,
    dCol: number
  ): FormedWord | null => {
    // Walk backwards to find the start of the word
    let r = startRow;
    let c = startCol;
    while (
      r - dRow >= 0 && r - dRow < SCRABBLE_BOARD_SIZE &&
      c - dCol >= 0 && c - dCol < SCRABBLE_BOARD_SIZE &&
      getTileAt(r - dRow, c - dCol) !== null
    ) {
      r -= dRow;
      c -= dCol;
    }

    // Walk forward collecting tiles
    const wordTiles: TilePlacement[] = [];
    let word = "";
    while (
      r >= 0 && r < SCRABBLE_BOARD_SIZE &&
      c >= 0 && c < SCRABBLE_BOARD_SIZE
    ) {
      const tile = getTileAt(r, c);
      if (!tile) break;

      word += getEffectiveLetter(tile);
      wordTiles.push({ tile, row: r, col: c });
      r += dRow;
      c += dCol;
    }

    if (word.length >= 2) {
      return { word, tiles: wordTiles };
    }
    return null;
  };

  // Find the main word (along the primary direction of placement)
  if (isHorizontal) {
    // Main word is horizontal
    const mainWord = collectWord(placements[0].row, placements[0].col, 0, 1);
    if (mainWord) words.push(mainWord);

    // Check cross-words (vertical) for each newly placed tile
    for (const p of placements) {
      const crossWord = collectWord(p.row, p.col, 1, 0);
      if (crossWord) words.push(crossWord);
    }
  } else {
    // Main word is vertical
    const mainWord = collectWord(placements[0].row, placements[0].col, 1, 0);
    if (mainWord) words.push(mainWord);

    // Check cross-words (horizontal) for each newly placed tile
    for (const p of placements) {
      const crossWord = collectWord(p.row, p.col, 0, 1);
      if (crossWord) words.push(crossWord);
    }
  }

  // Deduplicate words (same word at the same position)
  const seen = new Set<string>();
  return words.filter((w) => {
    const key = `${w.tiles[0].row},${w.tiles[0].col}-${w.word}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Placement rules + formed words + score, without the dictionary check (the client
 * doesn't have the dictionary; the server checks it on submit).
 */
export function evaluateMove(
  board: ScrabbleBoardCell[][],
  placements: TilePlacement[],
  isFirstTurn: boolean
): MoveEvaluation {
  const validation = validatePlacement(board, placements, isFirstTurn);
  if (!validation.valid) return { valid: false, reason: validation.reason ?? "Colocación inválida" };

  const formed = findFormedWords(board, placements);
  if (formed.length === 0) return { valid: false, reason: "No se formó ninguna palabra válida" };

  const words: ScoredWord[] = formed.map((fw) => ({
    word: fw.word,
    score: calculateWordScore(fw.tiles, board),
    tiles: fw.tiles,
  }));
  return { valid: true, words, score: calculateTurnScore(words, placements.length) };
}

/** The first move is the one played on an empty board. */
export function isBoardEmpty(board: ScrabbleBoardCell[][]): boolean {
  return board.every((row) => row.every((cell) => cell.tile === null));
}
