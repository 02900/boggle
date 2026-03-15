import type { Server as SocketIOServer, Socket as SocketIOSocket } from "socket.io";
import type { Player, GameEvents, ClientEvents, ScoreboardEntry, MaxScoreData } from "./game";
import type { ScrabbleGameEvents, ScrabbleClientEvents } from "./scrabble";

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

// Boggle-specific
export type BoggleTypedServer = SocketIOServer<ClientEvents, GameEvents>;
export type BoggleTypedSocket = SocketIOSocket<ClientEvents, GameEvents>;

// Scrabble-specific
export type ScrabbleTypedServer = SocketIOServer<ScrabbleClientEvents, ScrabbleGameEvents>;
export type ScrabbleTypedSocket = SocketIOSocket<ScrabbleClientEvents, ScrabbleGameEvents>;

// Union (orchestrator + shared handlers — accepts all events)
export type TypedServer = SocketIOServer<ClientEvents & ScrabbleClientEvents, GameEvents & ScrabbleGameEvents>;
export type TypedSocket = SocketIOSocket<ClientEvents & ScrabbleClientEvents, GameEvents & ScrabbleGameEvents>;

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
