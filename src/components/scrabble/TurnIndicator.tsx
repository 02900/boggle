"use client";

import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { Badge, Timer } from "@/components/ui";

export function TurnIndicator() {
  const gameState = useScrabbleGameStore((s) => s.gameState);
  const currentPlayerId = useScrabbleGameStore((s) => s.currentPlayerId);

  if (!gameState || gameState.gameState !== "playing") return null;

  const currentTurnPlayer = gameState.players.find((p) => p.id === gameState.currentTurnPlayerId);
  const isMyTurn = gameState.currentTurnPlayerId === currentPlayerId;

  return (
    <Badge
      tone={isMyTurn ? "accent" : "neutral"}
      data-testid="turn-indicator"
      data-my-turn={isMyTurn}
      className="px-4 py-2"
    >
      <span>{isMyTurn ? "Tu turno" : `Turno de ${currentTurnPlayer?.name ?? "..."}`}</span>
      <Timer seconds={gameState.turnTimeLeft} />
    </Badge>
  );
}
