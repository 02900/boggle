"use client";

import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { useScrabbleSocket } from "@/hooks/use-scrabble-socket";
import { ScrabbleTile } from "./ScrabbleTile";
import type { ScrabbleBoardCell, MultiplierType } from "@/interfaces/scrabble";

const MULTIPLIER_COLORS: Record<MultiplierType, string> = {
  TW: "bg-red-700",
  DW: "bg-pink-600",
  TL: "bg-blue-600",
  DL: "bg-cyan-600",
  CENTER: "bg-pink-600",
  NONE: "bg-green-800",
};

const MULTIPLIER_LABELS: Record<MultiplierType, string> = {
  TW: "TW",
  DW: "DW",
  TL: "TL",
  DL: "DL",
  CENTER: "★",
  NONE: "",
};

export function ScrabbleBoard() {
  const {
    gameState,
    selectedTile,
    tentativePlacements,
    currentPlayerId,
    setSelectedTile,
    addTentativePlacement,
  } = useScrabbleGameStore();
  const { placeTiles } = useScrabbleSocket();

  if (!gameState) return null;

  const isMyTurn = gameState.currentTurnPlayerId === currentPlayerId;

  const tentativeMap = new Map(
    tentativePlacements.map((p) => [`${p.row},${p.col}`, p])
  );

  function handleCellClick(cell: ScrabbleBoardCell) {
    // If we have a selected tile and cell is empty (no committed or tentative tile), place it
    const hasTentative = tentativeMap.has(`${cell.row},${cell.col}`);
    if (selectedTile && !cell.tile && !hasTentative && isMyTurn) {
      const placement = { tile: selectedTile, row: cell.row, col: cell.col };
      addTentativePlacement(placement);
      placeTiles([placement]);
      setSelectedTile(null);
    }
  }

  return (
    <div
      className="inline-grid gap-px bg-green-900 p-1 rounded"
      style={{ gridTemplateColumns: "repeat(15, 1fr)" }}
    >
      {gameState.board.map((row, r) =>
        row.map((cell, c) => {
          const tentative = tentativeMap.get(`${r},${c}`);
          const hasTile = cell.tile !== null;
          const hasTentative = tentative !== undefined;

          return (
            <button
              key={`${r}-${c}`}
              onClick={() => handleCellClick(cell)}
              className={`
                w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center
                text-[10px] font-bold rounded-sm
                transition-colors duration-100
                ${hasTile || hasTentative
                  ? ""
                  : `${MULTIPLIER_COLORS[cell.multiplier]} ${
                      isMyTurn && selectedTile ? "cursor-pointer hover:brightness-125" : ""
                    }`
                }
              `}
            >
              {hasTile && cell.tile ? (
                <ScrabbleTile tile={cell.tile} size="sm" />
              ) : hasTentative && tentative ? (
                <ScrabbleTile tile={tentative.tile} size="sm" isPlaced />
              ) : (
                <span className="text-white/40">
                  {MULTIPLIER_LABELS[cell.multiplier]}
                </span>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}
