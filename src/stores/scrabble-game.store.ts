import { create } from "zustand";
import type { Socket } from "socket.io-client";
import { moveTile, orderRack, shuffleIds } from "@/utils/rack-order";
import type {
  ScrabbleGameState,
  ScrabbleTile,
  TilePlacement,
  GameEndReason,
  FinalAdjustment,
} from "@/interfaces/scrabble";
import type { ScoreboardEntry } from "@/interfaces/game";

type GameStateUpdater =
  | ScrabbleGameState
  | ((prev: ScrabbleGameState | null) => ScrabbleGameState | null);

export type ConnectionStatus = "connecting" | "connected" | "reconnecting";

export type NotificationKind = "success" | "error" | "info" | "turn";

export interface Notification {
  id: number;
  kind: NotificationKind;
  text: string;
  /** ms until auto-dismiss; 0 = sticky */
  ttl: number;
}

export interface DisconnectedPlayer {
  playerName: string;
  /** Epoch ms when the server will drop the player if they don't come back */
  graceEndsAt: number;
}

export interface GameEndSummary {
  reason: GameEndReason;
  finalAdjustments: FinalAdjustment[];
}

/**
 * Stable empty fallbacks for selectors: `s.gameState?.players ?? []` would return a
 * new array on every read and re-render the component on every store change.
 */
export const NO_PLAYERS: ScrabbleGameState["players"] = [];
export const NO_MOVES: NonNullable<ScrabbleGameState["moveHistory"]> = [];

/** Oldest notifications are dropped beyond this many visible at once. */
const MAX_NOTIFICATIONS = 4;

const DEFAULT_TTL: Record<NotificationKind, number> = {
  success: 4000,
  error: 5000,
  info: 4000,
  turn: 3000,
};

interface ScrabbleGameStore {
  // Connection
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  currentPlayerId: string | null;
  isJoined: boolean;

  // Game state from server
  gameState: ScrabbleGameState | null;
  rack: ScrabbleTile[];
  disconnectedPlayers: Record<string, DisconnectedPlayer>;
  gameEndSummary: GameEndSummary | null;
  /** Scrabble's leaderboard; null until requested data arrives */
  scoreboard: ScoreboardEntry[] | null;

  // Client-side interaction state
  selectedTile: ScrabbleTile | null;
  tentativePlacements: TilePlacement[];
  /** Player's preferred rack order (tile ids); see utils/rack-order */
  rackOrder: string[];
  notifications: Notification[];

  // Transient visual cues (set by socket events, cleared by timeout)
  /** "row,col" keys of the tiles just confirmed by the last play, for a highlight flash */
  lastPlayedCells: string[];
  /** Timestamp of the last rejected submission, to trigger a shake */
  invalidMoveAt: number | null;

  // Exchange mode
  exchangeMode: boolean;
  selectedForExchange: Set<string>;

  // Session
  gameId: string | null;
  playerName: string | null;

  // Setters
  setSocket: (socket: Socket) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setCurrentPlayerId: (id: string | null) => void;
  setIsJoined: (isJoined: boolean) => void;
  setGameState: (stateOrUpdater: GameStateUpdater) => void;
  setRack: (rack: ScrabbleTile[]) => void;
  setSelectedTile: (tile: ScrabbleTile | null) => void;
  addTentativePlacement: (placement: TilePlacement) => void;
  removeTentativePlacement: (tileId: string) => void;
  setTentativePlacements: (placements: TilePlacement[]) => void;
  clearTentativePlacements: () => void;
  shuffleRack: () => void;
  /** Drag & drop: put `tileId` where `targetId` is (null = at the end). */
  moveRackTile: (tileId: string, targetId: string | null) => void;
  notify: (kind: NotificationKind, text: string, ttl?: number) => number;
  dismissNotification: (id: number) => void;
  setLastPlayedCells: (cells: string[]) => void;
  setInvalidMoveAt: (at: number | null) => void;
  markPlayerDisconnected: (playerId: string, playerName: string, graceSeconds: number) => void;
  markPlayerReconnected: (playerName: string) => void;
  clearDisconnectedPlayers: () => void;
  setGameEndSummary: (summary: GameEndSummary | null) => void;
  setScoreboard: (scoreboard: ScoreboardEntry[] | null) => void;
  setExchangeMode: (mode: boolean) => void;
  toggleExchangeSelection: (tileId: string) => void;
  clearExchangeSelection: () => void;
  setGameId: (gameId: string | null) => void;
  setPlayerName: (name: string | null) => void;
  reset: () => void;
}

