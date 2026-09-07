"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import type { ScrabbleGameEvents, ScrabbleClientEvents } from "@/interfaces/scrabble";

type ScrabbleSocket = Socket<ScrabbleGameEvents, ScrabbleClientEvents>;

const SESSION_KEY = "scrabble-session";

function readStoredSession(): { gameId: string; playerName: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const session = raw ? JSON.parse(raw) : null;
    if (session?.gameId && session?.playerName) return session;
  } catch {
    // fallthrough: corrupted value
  }
  localStorage.removeItem(SESSION_KEY);
  return null;
}

export const useScrabbleSocketListeners = () => {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const store = useScrabbleGameStore.getState();
    const newSocket: ScrabbleSocket = io({ query: { game: "scrabble" } });
    store.setSocket(newSocket);

    newSocket.on("connect", () => {
      const s = useScrabbleGameStore.getState();
      s.setIsConnected(true);
      if (newSocket.id) {
        s.setCurrentPlayerId(newSocket.id);
      }
      // Auto-rejoin a persisted session. Done here (not in JoinForm's effect)
      // because the socket doesn't exist yet when child effects run, and this
      // also covers network reconnects, which get a fresh socket id.
      const session = readStoredSession();
      if (session) {
        s.setGameId(session.gameId);
        s.setPlayerName(session.playerName);
        newSocket.emit("rejoin-game", session);
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
        if (prev.players.some((p) => p.id === playerId)) return prev;
        // Same name, new id → the player reconnected; keep their data, swap the id
        if (prev.players.some((p) => p.name === playerName)) {
          return {
            ...prev,
            players: prev.players.map((p) => (p.name === playerName ? { ...p, id: playerId } : p)),
          };
        }
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
      // Private view: the server is the source of truth for rack + tentative placements
      if ("rack" in state) {
        s.setRack(state.rack);
        s.setTentativePlacements(state.tentativePlacements);
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
      const gameId = state.gameId ?? s.gameId;
      if (state.gameId) s.setGameId(state.gameId);
      if (typeof window !== "undefined" && gameId && s.playerName) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ gameId, playerName: s.playerName }));
      }
    });

    newSocket.on("word-result", (result) => {
      const s = useScrabbleGameStore.getState();
      s.setMessage(
        result.valid
          ? result.points ? `+${result.points} puntos` : "Turno válido"
          : result.reason ?? "Error"
      );
    });

    newSocket.on("game-reset", (state) => {
      const s = useScrabbleGameStore.getState();
      s.setGameState(state);
      s.clearTentativePlacements();
      s.setExchangeMode(false);
      s.setMessage("Juego reiniciado");
      if (typeof window !== "undefined") {
        localStorage.removeItem(SESSION_KEY);
      }
    });

    newSocket.on("game-ended", (state) => {
      const s = useScrabbleGameStore.getState();
      s.setGameState(state);
      s.setExchangeMode(false);
      s.setMessage("Juego terminado");
      if (typeof window !== "undefined") {
        localStorage.removeItem(SESSION_KEY);
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
      s.setRack(state.rack);
      s.setTentativePlacements(state.tentativePlacements);
      if (state.gameId) {
        s.setGameId(state.gameId);
      }
      s.setIsJoined(true);
      s.setMessage("Reconectado al juego");
      const gameId = state.gameId ?? s.gameId;
      const playerName = s.playerName;
      if (typeof window !== "undefined" && gameId && playerName) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ gameId, playerName }));
      }
    });

    newSocket.on("rejoin-failed", (data) => {
      const s = useScrabbleGameStore.getState();
      s.setMessage(data.reason);
      s.setGameId(null);
      // Stale session: drop it so we don't retry on every connect
      if (typeof window !== "undefined") {
        localStorage.removeItem(SESSION_KEY);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);
};
