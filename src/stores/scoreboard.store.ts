import { create } from "zustand";
import { socketEmitter } from "@/utils/socket-emitter";

export interface ScoreEntry {
  name: string;
  score: number;
  date: string;
  playerCount: number;
}

interface ScoreboardState {
  scoreboard: ScoreEntry[];
  isLoading: boolean;
  setScoreboard: (scoreboard: ScoreEntry[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  requestScoreboard: () => void;
}

export const useScoreboardStore = create<ScoreboardState>((set) => ({
  scoreboard: [],
  isLoading: false,
  setScoreboard: (scoreboard) => set({ scoreboard }),
  setIsLoading: (isLoading) => set({ isLoading }),
  requestScoreboard: () => {
    set({ isLoading: true });
    socketEmitter.emitGetScoreboard();
  },
}));
