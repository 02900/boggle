import { Socket } from "socket.io-client";
import { create } from "zustand";
import { DiceRoll } from "@/interfaces/game";

interface SocketsStore {
  socket: Socket | null;
  isConnected: boolean;
  diceRolling: DiceRoll[] | null;
  eliminateCommonWords: boolean;
  setSocket: (socket: Socket) => void;
  setIsConnected: (isConnected: boolean) => void;
  setDiceRolling: (diceRolling: DiceRoll[] | null) => void;
  setEliminateCommonWords: (eliminateCommonWords: boolean) => void;
}

export const useSocketsStore = create<SocketsStore>((set) => ({
  socket: null,
  isConnected: false,
  diceRolling: null,
  eliminateCommonWords: true, // Cambiar a true para coincidir con el servidor por defecto
  setSocket: (socket: Socket) => set({ socket }),
  setIsConnected: (isConnected: boolean) => set({ isConnected }),
  setDiceRolling: (diceRolling: DiceRoll[] | null) => set({ diceRolling }),
  setEliminateCommonWords: (eliminateCommonWords: boolean) => set({ eliminateCommonWords }),
}));
