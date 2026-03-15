import type { Server as SocketIOServer, Socket as SocketIOSocket } from "socket.io";
import type { Player, GameEvents, ClientEvents, ScoreboardEntry, MaxScoreData } from "./game";

// Re-export shared types from game.ts
export type { ScoreboardEntry, MaxScoreData };

// Re-export Boggle-specific types from boggle.ts for backward compatibility
export type {
  DiceConfiguration,
  DieFaces,
  StartGameResult,
  RotateBoardResult,
  RevalidationResult,
} from "./boggle";

// ---- Socket.IO Typed Server & Socket ----
export type TypedServer = SocketIOServer<ClientEvents, GameEvents>;
export type TypedSocket = SocketIOSocket<ClientEvents, GameEvents>;

// ---- Shared types ----
export type Board = string[][];

export interface PlayerData extends Player {
  eliminatedWords: string[];
  isConnected: boolean;
  joinedAt: number;
  disconnectedAt?: number;
}

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
