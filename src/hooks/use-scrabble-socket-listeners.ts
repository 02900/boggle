"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import type { ScrabbleGameState, ScrabbleTile } from "@/interfaces/scrabble";
import type { WordResult } from "@/interfaces/game";

export const useScrabbleSocketListeners = () => {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const store = useScrabbleGameStore.getState();
    const newSocket = io({ query: { game: "scrabble" } });
    store.setSocket(newSocket);

    newSocket.on("connect", () => {
      useScrabbleGameStore.getState().setIsConnected(true);
      if (newSocket.id) {
        useScrabbleGameStore.getState().setCurrentPlayerId(newSocket.id);
      }
    });

    newSocket.on("disconnect", () => {
      useScrabbleGameStore.getState().setIsConnected(false);
    });

    newSocket.on("join-confirmed", (data: { playerId: string; playerName: string }) => {
      const s = useScrabbleGameStore.getState();
      s.setCurrentPlayerId(data.playerId);
      s.setIsJoined(true);
      s.setPlayerName(data.playerName);
      if (typeof window !== "undefined") {
        localStorage.setItem("scrabble-player-name", data.playerName);
      }
    });

    newSocket.on("game-state", (state: ScrabbleGameState & { rack?: ScrabbleTile[] }) => {
      useScrabbleGameStore.getState().setGameState(state);
      if (state.rack) {
        useScrabbleGameStore.getState().setRack(state.rack);
      }
    });

    newSocket.on("game-started", (state: ScrabbleGameState) => {
      const s = useScrabbleGameStore.getState();
      s.setGameState(state);
      s.clearTentativePlacements();
      s.setMessage("Juego iniciado");
    });

    newSocket.on("word-result", (result: WordResult) => {
      const s = useScrabbleGameStore.getState();
      if (result.valid) {
        s.setMessage(result.points ? `+${result.points} puntos` : "Turno válido");
        s.clearTentativePlacements();
      } else {
        s.setMessage(result.reason ?? "Error");
      }
    });

    newSocket.on("game-reset", (state: ScrabbleGameState) => {
      const s = useScrabbleGameStore.getState();
      s.setGameState(state);
      s.clearTentativePlacements();
      s.setMessage("Juego reiniciado");
    });

    newSocket.on("game-ended", (state: ScrabbleGameState) => {
      const s = useScrabbleGameStore.getState();
      s.setGameState(state);
      s.setMessage("Juego terminado");
    });

    newSocket.on("turn-timer-update" as any, (timeLeft: number) => {
      useScrabbleGameStore.getState().setGameState((prev) =>
        prev ? { ...prev, turnTimeLeft: timeLeft } : prev
      );
    });

    // Scrabble-specific events
    newSocket.on("rejoin-success" as any, (state: ScrabbleGameState & { rack?: ScrabbleTile[]; gameId?: string }) => {
      const s = useScrabbleGameStore.getState();
      s.setGameState(state);
      if (state.rack) {
        s.setRack(state.rack);
      }
      if (state.gameId) {
        s.setGameId(state.gameId);
      }
      s.setIsJoined(true);
      s.setMessage("Reconectado al juego");
    });

    newSocket.on("rejoin-failed" as any, (data: { reason: string }) => {
      const s = useScrabbleGameStore.getState();
      s.setMessage(data.reason);
      s.setGameId(null);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);
};
