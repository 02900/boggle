// ---- Shared types (used by all games) ----

export interface Player {
  id: string;
  name: string;
  score: number;
  wordsFound: string[];
  eliminatedWords?: string[];
  isConnected?: boolean;
  joinedAt?: number;
  disconnectedAt?: number;
}

export type GameStatus = "waiting" | "playing" | "finished";

export interface WordResult {
  valid: boolean;
  reason?: string;
  points?: number;
  word?: string;
}

export interface ScoreboardEntry {
  name: string;
  score: number;
  date: string;
  playerCount: number;
}

// ---- Re-exports from boggle.ts for backward compatibility ----
// Existing client code imports these from "@/interfaces/game"

export type { DiceRoll, BoardCell, WordPath, BoggleGameState, MaxScoreData } from "./boggle";

// Backward-compat alias: GameState = BoggleGameState
export type { BoggleGameState as GameState } from "./boggle";

// ---- Socket event maps (currently Boggle-only, will be split per game later) ----

import type { DiceRoll, BoggleGameState, MaxScoreData } from "./boggle";

export interface GameEvents {
  "game-state": (state: BoggleGameState) => void;
  "game-started": (state: BoggleGameState) => void;
  "dice-rolling": (diceRolls: DiceRoll[]) => void;
  "timer-update": (timeLeft: number) => void;
  "game-ended": (state: BoggleGameState) => void;
  "word-result": (result: WordResult) => void;
  "player-joined": (data: { playerName: string; playerId: string }) => void;
  "player-left": (playerId: string) => void;
  "player-scored": (data: { playerId: string; word: string; points: number }) => void;
  "game-reset": (state: BoggleGameState) => void;
  "eliminate-common-words-changed": (data: { enabled: boolean; eliminateCommonWords: boolean }) => void;
  "client-side-validation-changed": (data: { enabled: boolean }) => void;
  "words-revalidated": (data: { totalWordsRemoved: number; affectedPlayers: number; summary: string }) => void;
  "join-confirmed": (data: { playerName: string; playerId: string }) => void;
  "board-rotated": (data: { board: string[][]; cooldownTime: number; rotationVersion: number }) => void;
  "rotation-error": (data: { message: string }) => void;
  "scoreboard-data": (data: ScoreboardEntry[]) => void;
  "max-score-data": (data: MaxScoreData) => void;
}

export interface ClientEvents {
  "join-game": (playerName: string) => void;
  "start-game": () => void;
  "submit-word": (data: { word: string; path: [number, number][]; rotationVersion: number }) => void;
  "reset-game": () => void;
  "toggle-eliminate-common-words": (enabled: boolean) => void;
  "toggle-client-side-validation": (enabled: boolean) => void;
  "rotate-board": () => void;
  "get-scoreboard": () => void;
  "get-max-score": () => void;
}
