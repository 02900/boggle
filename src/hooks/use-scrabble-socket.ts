"use client";

import { useCallback } from "react";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import type { TilePlacement } from "@/interfaces/scrabble";
import { clearSession } from "./use-scrabble-socket-listeners";

export const useScrabbleSocket = () => {
  const { socket } = useScrabbleGameStore();

  const joinGame = useCallback(
    (playerName: string) => {
      socket?.emit("join-game", playerName);
    },
    [socket]
  );

  const startGame = useCallback(() => {
    socket?.emit("start-game");
  }, [socket]);

  const placeTiles = useCallback(
    (placements: TilePlacement[]) => {
      socket?.emit("place-tiles", { placements });
    },
    [socket]
  );

  const recallTiles = useCallback(() => {
    useScrabbleGameStore.getState().clearTentativePlacements();
    socket?.emit("recall-tiles");
  }, [socket]);

  /** Take one tentative tile back from the board (optimistic; the server resyncs). */
  const recallTile = useCallback(
    (tileId: string) => {
      useScrabbleGameStore.getState().removeTentativePlacement(tileId);
      socket?.emit("recall-tile", { tileId });
    },
    [socket]
  );

  /** Leave on purpose: the server drops us now instead of waiting out the grace period. */
  const leaveGame = useCallback(() => {
    socket?.emit("leave-game");
    clearSession();
  }, [socket]);

  const submitTurn = useCallback(() => {
    socket?.emit("submit-turn");
  }, [socket]);

  const passTurn = useCallback(() => {
    useScrabbleGameStore.getState().clearTentativePlacements();
    socket?.emit("pass-turn");
  }, [socket]);

  const exchangeTiles = useCallback(
    (tileIds: string[]) => {
      socket?.emit("exchange-tiles", { tileIds });
    },
    [socket]
  );

  const skipTurn = useCallback(() => {
    socket?.emit("skip-turn");
  }, [socket]);

  const resetGame = useCallback(() => {
    socket?.emit("reset-game");
  }, [socket]);

  return {
    joinGame,
    startGame,
    placeTiles,
    recallTiles,
    submitTurn,
    passTurn,
    exchangeTiles,
    skipTurn,
    recallTile,
    leaveGame,
    resetGame,
  };
};
