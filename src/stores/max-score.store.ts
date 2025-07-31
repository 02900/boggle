import { create } from "zustand";
import { socketEmitter } from "@/utils/socket-emitter";

export interface WordData {
  word: string;
  points: number;
  path: [number, number][];
}

export interface MaxScoreData {
  words: WordData[];
  maxScore: number;
  totalWords: number;
}

interface MaxScoreState {
  maxScoreData: MaxScoreData | null;
  isLoading: boolean;
  setMaxScoreData: (data: MaxScoreData | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  requestMaxScore: () => void;
  resetMaxScore: () => void;
}

export const useMaxScoreStore = create<MaxScoreState>((set) => ({
  maxScoreData: null,
  isLoading: false,
  setMaxScoreData: (data) => set({ maxScoreData: data }),
  setIsLoading: (isLoading) => set({ isLoading }),
  requestMaxScore: () => {
    set({ maxScoreData: null, isLoading: true });
    socketEmitter.emitGetMaxScore();
  },
  resetMaxScore: () => {
    set({ maxScoreData: null, isLoading: false });
  },
}));
