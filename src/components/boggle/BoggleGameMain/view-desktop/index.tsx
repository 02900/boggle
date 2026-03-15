"use client";

import React from "react";
import { DiceRollingAnimation } from "../../DiceRollingAnimation";
import { GameBoard } from "../../GameBoard";
import { GameControls } from "../../GameControls";
import { PlayersList } from "../../PlayersList";
import { DesktopHeader } from "./desktop-header";

export const ViewDesktop = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <DiceRollingAnimation />

      <div className="max-w-7xl mx-auto">
        <DesktopHeader />
        <GameControls />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-2">
            <GameBoard />
          </div>

          <div className="xl:col-span-2 space-y-6">
            <PlayersList />
          </div>
        </div>
      </div>
    </div>
  );
};
