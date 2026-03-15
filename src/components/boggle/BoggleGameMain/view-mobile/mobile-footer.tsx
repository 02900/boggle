"use client";

import React from "react";
import { useGameLogicStore } from "@/stores/game-logic.store";
import { useBoggleGameMainStore } from "../boogle-game-main.store";

export const MobileFooter = () => {
  const { currentWord, message } = useGameLogicStore();
  const { gameState } = useBoggleGameMainStore();

  if (gameState.gameState !== "playing") return null;

  return (
    <div className="bg-white shadow-sm p-3 border-t mt-auto">
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
