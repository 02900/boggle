"use client";

import React from "react";
import { PlayersList } from "@/components/PlayersList";
import { DiceRollingAnimation } from "../../DiceRollingAnimation";
import { GameBoard } from "../../GameBoard";
import { useBoggleGameMainStore } from "../boogle-game-main.store";
import { MobileFooter } from "./mobile-footer";
import { MobileHeader } from "./MobileHeader";

export const ViewMobile = () => {
  const { gameState } = useBoggleGameMainStore();

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <DiceRollingAnimation />
      <MobileHeader />
      <GameBoard />
      {gameState.gameState === "finished" && <PlayersList />}
      <MobileFooter />
    </div>
  );
};
