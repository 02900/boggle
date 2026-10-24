"use client";

import { useEffect, useState } from "react";
import { useBoggleGameMainStore } from "./BoggleGameMain/boogle-game-main.store";
import { roomLink } from "@/utils/room-url";

/** "Sala K7QF" chip that copies the room's invite link. */
export const BoggleRoomCode = ({ className = "" }: { className?: string }) => {
  const code = useBoggleGameMainStore((s) => s.roomCode);
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
      // Clipboard blocked: the code is still visible to read out
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      data-testid="room-code"
      data-code={code}
      title="Copiar link de invitación"
      className={`inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs text-blue-800 hover:bg-blue-100 transition-colors ${className}`}
    >
      Sala <span className="font-mono font-bold tracking-wider">{code}</span>
      <span aria-live="polite">{copied ? "· ¡Copiado!" : "· Copiar link"}</span>
    </button>
  );
};
