"use client";

import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { composeClasses } from "@/utils/compose-classes";
import { playerColor } from "./player-colors";

/** Scores and status of every seat. Used in the side panel (desktop) and under the header (mobile). */
export function PlayerPanel({ compact = false }: { compact?: boolean }) {
  const players = useScrabbleGameStore((s) => s.gameState?.players ?? []);
  const currentTurnPlayerId = useScrabbleGameStore((s) => s.gameState?.currentTurnPlayerId);
  const currentPlayerId = useScrabbleGameStore((s) => s.currentPlayerId);
  const tileBagCount = useScrabbleGameStore((s) => s.gameState?.tileBagCount ?? 0);

  return (
    <div className={composeClasses(compact ? "flex gap-2 overflow-x-auto pb-1" : "space-y-1.5")}>
      {players.map((p, i) => {
        const isTurn = p.id === currentTurnPlayerId;
        const isMe = p.id === currentPlayerId;
        const offline = p.isConnected === false;
        return (
          <div
            key={p.id}
            data-testid="player-badge"
            data-connected={!offline}
            className={composeClasses(
              "flex items-center gap-2.5 rounded-lg px-3 transition-colors",
              compact ? "flex-shrink-0 py-1.5 text-sm" : "py-2",
              isTurn ? "bg-accent/15 ring-1 ring-accent/50" : "bg-surface-raised/60",
              offline && "opacity-50"
            )}
          >
            <span
              aria-hidden
              className={composeClasses(
                "h-2.5 w-2.5 flex-shrink-0 rounded-full",
                playerColor(i),
                isTurn && "ring-2 ring-accent/60 ring-offset-1 ring-offset-surface"
              )}
            />
            <span className={composeClasses("truncate font-medium", offline && "line-through")}>
              <span data-testid="player-name">{p.name}</span>
              {isMe && !compact && <span className="ml-1 text-xs font-normal text-ink-faint">(tú)</span>}
            </span>
            {!compact && p.rackSize !== undefined && (
              <span className="text-xs text-ink-faint" title="Fichas en el atril">
                {p.rackSize} f.
              </span>
            )}
            <span
              data-testid="player-score"
              className={composeClasses("ml-auto font-mono tabular-nums", compact ? "text-xs" : "text-sm font-semibold")}
            >
              {p.score}pts
            </span>
          </div>
        );
      })}
      {!compact && (
        <p className="pt-2 text-xs text-ink-faint">
          Fichas en bolsa: <span className="font-mono tabular-nums text-ink-muted">{tileBagCount}</span>
        </p>
      )}
    </div>
  );
}
