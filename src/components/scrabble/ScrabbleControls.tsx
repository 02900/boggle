"use client";

import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { useScrabbleSocket } from "@/hooks/use-scrabble-socket";

export function ScrabbleControls() {
  const { gameState, currentPlayerId, tentativePlacements, message, rack } =
    useScrabbleGameStore();
  const { startGame, submitTurn, passTurn, recallTiles, exchangeTiles, resetGame } =
    useScrabbleSocket();

  const isPlaying = gameState?.gameState === "playing";
  const isWaiting = gameState?.gameState === "waiting";
  const isFinished = gameState?.gameState === "finished";
  const isMyTurn = gameState?.currentTurnPlayerId === currentPlayerId;
  const hasPlacements = tentativePlacements.length > 0;
  const playerCount = gameState?.players.length ?? 0;

  return (
    <div className="flex flex-col gap-2">
      {message && (
        <div className="text-center text-sm text-gray-300 bg-gray-800 rounded px-3 py-1">
          {message}
        </div>
      )}

      <div className="flex gap-2 flex-wrap justify-center">
        {isWaiting && playerCount >= 2 && (
          <button
            onClick={startGame}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-medium transition-colors"
          >
            Iniciar Juego
          </button>
        )}

        {isPlaying && isMyTurn && (
          <>
            <button
              onClick={submitTurn}
              disabled={!hasPlacements}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
            >
              Confirmar
            </button>
            <button
              onClick={recallTiles}
              disabled={!hasPlacements}
              className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
            >
              Devolver
            </button>
            <button
              onClick={passTurn}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded font-medium transition-colors"
            >
              Pasar
            </button>
            <button
              onClick={() => {
                const tileIds = rack.map((t) => t.id);
                if (tileIds.length > 0) exchangeTiles(tileIds);
              }}
              disabled={hasPlacements || rack.length === 0}
              className="px-3 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
            >
              Cambiar
            </button>
          </>
        )}

        {isFinished && (
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium transition-colors"
          >
            Nueva Partida
          </button>
        )}
      </div>

      {isPlaying && (
        <div className="text-center text-xs text-gray-400">
          Fichas en bolsa: {gameState?.tileBagCount ?? 0}
        </div>
      )}
    </div>
  );
}
