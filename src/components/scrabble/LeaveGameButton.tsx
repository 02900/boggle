"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { useScrabbleSocket } from "@/hooks/use-scrabble-socket";
import { Button, Modal } from "@/components/ui";

/**
 * Back to the game menu. Mid-game it asks first, since leaving on purpose means
 * abandoning: the server drops the player at once (no reconnection grace).
 */
export function LeaveGameButton() {
  const router = useRouter();
  const { leaveGame } = useScrabbleSocket();
  const isPlaying = useScrabbleGameStore((s) => s.gameState?.gameState === "playing");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const leave = () => {
    setConfirmOpen(false);
    leaveGame();
    router.push("/");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => (isPlaying ? setConfirmOpen(true) : leave())}
        data-testid="leave-game"
      >
        ← Juegos
      </Button>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="¿Abandonar la partida?" className="max-w-sm">
        <p className="text-sm text-ink-muted">
          Tus fichas vuelven a la bolsa y la partida sigue sin ti. Si solo queda un jugador, termina.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button variant="danger" fullWidth onClick={leave}>
            Abandonar
          </Button>
          <Button variant="ghost" fullWidth onClick={() => setConfirmOpen(false)}>
            Seguir jugando
          </Button>
        </div>
      </Modal>
    </>
  );
}
