"use client";

import React from "react";
import { PlayersList } from "../../PlayersList";
import { DiceRollingAnimation } from "../../DiceRollingAnimation";
import { GameBoard } from "../../GameBoard";
import { MobileFooter } from "./mobile-footer";
import { MobileHeader } from "./MobileHeader";

export const ViewMobile = () => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <DiceRollingAnimation />
      <MobileHeader />
      <GameBoard />
      <PlayersList />
      <MobileFooter />
    </div>
  );
};
