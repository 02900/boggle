"use client";

import { useMemo, useState } from "react";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { Card } from "@/components/ui";
import type { MoveRecord } from "@/interfaces/scrabble";

const TYPE_LABELS: Record<MoveRecord["type"], string> = {
  place: "colocó",
  pass: "pasó",
  exchange: "cambió fichas",
};

export function MoveHistory() {
  const moves = useScrabbleGameStore((s) => s.gameState?.moveHistory);
  const [expanded, setExpanded] = useState(false);

  const displayMoves = useMemo(() => [...(moves ?? [])].reverse(), [moves]);

  if (!moves || moves.length === 0) return null;

  return (
    <Card padding="none" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-raised"
      >
        <span>Historial ({moves.length})</span>
        <span aria-hidden className="text-xs text-ink-faint">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <ol className="max-h-48 divide-y divide-edge/60 overflow-y-auto border-t border-edge">
          {displayMoves.map((move, i) => (
            <li key={moves.length - 1 - i} className="px-4 py-2 text-xs">
              <div className="flex items-baseline gap-1.5">
                <span className="font-medium text-ink">{move.playerName}</span>
                <span className="text-ink-muted">{TYPE_LABELS[move.type]}</span>
                {move.score > 0 && <span className="ml-auto font-semibold text-success">+{move.score}</span>}
              </div>
              {move.words && move.words.length > 0 && (
                <div className="mt-0.5 text-ink-muted">
                  {move.words.map((w) => `${w.word.toUpperCase()} (${w.score})`).join(", ")}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
