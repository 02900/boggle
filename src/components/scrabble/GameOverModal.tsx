"use client";

import { useMemo } from "react";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { useScrabbleSocket } from "@/hooks/use-scrabble-socket";
import { Button, Modal } from "@/components/ui";
import { composeClasses } from "@/utils/compose-classes";
import { describeGameEnd, describePlayerTime } from "@/utils/scrabble-messages";
import { playerColor } from "./player-colors";

const MEDALS = ["🥇", "🥈", "🥉"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GameOverModal({ open, onClose }: Props) {
  const players = useScrabbleGameStore((s) => s.gameState?.players ?? []);
  const moveHistory = useScrabbleGameStore((s) => s.gameState?.moveHistory ?? []);
  const currentPlayerId = useScrabbleGameStore((s) => s.currentPlayerId);
  const summary = useScrabbleGameStore((s) => s.gameEndSummary);
  const { resetGame } = useScrabbleSocket();

  const ranked = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players]);
  const bestMove = useMemo(
    () => moveHistory.filter((m) => m.type === "place").sort((a, b) => b.score - a.score)[0],
    [moveHistory]
  );
  const winner = ranked[0];
  const iWon = winner?.id === currentPlayerId;

  return (
    <Modal open={open} onClose={onClose} title="Juego Terminado" className="max-w-md">
      <div className="text-center">
        <p className="text-sm text-ink-muted">{summary ? describeGameEnd(summary.reason) : ""}</p>
        {winner && (
          <p className="mt-3 text-2xl font-bold">
            {iWon ? "¡Ganaste!" : `Ganó ${winner.name}`}
          </p>
        )}
      </div>

      <ol className="mt-5 space-y-2">
        {ranked.map((p, i) => {
          const seat = players.findIndex((x) => x.id === p.id);
          const adj = summary?.finalAdjustments.find((a) => a.playerId === p.id);
          const words = p.wordsFound?.length ?? 0;
          return (
            <li
              key={p.id}
              data-testid="result-row"
              data-player={p.name}
              data-score={p.score}
              className={composeClasses(
                "flex items-center gap-3 rounded-lg px-3 py-2.5",
                i === 0 ? "bg-accent/15 ring-1 ring-accent/50" : "bg-surface-raised/60"
              )}
            >
              <span className="w-6 text-center text-lg leading-none">{MEDALS[i] ?? `${i + 1}.`}</span>
              <span aria-hidden className={composeClasses("h-2.5 w-2.5 rounded-full", playerColor(seat))} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {p.name}
                  {p.id === currentPlayerId && <span className="ml-1 text-xs font-normal text-ink-faint">(tú)</span>}
                </div>
                <div className="text-xs text-ink-faint">
                  {words} palabra{words === 1 ? "" : "s"}
                  {adj && adj.delta !== 0 && (
                    <>
                      {" · "}
                      <span className={adj.delta > 0 ? "text-success" : "text-danger"}>
                        {adj.delta > 0 ? "+" : ""}
                        {adj.delta}
                      </span>{" "}
                      por fichas restantes
                    </>
                  )}
                </div>
                <div data-testid="player-time" className="text-xs text-ink-faint">
                  ⏱ {describePlayerTime(p.timeUsed ?? 0, p.overtime ?? 0)}
                </div>
              </div>
              <span className="font-mono text-lg font-semibold tabular-nums">{p.score}</span>
            </li>
          );
        })}
      </ol>

      {bestMove && bestMove.words && bestMove.words.length > 0 && (
        <p className="mt-4 text-center text-xs text-ink-muted">
          Mejor jugada: <span className="font-semibold text-ink">{bestMove.playerName}</span> con{" "}
          <span className="font-semibold text-ink">
            {bestMove.words.map((w) => w.word.toUpperCase()).join(", ")}
          </span>{" "}
          (+{bestMove.score})
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2">
        <Button variant="primary" size="lg" fullWidth onClick={resetGame}>
          Nueva Partida
        </Button>
        <Button variant="ghost" fullWidth onClick={onClose}>
          Ver tablero
        </Button>
      </div>
    </Modal>
  );
}
