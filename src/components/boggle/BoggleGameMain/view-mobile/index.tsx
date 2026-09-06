"use client";

import React from "react";
import { PlayersList } from "../../PlayersList";
import { DiceRollingAnimation } from "../../DiceRollingAnimation";
import { GameBoard } from "../../GameBoard";
import { useBoggleGameMainStore } from "../boogle-game-main.store";
import { MobileFooter } from "./mobile-footer";
import { MobileHeader } from "./MobileHeader";

export const ViewMobile = () => {
  const { gameState } = useBoggleGameMainStore();
  const isPlaying = gameState.gameState === "playing";

  return (
    <div className="min-h-dvh bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col text-gray-800">
      <DiceRollingAnimation />
      <MobileHeader />
      <div className="flex-1 flex flex-col justify-center">
        <GameBoard />
      </div>
      {/* Relleno inferior para que el footer fijo no tape la lista de jugadores */}
      <div className={`px-3 ${isPlaying ? "pb-24" : "pb-3"}`}>
        <PlayersList />
      </div>
      <MobileFooter />
    </div>
  );
};
