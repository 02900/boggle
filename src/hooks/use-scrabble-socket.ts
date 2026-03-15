"use client";

import { useCallback } from "react";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import type { TilePlacement } from "@/interfaces/scrabble";

export const useScrabbleSocket = () => {
  const { socket } = useScrabbleGameStore();

  const joinGame = useCallback(
    (playerName: string) => {
      socket?.emit("join-game", playerName);
    },
    [socket]
  );

  const rejoinGame = useCallback(
    (playerName: string, gameId: string) => {
      socket?.emit("rejoin-game", { playerName, gameId });
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
    socket?.emit("recall-tiles");
  }, [socket]);

  const submitTurn = useCallback(() => {
    socket?.emit("submit-turn");
  }, [socket]);

  const passTurn = useCallback(() => {
    socket?.emit("pass-turn");
  }, [socket]);

  const exchangeTiles = useCallback(
    (tileIds: string[]) => {
      socket?.emit("exchange-tiles", { tileIds });
    },
    [socket]
  );

  const resetGame = useCallback(() => {
    socket?.emit("reset-game");
  }, [socket]);

  return {
    joinGame,
    rejoinGame,
    startGame,
    placeTiles,
    recallTiles,
    submitTurn,
    passTurn,
    exchangeTiles,
    resetGame,
  };
};
