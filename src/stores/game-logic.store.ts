import { create } from "zustand";

interface GameLogicStore {
  currentWord: string;
  selectedPath: [number, number][];
  isSelecting: boolean;
  foundWords: string[];
  message: string;

  setCurrentWord: (word: string | ((prev: string) => string)) => void;
  setSelectedPath: (
    path:
      | [number, number][]
      | ((prev: [number, number][]) => [number, number][])
  ) => void;
  setIsSelecting: (selecting: boolean | ((prev: boolean) => boolean)) => void;
  setFoundWords: (words: string[] | ((prev: string[]) => string[])) => void;
  setMessage: (message: string | ((prev: string) => string)) => void;
}

export const useGameLogicStore = create<GameLogicStore>((set) => ({
  currentWord: "",
  selectedPath: [],
  isSelecting: false,
  foundWords: [],
  message: "",

  setCurrentWord: (word: string | ((prev: string) => string)) =>
    set((state) => ({
      currentWord: typeof word === "function" ? word(state.currentWord) : word,
    })),
  setSelectedPath: (
    path:
      | [number, number][]
      | ((prev: [number, number][]) => [number, number][])
  ) =>
    set((state) => ({
      selectedPath:
        typeof path === "function" ? path(state.selectedPath) : path,
    })),
  setIsSelecting: (selecting: boolean | ((prev: boolean) => boolean)) =>
    set((state) => ({
      isSelecting:
        typeof selecting === "function"
          ? selecting(state.isSelecting)
          : selecting,
    })),
  setFoundWords: (words: string[] | ((prev: string[]) => string[])) =>
    set((state) => ({
      foundWords: typeof words === "function" ? words(state.foundWords) : words,
    })),
  setMessage: (message: string | ((prev: string) => string)) =>
    set((state) => ({
      message: typeof message === "function" ? message(state.message) : message,
    })),
}));
