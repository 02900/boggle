"use client";

import { useEffect, useState } from "react";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { composeClasses } from "@/utils/compose-classes";
import { roomLink } from "@/utils/room-url";

/**
 * "Sala K7QF" with a button that copies the room's invite link. `className` goes on
 * a wrapper, so callers can hide it (e.g. `hidden sm:block`) without fighting the
 * button's own display class.
 */
export function RoomCodeBadge({ className }: { className?: string }) {
  const code = useScrabbleGameStore((s) => s.gameId);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  if (!code) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(roomLink(code));
      setCopied(true);
    } catch {
      // Clipboard blocked (insecure origin, permissions): the code is still visible
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={copy}
        data-testid="room-code"
        data-code={code}
        title="Copiar link de invitación"
        className="inline-flex items-center gap-1.5 rounded-full border border-edge px-3 py-1 text-xs text-ink-muted transition-colors hover:border-accent/60 hover:text-ink"
      >
        Sala <span className="font-mono font-semibold tracking-wider text-ink">{code}</span>
        <span aria-live="polite" className={composeClasses(copied && "text-success")}>
          {copied ? "· ¡Link copiado!" : "· Copiar link"}
        </span>
      </button>
    </div>
  );
}
