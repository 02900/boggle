import { create } from "zustand";
import type { Socket } from "socket.io-client";
import type {
  ScrabbleGameState,
  ScrabbleTile,
  TilePlacement,
} from "@/interfaces/scrabble";

type GameStateUpdater =
  | ScrabbleGameState
  | ((prev: ScrabbleGameState | null) => ScrabbleGameState | null);

interface ScrabbleGameStore {
  // Connection
  socket: Socket | null;
  isConnected: boolean;
  currentPlayerId: string | null;
  isJoined: boolean;

  // Game state from server
  gameState: ScrabbleGameState | null;
  rack: ScrabbleTile[];

  // Client-side interaction state
  selectedTile: ScrabbleTile | null;
  tentativePlacements: TilePlacement[];
  message: string;

  // Session
  gameId: string | null;
  playerName: string | null;

  // Setters
  setSocket: (socket: Socket) => void;
  setIsConnected: (isConnected: boolean) => void;
  setCurrentPlayerId: (id: string | null) => void;
  setIsJoined: (isJoined: boolean) => void;
  setGameState: (stateOrUpdater: GameStateUpdater) => void;
  setRack: (rack: ScrabbleTile[]) => void;
  setSelectedTile: (tile: ScrabbleTile | null) => void;
  addTentativePlacement: (placement: TilePlacement) => void;
  removeTentativePlacement: (tileId: string) => void;
  clearTentativePlacements: () => void;
  setMessage: (message: string) => void;
  setGameId: (gameId: string | null) => void;
  setPlayerName: (name: string | null) => void;
  reset: () => void;
}

const initialState = {
  socket: null as Socket | null,
  isConnected: false,
  currentPlayerId: null as string | null,
  isJoined: false,
  gameState: null as ScrabbleGameState | null,
  rack: [] as ScrabbleTile[],
  selectedTile: null as ScrabbleTile | null,
  tentativePlacements: [] as TilePlacement[],
  message: "",
  gameId: null as string | null,
  playerName: null as string | null,
};

export const useScrabbleGameStore = create<ScrabbleGameStore>((set) => ({
  ...initialState,

  setSocket: (socket) => set({ socket }),
  setIsConnected: (isConnected) => set({ isConnected }),
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
  clearTentativePlacements: () => set({ tentativePlacements: [] }),
  setMessage: (message) => set({ message }),
  setGameId: (gameId) => set({ gameId }),
  setPlayerName: (playerName) => set({ playerName }),
  reset: () => set(initialState),
}));
