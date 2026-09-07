"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { describeGameEnd, describeTurnChanged, describeTurnPlayed } from "@/utils/scrabble-messages";
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

function saveSession(gameId: string | null, playerName: string | null) {
  if (typeof window === "undefined" || !gameId || !playerName) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ gameId, playerName }));
}

function clearSession() {
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
}

export const useScrabbleSocketListeners = () => {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const store = useScrabbleGameStore.getState();
    const newSocket: ScrabbleSocket = io({ query: { game: "scrabble" } });
    store.setSocket(newSocket);
    const get = useScrabbleGameStore.getState;
    if (process.env.NODE_ENV !== "production") {
      // Dev/test hook: lets e2e tests simulate a network drop (Playwright can't cut open WebSockets)
      (window as unknown as { __SCRABBLE_SOCKET__?: ScrabbleSocket }).__SCRABBLE_SOCKET__ = newSocket;
    }

    newSocket.on("connect", () => {
      const s = get();
      s.setConnectionStatus("connected");
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
      const s = get();
      // Only "reconnecting" if we were in a game; before that it's just "connecting"
      s.setConnectionStatus(s.isJoined ? "reconnecting" : "connecting");
    });

    newSocket.on("join-confirmed", (data) => {
      const s = get();
      s.setCurrentPlayerId(data.playerId);
      s.setIsJoined(true);
      s.setPlayerName(data.playerName);
      if (typeof window !== "undefined") {
        localStorage.setItem("scrabble-player-name", data.playerName);
      }
    });

    newSocket.on("player-joined", ({ playerId, playerName }) => {
      const s = get();
      s.setGameState((prev) => {
        if (!prev || prev.players.some((p) => p.id === playerId)) return prev;
        return {
          ...prev,
          players: [
            ...prev.players,
            { id: playerId, name: playerName, score: 0, rackSize: 0, isCurrentTurn: false, isConnected: true, wordsFound: [] },
          ],
        };
      });
      s.notify("info", `${playerName} se unió`);
    });

    newSocket.on("player-left", (playerId) => {
      const s = get();
      const left = s.gameState?.players.find((p) => p.id === playerId);
      s.setGameState((prev) =>
        prev ? { ...prev, players: prev.players.filter((p) => p.id !== playerId) } : prev
      );
      if (left) {
        s.markPlayerReconnected(left.name); // drop any grace entry
        s.notify("info", `${left.name} abandonó la partida`);
      }
    });

    newSocket.on("player-disconnected", ({ playerId, playerName, graceSeconds }) => {
      const s = get();
      s.markPlayerDisconnected(playerId, playerName, graceSeconds);
      s.notify("info", `${playerName} se desconectó · ${graceSeconds}s para volver`);
    });

    newSocket.on("player-reconnected", ({ playerId, playerName }) => {
      const s = get();
      s.markPlayerReconnected(playerName);
      // Same name, new id → swap the id, keep their data
      s.setGameState((prev) =>
        prev
          ? { ...prev, players: prev.players.map((p) => (p.name === playerName ? { ...p, id: playerId, isConnected: true } : p)) }
          : prev
      );
      s.notify("info", `${playerName} volvió`);
    });

    newSocket.on("game-state", (state) => {
      const s = get();
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
      const s = get();
      s.setGameState(state);
      s.clearTentativePlacements();
      s.setGameEndSummary(null);
      s.clearDisconnectedPlayers();
      const starter = state.players.find((p) => p.id === state.currentTurnPlayerId);
      const isMe = state.currentTurnPlayerId === s.currentPlayerId;
      s.notify("turn", isMe ? "¡Empieza la partida, tu turno!" : `Empieza la partida · turno de ${starter?.name ?? "..."}`);
      if (state.gameId) s.setGameId(state.gameId);
      saveSession(state.gameId ?? s.gameId, s.playerName);
    });

    newSocket.on("start-failed", ({ reason }) => {
      get().notify("error", reason);
    });

    newSocket.on("word-result", (result) => {
      // Successes are announced via turn-played; here we only surface rejections
      if (!result.valid) get().notify("error", result.reason ?? "Jugada inválida");
    });

    newSocket.on("turn-played", (event) => {
      const s = get();
      const isMe = event.playerId === s.currentPlayerId;
      const kind = event.type === "place" ? "success" : event.type === "timeout" ? "error" : "info";
      s.notify(kind, describeTurnPlayed(event, isMe));
    });

    newSocket.on("turn-changed", (event) => {
      const s = get();
      const isMe = event.currentPlayerId === s.currentPlayerId;
      s.notify("turn", describeTurnChanged(event, isMe));
    });

    newSocket.on("game-reset", (state) => {
      const s = get();
      s.setGameState(state);
      s.clearTentativePlacements();
      s.setExchangeMode(false);
      s.setGameEndSummary(null);
      s.clearDisconnectedPlayers();
      s.notify("info", "Partida reiniciada");
      clearSession();
    });

    newSocket.on("game-ended", (state) => {
      const s = get();
      const { reason, finalAdjustments, ...gameState } = state;
      s.setGameState(gameState);
      s.setExchangeMode(false);
      s.setGameEndSummary({ reason, finalAdjustments });
      s.notify("info", describeGameEnd(reason));
      clearSession();
    });

    newSocket.on("turn-timer-update", (timeLeft) => {
      get().setGameState((prev) => (prev ? { ...prev, turnTimeLeft: timeLeft } : prev));
    });

    newSocket.on("rejoin-success", (state) => {
      const s = get();
      s.setGameState(state);
      s.setRack(state.rack);
      s.setTentativePlacements(state.tentativePlacements);
      if (state.gameId) s.setGameId(state.gameId);
      s.setIsJoined(true);
      s.notify("success", "Reconectado a la partida");
      saveSession(state.gameId ?? s.gameId, s.playerName);
    });

    newSocket.on("rejoin-failed", (data) => {
      const s = get();
      s.notify("error", data.reason);
      s.setGameId(null);
      // Stale session: drop it so we don't retry on every connect
      clearSession();
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);
};
