"use client";

import React from "react";
import { ModalType, useModalStore } from "@/stores/modal.store";
import { useBoggleGameMainStore } from "../boogle-game-main.store";

export const DesktopHeader = () => {
  const { setModalType } = useModalStore();
  const { gameState } = useBoggleGameMainStore();

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-4xl font-bold text-center text-gray-800 mb-6 flex items-center justify-center space-x-2">
        🎲 Boggle
      </h1>

      {/* Botón de puntuación máxima */}
      <div className="flex space-x-3">
        {gameState.gameState === "finished" && (
          <button
            onClick={() => setModalType(ModalType.MaxScore)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            title="Puntuación Máxima"
          >
            <span>🏆</span>
            <span className="hidden sm:inline">Puntuación Máxima</span>
          </button>
        )}

        {/* Botón de configuración */}
        <button
          onClick={() => setModalType(ModalType.Settings)}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          title="Configuración"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
        {/* Botón de instrucciones */}
        <button
          onClick={() => setModalType(ModalType.Instructions)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          title="Instrucciones"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
