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
  /** False while the player is in the reconnection grace period. */
  isConnected: boolean;
  /** Seconds spent on this player's completed turns, overtime included. */
  timeUsed: number;
  /** Seconds spent past the turn limit, summed over the game. */
  overtime: number;
}

// ---- Scrabble turn/game lifecycle events ----

/**
 * Why a turn ended. "timeout" (another player skipped it once the clock ran out)
 * and "disconnect" are forced passes.
 */
export type TurnEndReason = "place" | "pass" | "exchange" | "timeout" | "disconnect";

export type GameEndReason = "passes" | "bag-empty" | "abandon";

export interface TurnPlayedEvent {
  playerId: string;
  playerName: string;
  type: TurnEndReason;
  /** Only for type "place" */
  words?: ScoredWord[];
  score?: number;
  /** Only for type "exchange" */
  exchangedCount?: number;
  /** Only for type "timeout": who skipped the turn */
  skippedByName?: string;
}

export interface TurnChangedEvent {
  previousPlayerId: string | null;
  currentPlayerId: string | null;
  currentPlayerName: string | null;
  /** "start" announces the (randomly chosen) first player of a new game. */
  reason: TurnEndReason | "start";
}

export interface FinalAdjustment {
  playerId: string;
  playerName: string;
  remainingTiles: number;
  remainingValue: number;
  /** Points added (positive) or deducted (negative) at game end */
  delta: number;
  finalScore: number;
}

export interface GameEndedEvent extends ScrabbleGameState {
  reason: GameEndReason;
  finalAdjustments: FinalAdjustment[];
}

export interface PlayerDisconnectedEvent {
  playerId: string;
  playerName: string;
  graceSeconds: number;
}

export interface ScrabbleGameState {
  board: ScrabbleBoardCell[][];
  players: ScrabblePlayer[];
  gameState: GameStatus;
  currentTurnPlayerId: string | null;
  /** Negative once the turn is in overtime (the clock keeps running). */
  turnTimeLeft: number;
  tileBagCount: number;
  consecutivePasses: number;
  moveHistory?: MoveRecord[];
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
    timeUsed?: number;
    overtime?: number;
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

/** Private per-player view: includes the rack and the player's own tentative placements. */
export interface ScrabblePlayerGameState extends ScrabbleGameState {
  rack: ScrabbleTile[];
  tentativePlacements: TilePlacement[];
}

export interface ScrabbleGameEvents {
  "game-state": (state: ScrabbleGameState | ScrabblePlayerGameState) => void;
  "game-started": (state: ScrabbleGameState & { gameId?: string }) => void;
  "start-failed": (data: { reason: string }) => void;
  "join-failed": (data: { reason: string }) => void;
  "game-ended": (state: GameEndedEvent) => void;
  "game-reset": (state: ScrabbleGameState) => void;
  "word-result": (result: WordResult) => void;
  "turn-played": (data: TurnPlayedEvent) => void;
  "turn-changed": (data: TurnChangedEvent) => void;
  "join-confirmed": (data: { playerName: string; playerId: string }) => void;
  "player-joined": (data: { playerName: string; playerId: string }) => void;
  "player-left": (playerId: string) => void;
  "player-disconnected": (data: PlayerDisconnectedEvent) => void;
  "player-reconnected": (data: { playerId: string; playerName: string }) => void;
  "scoreboard-data": (data: ScoreboardEntry[]) => void;
  "client-side-validation-changed": (data: { enabled: boolean }) => void;
  "turn-timer-update": (timeLeft: number) => void;
  "rejoin-success": (state: ScrabblePlayerGameState & { gameId?: string }) => void;
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
  /** Return one tentative tile (clicked on the board) to the rack. */
  "recall-tile": (data: { tileId: string }) => void;
  "submit-turn": () => void;
  "pass-turn": () => void;
  "exchange-tiles": (data: { tileIds: string[] }) => void;
  /** Skip the current player's turn; only allowed for another player once the clock is negative. */
  "skip-turn": () => void;
  "rejoin-game": (data: { playerName: string; gameId: string }) => void;
  /** Leave on purpose (back to the menu): removed at once, no grace period. */
  "leave-game": () => void;
}
