import { create } from "zustand";
import { GameState } from "@/interfaces/game";

interface BoggleGameMainStore {
  gameState: GameState;
  setGameState: (
    gameState: GameState | ((prev: GameState) => GameState)
  ) => void;

  rotationCooldown: number;
  rotationMessage: string;

  setRotationCooldown: (
    rotationCooldown: number | ((prev: number) => number)
  ) => void;
  setRotationMessage: (
    rotationMessage: string | ((prev: string) => string)
  ) => void;

  highlightedPath: [number, number][];
  setHighlightedPath: (
    highlightedPath:
      | [number, number][]
      | ((prev: [number, number][]) => [number, number][])
  ) => void;

  highlightedErrorPath: [number, number][];
  setHighlightedErrorPath: (
    highlightedErrorPath:
      | [number, number][]
      | ((prev: [number, number][]) => [number, number][])
  ) => void;

  highlightedSkipPath: [number, number][];
  setHighlightedSkipPath: (
    highlightedSkipPath:
      | [number, number][]
      | ((prev: [number, number][]) => [number, number][])
  ) => void;

  currentPlayerId: string | null;
  setCurrentPlayerId: (
    currentPlayerId: string | null | ((prev: string | null) => string | null)
  ) => void;

  isJoined: boolean;
  setIsJoined: (isJoined: boolean | ((prev: boolean) => boolean)) => void;
}

export const useBoggleGameMainStore = create<BoggleGameMainStore>((set) => ({
  gameState: {
    board: [],
    players: [],
    gameState: "waiting",
    timeLeft: 180,
    diceRolls: [],
    rotationVersion: 0,
    clientSideValidation: true,
  },
  setGameState: (gameState: GameState | ((prev: GameState) => GameState)) =>
    set((state) => ({
      gameState:
        typeof gameState === "function"
          ? gameState(state.gameState)
          : gameState,
    })),
  rotationCooldown: 0,
  rotationMessage: "",
  setRotationCooldown: (
    rotationCooldown: number | ((prev: number) => number)
  ) =>
    set((state) => ({
      rotationCooldown:
        typeof rotationCooldown === "function"
          ? rotationCooldown(state.rotationCooldown)
          : rotationCooldown,
    })),
  setRotationMessage: (rotationMessage: string | ((prev: string) => string)) =>
    set((state) => ({
      rotationMessage:
        typeof rotationMessage === "function"
          ? rotationMessage(state.rotationMessage)
          : rotationMessage,
    })),

  highlightedPath: [],
  setHighlightedPath: (
    highlightedPath:
      | [number, number][]
      | ((prev: [number, number][]) => [number, number][])
  ) =>
    set((state) => ({
      highlightedPath:
        typeof highlightedPath === "function"
          ? highlightedPath(state.highlightedPath)
          : highlightedPath,
    })),

  highlightedErrorPath: [],
  setHighlightedErrorPath: (
    highlightedErrorPath:
      | [number, number][]
      | ((prev: [number, number][]) => [number, number][])
  ) =>
    set((state) => ({
      highlightedErrorPath:
        typeof highlightedErrorPath === "function"
          ? highlightedErrorPath(state.highlightedErrorPath)
          : highlightedErrorPath,
    })),

  highlightedSkipPath: [],
  setHighlightedSkipPath: (
    highlightedSkipPath:
      | [number, number][]
      | ((prev: [number, number][]) => [number, number][])
  ) =>
    set((state) => ({
      highlightedSkipPath:
        typeof highlightedSkipPath === "function"
          ? highlightedSkipPath(state.highlightedSkipPath)
          : highlightedSkipPath,
    })),

  currentPlayerId: null,
  setCurrentPlayerId: (
    currentPlayerId: string | null | ((prev: string | null) => string | null)
  ) =>
    set((state) => ({
      currentPlayerId:
        typeof currentPlayerId === "function"
          ? currentPlayerId(state.currentPlayerId)
          : currentPlayerId,
    })),

  isJoined: false,
  setIsJoined: (isJoined: boolean | ((prev: boolean) => boolean)) =>
    set((state) => ({
      isJoined:
        typeof isJoined === "function" ? isJoined(state.isJoined) : isJoined,
    })),
}));
