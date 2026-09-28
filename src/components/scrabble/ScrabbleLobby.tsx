"use client";

import { useState } from "react";
import { useScrabbleGameStore, NO_PLAYERS } from "@/stores/scrabble-game.store";
import { useScrabbleSocket } from "@/hooks/use-scrabble-socket";
import { Button, Card, Modal } from "@/components/ui";
import { composeClasses } from "@/utils/compose-classes";
import { ScrabbleInstructions } from "./ScrabbleInstructions";
import { playerColor } from "./player-colors";
import { LeaveGameButton } from "./LeaveGameButton";

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

/** Waiting room: who's here, how many are needed, start when ready. No board yet. */
export function ScrabbleLobby() {
  const players = useScrabbleGameStore((s) => s.gameState?.players ?? NO_PLAYERS);
  const currentPlayerId = useScrabbleGameStore((s) => s.currentPlayerId);
  const { startGame } = useScrabbleSocket();
  const [rulesOpen, setRulesOpen] = useState(false);

  const canStart = players.length >= MIN_PLAYERS;
  const missing = MIN_PLAYERS - players.length;

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4 text-ink">
      <Card padding="lg" className="w-full max-w-md">
        <div className="-ml-2 -mt-2 mb-2">
          <LeaveGameButton />
        </div>
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Scrabble</h1>
          <p className="mt-1 text-sm text-ink-muted">Sala de espera</p>
        </div>

        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-ink-faint">
          <span>Jugadores</span>
          <span data-testid="lobby-count">
            {players.length}/{MAX_PLAYERS}
          </span>
        </div>

        <ul className="space-y-2">
          {players.map((p, i) => (
            <li
              key={p.id}
              data-testid="player-badge"
              data-connected={p.isConnected !== false}
              className="flex animate-slide-down items-center gap-3 rounded-lg bg-surface-raised px-3 py-2.5"
            >
              <span aria-hidden className={composeClasses("h-2.5 w-2.5 rounded-full", playerColor(i))} />
              <span data-testid="player-name" className="font-medium">{p.name}</span>
              {p.id === currentPlayerId && <span className="text-xs text-ink-faint">(tú)</span>}
              <span data-testid="player-score" className="ml-auto text-xs text-ink-faint">
                {p.score}pts
              </span>
            </li>
          ))}
          {Array.from({ length: Math.max(0, MIN_PLAYERS - players.length) }, (_, i) => (
            <li
              key={`empty-${i}`}
              className="flex items-center gap-3 rounded-lg border border-dashed border-edge px-3 py-2.5 text-sm text-ink-faint"
            >
              <span aria-hidden className="h-2.5 w-2.5 rounded-full border border-edge" />
              Esperando jugador…
            </li>
          ))}
        </ul>

        <p role="status" className="mt-4 flex items-center justify-center gap-2 text-center text-sm text-ink-muted">
          {canStart ? (
            "Listos para empezar"
          ) : (
            <>
              <span aria-hidden className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Falta {missing} jugador{missing === 1 ? "" : "es"} para empezar
            </>
          )}
        </p>

        <div className="mt-4 space-y-2">
          {canStart && (
            <Button variant="primary" size="lg" fullWidth onClick={startGame}>
              Iniciar Juego
            </Button>
          )}
          <Button variant="ghost" fullWidth onClick={() => setRulesOpen(true)}>
            Ver reglas
          </Button>
        </div>
      </Card>

      <Modal open={rulesOpen} onClose={() => setRulesOpen(false)} title="Reglas" className="max-w-md">
        <ScrabbleInstructions />
        <Button variant="ghost" fullWidth className="mt-4" onClick={() => setRulesOpen(false)}>
          Cerrar
        </Button>
      </Modal>
    </div>
  );
}
