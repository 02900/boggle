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
  isFirstTurn: boolean;
}

// ---- Scrabble socket events ----

import type { WordResult, ScoreboardEntry } from "./game";

export interface ScrabbleGameEvents {
  "game-state": (state: ScrabbleGameState & { rack?: ScrabbleTile[] }) => void;
  "game-started": (state: ScrabbleGameState) => void;
  "game-ended": (state: ScrabbleGameState) => void;
  "game-reset": (state: ScrabbleGameState) => void;
  "word-result": (result: WordResult) => void;
  "join-confirmed": (data: { playerName: string; playerId: string }) => void;
  "player-joined": (data: { playerName: string; playerId: string }) => void;
  "player-left": (playerId: string) => void;
  "scoreboard-data": (data: ScoreboardEntry[]) => void;
  "client-side-validation-changed": (data: { enabled: boolean }) => void;
  "turn-timer-update": (timeLeft: number) => void;
  "rejoin-success": (state: ScrabbleGameState & { rack: ScrabbleTile[]; gameId?: string }) => void;
  "rejoin-failed": (data: { reason: string }) => void;
}

export interface ScrabbleClientEvents {
  "join-game": (playerName: string) => void;
  "start-game": () => void;
  "reset-game": () => void;
  "toggle-client-side-validation": (enabled: boolean) => void;
  "get-scoreboard": () => void;
  "place-tiles": (data: { placements: TilePlacement[] }) => void;
  "recall-tiles": () => void;
  "submit-turn": () => void;
  "pass-turn": () => void;
  "exchange-tiles": (data: { tileIds: string[] }) => void;
  "rejoin-game": (data: { playerName: string; gameId: string }) => void;
}
