import type { Server as SocketIOServer, Socket as SocketIOSocket } from "socket.io";
import type { Player, DiceRoll, GameEvents, ClientEvents, ScoreboardEntry, MaxScoreData } from "./game";

// Re-export types that also live in game.ts
export type { ScoreboardEntry, MaxScoreData };

// ---- Socket.IO Typed Server & Socket ----
export type TypedServer = SocketIOServer<ClientEvents, GameEvents>;
export type TypedSocket = SocketIOSocket<ClientEvents, GameEvents>;

// ---- Board ----
export type Board = string[][];
export type DieFaces = string[];
export type DiceConfiguration = DieFaces[];

// ---- Streak Tracker ----
export interface StreakData {
  wins: number;
  lastWinTime: number;
  sessionStartTime: number;
}

export interface SessionStats {
  totalActivePlayers: number;
  players: Array<{
    name: string;
    wins: number;
    sessionDuration: number;
  }>;
}

// ---- BoggleGame internal types ----
export interface PlayerData extends Player {
  eliminatedWords: string[];
  isConnected: boolean;
  joinedAt: number;
  disconnectedAt?: number;
}

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
