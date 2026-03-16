"use client";

import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { ScrabbleTile } from "./ScrabbleTile";

export function TileRack() {
  const {
    rack,
    selectedTile,
    setSelectedTile,
    tentativePlacements,
    exchangeMode,
    selectedForExchange,
    toggleExchangeSelection,
  } = useScrabbleGameStore();

  const displayRack = rack.filter(
    (t) => !tentativePlacements.some((p) => p.tile.id === t.id)
  );

  return (
    <div className="flex gap-1 items-center justify-center p-2 bg-amber-800 rounded-lg">
      {displayRack.map((tile) => {
        const isExchangeSelected = exchangeMode && selectedForExchange.has(tile.id);

        return (
          <div key={tile.id} className="relative">
            <ScrabbleTile
              tile={tile}
              isSelected={exchangeMode ? isExchangeSelected : selectedTile?.id === tile.id}
              onClick={() => {
                if (exchangeMode) {
                  toggleExchangeSelection(tile.id);
                } else {
                  setSelectedTile(selectedTile?.id === tile.id ? null : tile);
                }
              }}
            />
            {isExchangeSelected && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                ✓
              </div>
            )}
          </div>
        );
      })}
      {displayRack.length === 0 && (
        <span className="text-amber-200 text-sm py-2 px-4">Sin fichas</span>
      )}
    </div>
  );
}
