import type { Player, GameStatus } from "./game";

// ---- Scrabble tile types ----

export interface ScrabbleTile {
  id: string;
  letter: string;
  value: number;
  isBlank: boolean;
  assignedLetter?: string;
}

export type MultiplierType = "TW" | "DW" | "TL" | "DL" | "CENTER" | "NONE";

export interface ScrabbleBoardCell {
  row: number;
  col: number;
  multiplier: MultiplierType;
  tile: ScrabbleTile | null;
}

// ---- Scrabble game state ----

export interface ScrabblePlayer extends Player {
  rackSize: number;
  rack?: ScrabbleTile[];
  isCurrentTurn: boolean;
}

export interface ScrabbleGameState {
  board: ScrabbleBoardCell[][];
  players: ScrabblePlayer[];
  gameState: GameStatus;
  currentTurnPlayerId: string | null;
  turnTimeLeft: number;
  tileBagCount: number;
  consecutivePasses: number;
}

// ---- Scrabble turn types ----

export interface TilePlacement {
  tile: ScrabbleTile;
  row: number;
  col: number;
}

export interface ScoredWord {
  word: string;
  score: number;
  tiles: TilePlacement[];
}

export interface ScrabbleTurnResult {
  valid: boolean;
  reason?: string;
  score?: number;
  words?: ScoredWord[];
}

// ---- Scrabble move history ----

export interface MoveRecord {
  playerName: string;
  type: "place" | "pass" | "exchange";
  tiles?: TilePlacement[];
  words?: ScoredWord[];
  score: number;
}

// ---- Scrabble session persistence ----

export interface SerializedScrabbleGame {
  gameId: string;
  createdAt: string;
  lastUpdatedAt: string;
  board: ScrabbleBoardCell[][];
  tileBag: ScrabbleTile[];
  players: Array<{
    name: string;
    score: number;
    rack: ScrabbleTile[];
    wordsFound: string[];
  }>;
  currentTurnPlayerName: string | null;
  turnTimeLeft: number;
  consecutivePasses: number;
  gameState: GameStatus;
  moveHistory: MoveRecord[];
}
