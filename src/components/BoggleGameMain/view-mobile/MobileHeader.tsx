"use client";

import React from "react";
import { useSocket } from "@/hooks/useSocket";
import { ModalType, useModalStore } from "@/stores/modal.store";
import { useBoggleGameMainStore } from "../boogle-game-main.store";

export const MobileHeader = () => {
  const { setModalType } = useModalStore();
  const { gameState, rotationCooldown, rotationMessage, currentPlayerId } =
    useBoggleGameMainStore();

  const { startGame, rotateBoard, resetGame } = useSocket();

  return (
    <div className="bg-white shadow-sm p-3">
      <div className="flex justify-between items-center">
        <div className="text-lg font-bold text-gray-800">🎲 Boggle</div>

        {/* Tiempo restante */}
        <div className="flex items-center space-x-4">
          {gameState.gameState === "playing" && (
            <div className="text-lg font-bold text-blue-600">
              ⏱️ {Math.floor(gameState.timeLeft / 60)}:
              {(gameState.timeLeft % 60).toString().padStart(2, "0")}
            </div>
          )}

          {/* Puntos del jugador actual */}
          {gameState.players.find((p) => p.id === currentPlayerId) && (
            <div className="text-lg font-bold text-green-600">
              🏆{" "}
              {gameState.players.find((p) => p.id === currentPlayerId)?.score ||
                0}
            </div>
          )}
        </div>
      </div>

      {/* Controles de juego compactos */}
      {gameState.gameState === "waiting" && (
        <div className="mt-2 text-center">
          <button
            onClick={startGame}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold"
          >
            ▶️ Iniciar Juego
          </button>
        </div>
      )}

      {gameState.gameState === "playing" && (
        <div className="mt-2 flex justify-center space-x-2">
          <button
            onClick={rotateBoard}
            disabled={rotationCooldown > 0}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm font-semibold"
            title={
              rotationCooldown > 0
                ? `Espera ${rotationCooldown}s`
                : "Rotar tablero 90°"
            }
          >
            🔄 {rotationCooldown > 0 ? `${rotationCooldown}s` : "Rotar"}
          </button>
        </div>
      )}

      {gameState.gameState === "finished" && (
        <div className="mt-2 text-center space-y-2">
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => setModalType(ModalType.MaxScore)}
              className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-semibold"
            >
              🏆 Puntuación Máxima
            </button>
            <button
              onClick={resetGame}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold"
            >
              🔄 Nuevo Juego
            </button>
          </div>
        </div>
      )}

      {/* Mensaje de Error de Rotación en Móvil */}
      {rotationMessage && (
        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-center">
          <div className="text-red-700 text-xs font-medium">
            {rotationMessage}
          </div>
        </div>
      )}
    </div>
  );
};
