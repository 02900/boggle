"use client";

import { useEffect, useState } from "react";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";

/** Ticks once a second so grace-period countdowns stay fresh. */
function useNow(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [enabled]);
  return now;
}

/**
 * Persistent status strip for connection problems: our own socket reconnecting,
 * or other players in their reconnection grace period.
 */
export function ConnectionBanner() {
  const connectionStatus = useScrabbleGameStore((s) => s.connectionStatus);
  const disconnectedPlayers = useScrabbleGameStore((s) => s.disconnectedPlayers);
  const entries = Object.values(disconnectedPlayers);
  const now = useNow(entries.length > 0);

  if (connectionStatus === "reconnecting") {
    return (
      <div
        role="alert"
        data-testid="connection-banner"
        className="flex items-center justify-center gap-2 rounded-lg bg-red-700/90 px-4 py-2 text-sm font-medium text-white"
      >
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
        Conexión perdida · reconectando…
      </div>
    );
  }

  if (entries.length === 0) return null;

  return (
    <div
      role="status"
      data-testid="connection-banner"
      className="flex flex-col items-center gap-1 rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-medium text-gray-900"
    >
      {entries.map((p) => {
        const secondsLeft = Math.max(0, Math.ceil((p.graceEndsAt - now) / 1000));
        return (
          <span key={p.playerName}>
            {p.playerName} se desconectó · {secondsLeft}s para volver
          </span>
        );
      })}
    </div>
  );
}
