import type { Player } from "./game";

// ---- Boggle-specific data types ----

export interface MaxScoreData {
  words: Array<{
    word: string;
    path: [number, number][];
    points: number;
  }>;
  maxScore: number;
  totalWords: number;
}

export interface DiceRoll {
  diceNumber: number;
  position: { row: number; col: number };
  faces: string[];
  rolledFace: number;
  letter: string;
}

export interface BoardCell {
  letter: string;
  row: number;
  col: number;
  isSelected: boolean;
}

export interface WordPath {
  cells: [number, number][];
  word: string;
}

// ---- Boggle game state ----

export interface BoggleGameState {
  board: string[][];
  players: Player[];
  gameState: "waiting" | "playing" | "finished";
  timeLeft: number;
  diceRolls?: DiceRoll[];
  allParticipants?: Player[];
  playerStreaks?: Record<string, number>;
  rotationVersion: number;
  clientSideValidation?: boolean;
}

// ---- Boggle server types ----

export type DieFaces = string[];
export type DiceConfiguration = DieFaces[];

export interface StartGameResult {
  success: true;
  diceRolls: DiceRoll[];
}

export interface RotateBoardResult {
  success: boolean;
  reason?: string;
  cooldownTime?: number;
  rotationVersion?: number;
}

export interface RevalidationResult {
  playerName: string;
  originalWords: number;
  validWords: number;
  invalidWords: number;
  wordsRemoved: number;
  oldScore: number;
  newScore: number;
  scoreChange: number;
  removedWords: Array<{ word: string; reason: string }>;
}
