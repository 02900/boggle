"use client";

import type { ScrabbleTile as ScrabbleTileType } from "@/interfaces/scrabble";

interface Props {
  tile: ScrabbleTileType;
  isSelected?: boolean;
  isPlaced?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}

export function ScrabbleTile({ tile, isSelected, isPlaced, onClick, size = "md" }: Props) {
  const sizeClasses = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  const letter = tile.isBlank
    ? tile.assignedLetter || "★"
    : tile.letter;

  return (
    <button
      onClick={onClick}
      className={`
        ${sizeClasses} relative flex items-center justify-center
        rounded font-bold cursor-pointer select-none
        transition-all duration-150
        ${isSelected
          ? "bg-yellow-300 ring-2 ring-yellow-500 scale-110"
          : isPlaced
            ? "bg-amber-200 border border-amber-400"
            : "bg-amber-100 border border-amber-300 hover:bg-amber-200"
        }
      `}
    >
      <span className="text-gray-800">{letter}</span>
      {tile.value > 0 && (
        <span className="absolute bottom-0 right-0.5 text-[8px] text-gray-500">
          {tile.value}
        </span>
      )}
    </button>
  );
}
