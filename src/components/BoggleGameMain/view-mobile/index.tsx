"use client";

import React from "react";
import { DiceRollingAnimation } from "../../DiceRollingAnimation";
import { GameBoard } from "../../GameBoard";
import { useBoggleGameMainStore } from "../boogle-game-main.store";
import { MobileHeader } from "./MobileHeader";
import { MobileFooter } from "./mobile-footer";
import { MobileResults } from "./mobile-results";

export const ViewMobile = () => {
  const { gameState } = useBoggleGameMainStore();

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <DiceRollingAnimation />
      <MobileHeader />
      {gameState.gameState === "finished" ? <MobileResults /> : <GameBoard />}
      <MobileFooter />
    </div>
  );
};
