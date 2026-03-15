"use client";

import { useScrabbleGameStore } from "@/stores/scrabble-game.store";

export function TurnIndicator() {
  const { gameState, currentPlayerId } = useScrabbleGameStore();

  if (!gameState || gameState.gameState !== "playing") return null;

  const currentTurnPlayer = gameState.players.find(
    (p) => p.id === gameState.currentTurnPlayerId
  );
  const isMyTurn = gameState.currentTurnPlayerId === currentPlayerId;

  const minutes = Math.floor(gameState.turnTimeLeft / 60);
  const seconds = gameState.turnTimeLeft % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium ${
        isMyTurn
          ? "bg-green-600 text-white"
          : "bg-gray-700 text-gray-200"
      }`}
    >
      <span>
        {isMyTurn
          ? "Tu turno"
          : `Turno de ${currentTurnPlayer?.name ?? "..."}`}
      </span>
      <span className="font-mono tabular-nums">{timeStr}</span>
    </div>
  );
}
