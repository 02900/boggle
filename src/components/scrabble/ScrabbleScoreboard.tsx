"use client";

import { useEffect, useMemo, useState } from "react";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { useScrabbleSocket } from "@/hooks/use-scrabble-socket";
import { Button, Modal } from "@/components/ui";
import { composeClasses } from "@/utils/compose-classes";

const MEDALS = ["🥇", "🥈", "🥉"];

function formatDate(isoDate: string): string {
  // Entries store a plain YYYY-MM-DD; parse it as a local date, not UTC midnight
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Scrabble's own leaderboard (separate from Boggle's), filterable by table size. */
export function ScrabbleScoreboard({ open, onClose }: Props) {
  const scoreboard = useScrabbleGameStore((s) => s.scoreboard);
  const { requestScoreboard } = useScrabbleSocket();
  const [tableSize, setTableSize] = useState<number | "all">("all");

  useEffect(() => {
    if (open) requestScoreboard();
  }, [open, requestScoreboard]);

  const sizes = useMemo(
    () => [...new Set((scoreboard ?? []).map((e) => e.playerCount || 1))].sort((a, b) => a - b),
    [scoreboard]
  );
  const entries = useMemo(
    () => (scoreboard ?? []).filter((e) => tableSize === "all" || (e.playerCount || 1) === tableSize),
    [scoreboard, tableSize]
  );

  const tab = (value: number | "all", label: string) => (
    <button
      key={value}
      type="button"
      role="tab"
      aria-selected={tableSize === value}
      onClick={() => setTableSize(value)}
      className={composeClasses(
        "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors",
        tableSize === value ? "bg-accent text-accent-ink" : "text-ink-muted hover:bg-surface-raised hover:text-ink"
      )}
    >
      {label}
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title="Mejores puntajes de Scrabble" className="max-w-md">
      {sizes.length > 1 && (
        <div role="tablist" aria-label="Jugadores en la mesa" className="mb-3 flex gap-1 overflow-x-auto">
          {tab("all", "Todos")}
          {sizes.map((n) => tab(n, `${n} jugadores`))}
        </div>
      )}

      <div data-testid="scrabble-scoreboard" className="max-h-[55vh] overflow-y-auto">
        {scoreboard === null ? (
          <p role="status" className="py-8 text-center text-sm text-ink-muted">
            Cargando puntajes…
          </p>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">
            Todavía no hay puntajes de Scrabble. ¡Termina una partida para aparecer aquí!
          </p>
        ) : (
          <ol className="space-y-1.5">
            {entries.map((entry, i) => (
              <li
                key={`${entry.name}-${entry.score}-${entry.date}-${i}`}
                data-testid="scoreboard-row"
                className={composeClasses(
                  "flex items-center gap-3 rounded-lg px-3 py-2",
                  i < 3 ? "bg-accent/10" : "bg-surface-raised/60"
                )}
              >
                <span className="w-7 text-center">{MEDALS[i] ?? <span className="text-xs text-ink-faint">{i + 1}</span>}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{entry.name}</div>
                  <div className="text-xs text-ink-faint">
                    {formatDate(entry.date)} · {entry.playerCount || 1} jugadores
                  </div>
                </div>
                <span className="font-mono text-lg font-semibold tabular-nums">{entry.score}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <Button variant="ghost" fullWidth className="mt-4" onClick={onClose}>
        Cerrar
      </Button>
    </Modal>
  );
}