const initialState = {
  socket: null as Socket | null,
  isConnected: false,
  connectionStatus: "connecting" as ConnectionStatus,
  currentPlayerId: null as string | null,
  isJoined: false,
  gameState: null as ScrabbleGameState | null,
  rack: [] as ScrabbleTile[],
  disconnectedPlayers: {} as Record<string, DisconnectedPlayer>,
  gameEndSummary: null as GameEndSummary | null,
  scoreboard: null as ScoreboardEntry[] | null,
  selectedTile: null as ScrabbleTile | null,
  tentativePlacements: [] as TilePlacement[],
  rackOrder: [] as string[],
  notifications: [] as Notification[],
  lastPlayedCells: [] as string[],
  invalidMoveAt: null as number | null,
  exchangeMode: false,
  selectedForExchange: new Set<string>(),
  gameId: null as string | null,
  playerName: null as string | null,
};

let nextNotificationId = 1;

export const useScrabbleGameStore = create<ScrabbleGameStore>((set) => ({
  ...initialState,

  setSocket: (socket) => set({ socket }),
  setConnectionStatus: (connectionStatus) =>
    set({ connectionStatus, isConnected: connectionStatus === "connected" }),
  setCurrentPlayerId: (currentPlayerId) => set({ currentPlayerId }),
  setIsJoined: (isJoined) => set({ isJoined }),
  setGameState: (stateOrUpdater) =>
    set((store) => ({
      gameState:
        typeof stateOrUpdater === "function"
          ? stateOrUpdater(store.gameState)
          : stateOrUpdater,
    })),
  setRack: (rack) => set({ rack }),
  setSelectedTile: (selectedTile) => set({ selectedTile }),
  addTentativePlacement: (placement) =>
    set((state) => ({
      tentativePlacements: [...state.tentativePlacements, placement],
    })),
  removeTentativePlacement: (tileId) =>
    set((state) => ({
      tentativePlacements: state.tentativePlacements.filter(
        (p) => p.tile.id !== tileId
      ),
    })),
  setTentativePlacements: (tentativePlacements) => set({ tentativePlacements }),
  clearTentativePlacements: () => set({ tentativePlacements: [] }),
  shuffleRack: () =>
    set((state) => ({ rackOrder: shuffleIds(orderRack(state.rack, state.rackOrder).map((t) => t.id)) })),
  moveRackTile: (tileId, targetId) =>
    set((state) => ({
      rackOrder: moveTile(orderRack(state.rack, state.rackOrder).map((t) => t.id), tileId, targetId),
    })),
  notify: (kind, text, ttl = DEFAULT_TTL[kind]) => {
    const id = nextNotificationId++;
    set((state) => ({
      notifications: [...state.notifications, { id, kind, text, ttl }].slice(-MAX_NOTIFICATIONS),
    }));
    return id;
  },
  dismissNotification: (id) =>
    set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),
  setLastPlayedCells: (lastPlayedCells) => set({ lastPlayedCells }),
  setInvalidMoveAt: (invalidMoveAt) => set({ invalidMoveAt }),
  markPlayerDisconnected: (playerId, playerName, graceSeconds) =>
    set((state) => ({
      disconnectedPlayers: {
        ...state.disconnectedPlayers,
        [playerId]: { playerName, graceEndsAt: Date.now() + graceSeconds * 1000 },
      },
    })),
  markPlayerReconnected: (playerName) =>
    set((state) => ({
      disconnectedPlayers: Object.fromEntries(
        Object.entries(state.disconnectedPlayers).filter(([, p]) => p.playerName !== playerName)
      ),
    })),
  clearDisconnectedPlayers: () => set({ disconnectedPlayers: {} }),
  setGameEndSummary: (gameEndSummary) => set({ gameEndSummary }),
  setScoreboard: (scoreboard) => set({ scoreboard }),
  setExchangeMode: (exchangeMode) =>
    set({ exchangeMode, selectedForExchange: new Set<string>() }),
  toggleExchangeSelection: (tileId) =>
    set((state) => {
      const next = new Set(state.selectedForExchange);
      if (next.has(tileId)) {
        next.delete(tileId);
      } else {
        next.add(tileId);
      }
      return { selectedForExchange: next };
    }),
  clearExchangeSelection: () => set({ selectedForExchange: new Set<string>() }),
  setGameId: (gameId) => set({ gameId }),
  setPlayerName: (playerName) => set({ playerName }),
  reset: () => set(initialState),
}));
