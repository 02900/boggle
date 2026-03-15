"use client";

import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { ScrabbleTile } from "./ScrabbleTile";

export function TileRack() {
  const { rack, selectedTile, setSelectedTile, tentativePlacements } = useScrabbleGameStore();

  const displayRack = rack.filter(
    (t) => !tentativePlacements.some((p) => p.tile.id === t.id)
  );

  return (
    <div className="flex gap-1 items-center justify-center p-2 bg-amber-800 rounded-lg">
      {displayRack.map((tile) => (
        <ScrabbleTile
          key={tile.id}
          tile={tile}
          isSelected={selectedTile?.id === tile.id}
          onClick={() =>
            setSelectedTile(selectedTile?.id === tile.id ? null : tile)
          }
        />
      ))}
      {displayRack.length === 0 && (
        <span className="text-amber-200 text-sm py-2 px-4">Sin fichas</span>
      )}
    </div>
  );
}
