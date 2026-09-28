"use client";

import { useScrabbleSocketListeners } from "@/hooks/use-scrabble-socket-listeners";
import { useScrabbleSocket } from "@/hooks/use-scrabble-socket";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { Badge, Button, Card } from "@/components/ui";
import { composeClasses } from "@/utils/compose-classes";
import { describeGameEnd } from "@/utils/scrabble-messages";
import { ScrabbleBoard } from "../ScrabbleBoard";
import { TileRack } from "../TileRack";
import { TurnIndicator } from "../TurnIndicator";
import { ScrabbleControls } from "../ScrabbleControls";
import { ScrabbleInstructions } from "../ScrabbleInstructions";
import { MoveHistory } from "../MoveHistory";
import { Toaster } from "../Toaster";
import { ConnectionBanner } from "../ConnectionBanner";
import { useState, useEffect } from "react";

function JoinForm() {
  const { joinGame } = useScrabbleSocket();
  const isConnected = useScrabbleGameStore((s) => s.isConnected);
  const [name, setName] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  // Session auto-rejoin lives in useScrabbleSocketListeners (on socket connect)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedName = localStorage.getItem("scrabble-player-name");
    if (savedName) setName(savedName);
  }, []);

  const handleJoin = () => {
    const finalName = name.trim();
    if (finalName) joinGame(finalName);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <Card padding="lg" className="w-full max-w-sm">
        <h1 className="text-center text-3xl font-bold tracking-tight">Scrabble</h1>
        <p className="mb-6 mt-1 text-center text-sm text-ink-muted">Juego de palabras por turnos</p>

        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="Tu nombre"
            aria-label="Tu nombre"
            maxLength={20}
            className="h-11 w-full rounded-lg border border-edge bg-surface-raised px-4 text-ink! placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          />

          <Button variant="primary" size="lg" fullWidth onClick={handleJoin} disabled={!isConnected || !name.trim()}>
            {isConnected ? "Unirse" : "Conectando..."}
          </Button>

          <Button variant="ghost" fullWidth onClick={() => setShowInstructions(!showInstructions)}>
            {showInstructions ? "Ocultar reglas" : "Ver reglas"}
          </Button>
        </div>

        {showInstructions && (
          <div className="mt-4">
            <ScrabbleInstructions />
          </div>
        )}
      </Card>
    </div>
  );
}

function PlayerList() {
  const players = useScrabbleGameStore((s) => s.gameState?.players ?? []);
  const currentTurnPlayerId = useScrabbleGameStore((s) => s.gameState?.currentTurnPlayerId);
  const currentPlayerId = useScrabbleGameStore((s) => s.currentPlayerId);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {players.map((p) => {
        const isTurn = p.id === currentTurnPlayerId;
        const isMe = p.id === currentPlayerId;
        const offline = p.isConnected === false;
        return (
          <Badge
            key={p.id}
            tone={isTurn ? "accent" : isMe ? "neutral" : "muted"}
            data-testid="player-badge"
            data-connected={!offline}
            className={composeClasses("flex-shrink-0", offline && "opacity-50 line-through")}
          >
            <span className="font-medium">{p.name}</span>
            <span data-testid="player-score" className="text-xs opacity-75">
              {p.score}pts
            </span>
          </Badge>
        );
      })}
    </div>
  );
}

function GameOverSummary() {
  const players = useScrabbleGameStore((s) => s.gameState?.players ?? []);
  const gameEndSummary = useScrabbleGameStore((s) => s.gameEndSummary);
  const ranked = [...players].sort((a, b) => b.score - a.score);

  return (
    <Card className="text-center">
      <h2 className="text-xl font-bold">Juego Terminado</h2>
      {gameEndSummary && <p className="mb-3 text-xs text-ink-muted">{describeGameEnd(gameEndSummary.reason)}</p>}
      <ol className="space-y-1">
        {ranked.map((p, i) => {
          const adj = gameEndSummary?.finalAdjustments.find((a) => a.playerId === p.id);
          return (
            <li key={p.id} className={composeClasses("text-sm", i === 0 && "font-semibold text-accent")}>
              {i === 0 ? "🏆 " : ""}
              {p.name}: {p.score} puntos
              {adj && adj.delta !== 0 && (
                <span className="ml-1 text-xs text-ink-muted">
                  ({adj.delta > 0 ? "+" : ""}
                  {adj.delta} por fichas restantes)
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function GameView() {
  const isFinished = useScrabbleGameStore((s) => s.gameState?.gameState === "finished");

  return (
    <div className="min-h-screen bg-canvas p-2 text-ink sm:p-4">
      <div className="mx-auto max-w-4xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-bold tracking-tight">Scrabble</h1>
          <TurnIndicator />
        </div>

        <ConnectionBanner />
        <PlayerList />

        <div className="flex justify-center">
          <ScrabbleBoard />
        </div>

        <div className="flex flex-col items-center gap-3">
          <TileRack />
          <ScrabbleControls />
        </div>

        <MoveHistory />
        {isFinished && <GameOverSummary />}
      </div>
    </div>
  );
}

export function ScrabbleGameMain() {
  useScrabbleSocketListeners();
  const isJoined = useScrabbleGameStore((s) => s.isJoined);

  return (
    <>
      <Toaster />
      {isJoined ? <GameView /> : <JoinForm />}
    </>
  );
}
