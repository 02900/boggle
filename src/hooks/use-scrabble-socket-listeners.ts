"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import type { ScrabbleGameEvents, ScrabbleClientEvents } from "@/interfaces/scrabble";

type ScrabbleSocket = Socket<ScrabbleGameEvents, ScrabbleClientEvents>;

export const useScrabbleSocketListeners = () => {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const store = useScrabbleGameStore.getState();
    const newSocket: ScrabbleSocket = io({ query: { game: "scrabble" } });
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

    newSocket.on("join-confirmed", (data) => {
      const s = useScrabbleGameStore.getState();
      s.setCurrentPlayerId(data.playerId);
      s.setIsJoined(true);
      s.setPlayerName(data.playerName);
      if (typeof window !== "undefined") {
        localStorage.setItem("scrabble-player-name", data.playerName);
      }
    });

    newSocket.on("player-joined", ({ playerId, playerName }) => {
      const s = useScrabbleGameStore.getState();
      s.setGameState((prev) => {
        if (!prev) return prev;
        if (prev.players.some((p) => p.id === playerId || p.name === playerName)) return prev;
        return {
          ...prev,
          players: [
            ...prev.players,
            { id: playerId, name: playerName, score: 0, rackSize: 0, isCurrentTurn: false, wordsFound: [] },
          ],
        };
      });
    });

    newSocket.on("player-left", (playerId) => {
      const s = useScrabbleGameStore.getState();
      s.setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.filter((p) => p.id !== playerId),
        };
      });
    });

    newSocket.on("game-state", (state) => {
      const s = useScrabbleGameStore.getState();
      s.setGameState(state);
      if (state.rack) {
        s.setRack(state.rack);
      }
      // Clear exchange mode when server state updates (e.g. turn changed via auto-pass)
      if (s.exchangeMode) {
        s.setExchangeMode(false);
      }
    });

    newSocket.on("game-started", (state) => {
      const s = useScrabbleGameStore.getState();
      s.setGameState(state);
      s.clearTentativePlacements();
      s.setMessage("Juego iniciado");
      if (typeof window !== "undefined" && s.gameId && s.playerName) {
        localStorage.setItem("scrabble-session", JSON.stringify({ gameId: s.gameId, playerName: s.playerName }));
      }
    });

    newSocket.on("word-result", (result) => {
      const s = useScrabbleGameStore.getState();
      if (result.valid) {
        s.setMessage(result.points ? `+${result.points} puntos` : "Turno válido");
        s.clearTentativePlacements();
      } else {
        s.setMessage(result.reason ?? "Error");
      }
    });

    newSocket.on("game-reset", (state) => {
      const s = useScrabbleGameStore.getState();
      s.setGameState(state);
      s.clearTentativePlacements();
      s.setExchangeMode(false);
      s.setMessage("Juego reiniciado");
    });

    newSocket.on("game-ended", (state) => {
      const s = useScrabbleGameStore.getState();
      s.setGameState(state);
      s.setExchangeMode(false);
      s.setMessage("Juego terminado");
      if (typeof window !== "undefined") {
        localStorage.removeItem("scrabble-session");
      }
    });

    newSocket.on("turn-timer-update", (timeLeft) => {
      useScrabbleGameStore.getState().setGameState((prev) =>
        prev ? { ...prev, turnTimeLeft: timeLeft } : prev
      );
    });

    newSocket.on("rejoin-success", (state) => {
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
      const gameId = state.gameId ?? s.gameId;
      const playerName = s.playerName;
      if (typeof window !== "undefined" && gameId && playerName) {
        localStorage.setItem("scrabble-session", JSON.stringify({ gameId, playerName }));
      }
    });

    newSocket.on("rejoin-failed", (data) => {
      const s = useScrabbleGameStore.getState();
      s.setMessage(data.reason);
      s.setGameId(null);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);
};
