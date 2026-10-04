"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useScrabbleSocketListeners } from "@/hooks/use-scrabble-socket-listeners";
import { useScrabbleSocket } from "@/hooks/use-scrabble-socket";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { Button, Card, Modal } from "@/components/ui";
import { ScrabbleInstructions } from "../ScrabbleInstructions";
import { ScrabbleScoreboard } from "../ScrabbleScoreboard";
import { ScrabbleLobby } from "../ScrabbleLobby";
import { ScrabbleTable } from "../ScrabbleTable";
import { Toaster } from "../Toaster";

function JoinForm() {
  const { joinGame } = useScrabbleSocket();
  const isConnected = useScrabbleGameStore((s) => s.isConnected);
  const [name, setName] = useState("");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [scoresOpen, setScoresOpen] = useState(false);

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
        <Link
          href="/"
          className="-ml-1 -mt-1 mb-2 inline-flex h-8 items-center rounded-md px-2 text-xs text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
        >
          ← Juegos
        </Link>
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

          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" fullWidth onClick={() => setRulesOpen(true)}>
              Ver reglas
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setScoresOpen(true)} disabled={!isConnected}>
              Mejores puntajes
            </Button>
          </div>
        </div>
      </Card>

      <ScrabbleScoreboard open={scoresOpen} onClose={() => setScoresOpen(false)} />

      <Modal open={rulesOpen} onClose={() => setRulesOpen(false)} title="Reglas" className="max-w-md">
        <ScrabbleInstructions />
        <Button variant="ghost" fullWidth className="mt-4" onClick={() => setRulesOpen(false)}>
          Cerrar
        </Button>
      </Modal>
    </div>
  );
}

/** Screen router: join → lobby (waiting) → table (playing / finished). */
export function ScrabbleGameMain() {
  useScrabbleSocketListeners();
  const isJoined = useScrabbleGameStore((s) => s.isJoined);
  const phase = useScrabbleGameStore((s) => s.gameState?.gameState ?? "waiting");

  return (
    <>
      <Toaster />
      {!isJoined ? <JoinForm /> : phase === "waiting" ? <ScrabbleLobby /> : <ScrabbleTable />}
    </>
  );
}
