"use client";

import { useState } from "react";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import type { MoveRecord } from "@/interfaces/scrabble";

const TYPE_ICONS: Record<MoveRecord["type"], string> = {
  place: "\uD83D\uDCDD",
  pass: "\u23ED\uFE0F",
  exchange: "\uD83D\uDD04",
};

const TYPE_LABELS: Record<MoveRecord["type"], string> = {
  place: "Coloc\u00F3",
  pass: "Pas\u00F3",
  exchange: "Cambi\u00F3 fichas",
};

export function MoveHistory() {
  const { gameState } = useScrabbleGameStore();
  const [expanded, setExpanded] = useState(false);

  const moves = gameState?.moveHistory ?? [];

  if (moves.length === 0) return null;

  const displayMoves = [...moves].reverse();

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium text-gray-200 hover:bg-gray-700 transition-colors"
      >
        <span>Historial ({moves.length})</span>
        <span className="text-xs text-gray-400">{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>

      {expanded && (
        <div className="max-h-48 overflow-y-auto border-t border-gray-700">
          {displayMoves.map((move, i) => (
            <div
              key={moves.length - 1 - i}
              className="px-3 py-1.5 text-xs border-b border-gray-700/50 last:border-b-0"
            >
              <div className="flex items-center gap-1.5">
                <span>{TYPE_ICONS[move.type]}</span>
                <span className="font-medium text-gray-200">{move.playerName}</span>
                <span className="text-gray-400">{TYPE_LABELS[move.type]}</span>
                {move.score > 0 && (
                  <span className="ml-auto text-green-400 font-medium">
                    +{move.score}
                  </span>
                )}
              </div>
              {move.words && move.words.length > 0 && (
                <div className="mt-0.5 text-gray-400 pl-5">
                  {move.words.map((w) => `${w.word} (${w.score})`).join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
