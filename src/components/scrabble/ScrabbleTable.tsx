"use client";

import { useEffect, useState } from "react";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { useMediaQuery, DESKTOP_QUERY } from "@/hooks/use-media-query";
import { Button, Card } from "@/components/ui";
import { ScrabbleBoard } from "./ScrabbleBoard";
import { TileRack } from "./TileRack";
import { TurnIndicator } from "./TurnIndicator";
import { ScrabbleControls } from "./ScrabbleControls";
import { MoveHistory } from "./MoveHistory";
import { ConnectionBanner } from "./ConnectionBanner";
import { PlayerPanel } from "./PlayerPanel";
import { GameOverModal } from "./GameOverModal";
import { LeaveGameButton } from "./LeaveGameButton";

function RackAndActions() {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <TileRack />
      <ScrabbleControls />
    </div>
  );
}

/**
 * The game screen. Desktop: board + rack on the left, players/history panel on the
 * right. Mobile: single column with the rack and actions pinned to the bottom.
 */
export function ScrabbleTable() {
  const isFinished = useScrabbleGameStore((s) => s.gameState?.gameState === "finished");
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [resultsOpen, setResultsOpen] = useState(false);

  // Pop the results as soon as the game ends; the player can dismiss to look at the board
  useEffect(() => {
    setResultsOpen(isFinished);
  }, [isFinished]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="mx-auto flex w-full max-w-[96rem] items-center justify-between gap-3 px-3 pt-3 sm:px-4">
        <div className="flex items-center gap-2">
          <LeaveGameButton />
          <h1 className="text-lg font-bold tracking-tight">Scrabble</h1>
        </div>
        <TurnIndicator />
      </header>

      <div className="mx-auto w-full max-w-[96rem] px-3 pt-2 sm:px-4">
        <ConnectionBanner />
      </div>

      {/* Desktop: board column (capped by the viewport height, see ScrabbleBoard) and the
          side panel sit together, centered, instead of the panel drifting to the far edge */}
      <main className="mx-auto flex w-full max-w-[96rem] flex-1 flex-col gap-4 px-3 pb-3 pt-2 sm:px-4 lg:flex-row lg:items-start lg:justify-center xl:gap-8">
        <section className="flex flex-col items-center gap-3 lg:min-w-0 lg:max-w-[calc(100dvh-15.5rem)] lg:flex-1">
          {!isDesktop && (
            <div className="w-full">
              <PlayerPanel compact />
            </div>
          )}
          <ScrabbleBoard />
          {isDesktop && <RackAndActions />}
        </section>

        <aside className="flex flex-col gap-3 lg:w-80 lg:shrink-0">
          {isDesktop && (
            <Card>
              <h2 className="mb-2 text-xs uppercase tracking-wide text-ink-faint">Jugadores</h2>
              <PlayerPanel />
            </Card>
          )}
          <MoveHistory />
          {isFinished && !resultsOpen && (
            <Button variant="primary" fullWidth onClick={() => setResultsOpen(true)}>
              Ver resultados
            </Button>
          )}
        </aside>
      </main>

      {!isDesktop && (
        <div className="sticky bottom-0 z-20 border-t border-edge bg-canvas/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <RackAndActions />
        </div>
      )}

      <GameOverModal open={resultsOpen} onClose={() => setResultsOpen(false)} />
    </div>
  );
}
