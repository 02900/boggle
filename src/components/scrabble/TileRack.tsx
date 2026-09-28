"use client";

import { useMemo } from "react";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { ScrabbleTile } from "./ScrabbleTile";
import { composeClasses } from "@/utils/compose-classes";
import { SCRABBLE_RACK_SIZE } from "../../../config/scrabbleConstants";

export function TileRack() {
  const rack = useScrabbleGameStore((s) => s.rack);
  const selectedTile = useScrabbleGameStore((s) => s.selectedTile);
  const setSelectedTile = useScrabbleGameStore((s) => s.setSelectedTile);
  const tentativePlacements = useScrabbleGameStore((s) => s.tentativePlacements);
  const exchangeMode = useScrabbleGameStore((s) => s.exchangeMode);
  const selectedForExchange = useScrabbleGameStore((s) => s.selectedForExchange);
  const toggleExchangeSelection = useScrabbleGameStore((s) => s.toggleExchangeSelection);

  const displayRack = useMemo(
    () => rack.filter((t) => !tentativePlacements.some((p) => p.tile.id === t.id)),
    [rack, tentativePlacements]
  );
  const emptySlots = Math.max(0, SCRABBLE_RACK_SIZE - displayRack.length);
  const isMyTurn = useScrabbleGameStore(
    (s) => s.gameState?.gameState === "playing" && s.gameState.currentTurnPlayerId === s.currentPlayerId
  );
  const invalidMoveAt = useScrabbleGameStore((s) => s.invalidMoveAt);

  return (
    <div
      key={invalidMoveAt ?? "rack"}
      data-testid="tile-rack"
      role="group"
      aria-label="Tu atril"
      className={composeClasses(
        "mx-auto inline-flex items-center gap-1.5 rounded-xl border border-rack-edge bg-rack px-3 py-2.5 shadow-inner",
        isMyTurn && "animate-glow",
        invalidMoveAt !== null && "animate-shake"
      )}
    >
      {displayRack.map((tile, i) => {
        const isExchangeSelected = exchangeMode && selectedForExchange.has(tile.id);
        return (
          <div key={tile.id} className="relative">
            {/* Keyed by tile id: freshly drawn tiles are dealt in with a stagger */}
            <ScrabbleTile
              tile={tile}
              className="animate-deal"
              style={{ animationDelay: `${i * 45}ms` }}
              isSelected={exchangeMode ? isExchangeSelected : selectedTile?.id === tile.id}
              onClick={() =>
                exchangeMode
                  ? toggleExchangeSelection(tile.id)
                  : setSelectedTile(selectedTile?.id === tile.id ? null : tile)
              }
            />
            {isExchangeSelected && (
              <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-ink">
                ✓
              </span>
            )}
          </div>
        );
      })}
      {Array.from({ length: emptySlots }, (_, i) => (
        <div
          key={`empty-${i}`}
          aria-hidden
          className="h-11 w-11 rounded-md border border-dashed border-rack-edge/80 lg:h-14 lg:w-14"
        />
      ))}
    </div>
  );
}
