"use client";

import React from "react";
import { useGameLogicStore } from "@/stores/game-logic.store";
import { useBoggleGameMainStore } from "../boogle-game-main.store";

export const MobileFooter = () => {
  const { currentWord, message } = useGameLogicStore();
  const { gameState } = useBoggleGameMainStore();

  if (gameState.gameState !== "playing") return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.08)] p-3 border-t min-h-14">
      {currentWord && (
        <div className="text-center mb-2">
          <span className="text-lg font-bold text-blue-600">{currentWord}</span>
        </div>
      )}

      {message && (
        <div className="text-center mt-2">
          <div className="text-xs text-red-500">{message}</div>
        </div>
      )}
    </div>
  );
};
