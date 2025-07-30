"use client";

import React from "react";
import { useGameLogicStore } from "@/stores/game-logic.store";
import { ModalType, useModalStore } from "@/stores/modal.store";
import { DiceRollingAnimation } from "../DiceRollingAnimation";
import { GameBoard } from "../GameBoard";
import { useBoggleGameMainStore } from "./boogle-game.main.store";
import { useBoggleGameMain } from "./use-boggle-game-main";

export const ViewMobile = () => {
  const { currentWord, message } = useGameLogicStore();
  const { setModalType } = useModalStore();
  const { gameState, rotationCooldown, rotationMessage, currentPlayerId } =
    useBoggleGameMainStore();

  const { getWordScore, startGame, rotateBoard, resetGame } =
    useBoggleGameMain();

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col overflow-hidden">
      {/* Animación de lanzamiento de dados */}
      <DiceRollingAnimation />

      {/* Header compacto con tiempo y puntos */}
      <div className="flex-shrink-0 bg-white shadow-sm p-3">
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
                {gameState.players.find((p) => p.id === currentPlayerId)
                  ?.score || 0}
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
            {/* <button
                onClick={resetGame}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold"
              >
                ♾️ Reiniciar
              </button> */}
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

      {/* Tablero de juego o resultados finales - ocupa el resto del espacio */}
      {gameState.gameState === "finished" ? (
        /* Pantalla de resultados finales */
        <div className="bg-white rounded-lg shadow-md p-6 h-full gap-4 flex flex-col  overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
            🏆 ¡Juego Terminado!
          </h2>

          {/* Clasificación de jugadores */}

          {gameState.players
            .sort((a, b) => b.score - a.score)
            .map((player, index) => {
              const isCurrentPlayer = player.id === currentPlayerId;
              const medal =
                index === 0
                  ? "🥇"
                  : index === 1
                  ? "🥈"
                  : index === 2
                  ? "🥉"
                  : `${index + 1}º`;

              // Ordenar palabras del jugador por puntaje (mayor a menor)
              const sortedWords = [...player.wordsFound]
                .map((word) => ({ word, score: getWordScore(word) }))
                .sort((a, b) => b.score - a.score);

              return (
                <div
                  key={player.id}
                  className={`
                            p-4 rounded-lg border-2
                            ${
                              isCurrentPlayer
                                ? "bg-blue-50 border-blue-300"
                                : "bg-gray-50 border-gray-200"
                            }
                          `}
                >
                  {/* Header del jugador */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{medal}</span>
                      <div>
                        <div
                          className={`font-semibold ${
                            isCurrentPlayer ? "text-blue-800" : "text-gray-800"
                          }`}
                        >
                          {player.name} {isCurrentPlayer && "(Tú)"}
                        </div>
                        <div className="text-sm text-gray-600">
                          {player.wordsFound.length} palabras encontradas
                          {player.eliminatedWords &&
                            player.eliminatedWords.length > 0 && (
                              <span className="text-red-500 ml-1">
                                ({player.eliminatedWords.length} eliminadas)
                              </span>
                            )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`text-xl font-bold ${
                        isCurrentPlayer ? "text-blue-600" : "text-gray-700"
                      }`}
                    >
                      {player.score} pts
                    </div>
                  </div>

                  {/* Lista de palabras ordenadas por puntaje */}
                  {(sortedWords.length > 0 ||
                    (player.eliminatedWords &&
                      player.eliminatedWords.length > 0)) && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Palabras encontradas:
                      </div>

                      {/* Palabras válidas */}
                      {sortedWords.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs font-medium text-green-600 mb-1">
                            Válidas ({sortedWords.length}):
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {sortedWords.map(({ word, score }, wordIndex) => (
                              <span
                                key={`valid-${wordIndex}`}
                                className={`
                                          inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                                          ${
                                            score >= 5
                                              ? "bg-green-100 text-green-800"
                                              : score >= 3
                                              ? "bg-yellow-100 text-yellow-800"
                                              : "bg-gray-100 text-gray-700"
                                          }
                                        `}
                              >
                                {word}
                                <span className="ml-1 text-xs opacity-75">
                                  +{score}pts
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Palabras eliminadas */}
                      {player.eliminatedWords &&
                        player.eliminatedWords.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-red-600 mb-1">
                              Eliminadas ({player.eliminatedWords.length}
                              ):
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {player.eliminatedWords.map((word, wordIndex) => {
                                const score = getWordScore(word);
                                return (
                                  <span
                                    key={`eliminated-${wordIndex}`}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 line-through"
                                  >
                                    {word}
                                    <span className="ml-1 text-xs opacity-75">
                                      -{score}pts
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Palabras encontradas por múltiples jugadores
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        /* Tablero de juego normal */
        <GameBoard />
      )}

      {/* Footer con palabra actual y últimas palabras encontradas */}
      {gameState.gameState === "playing" && (
        <div className="flex-shrink-0 bg-white shadow-sm p-3 border-t">
          {currentWord && (
            <div className="text-center mb-2">
              <span className="text-lg font-bold text-blue-600">
                {currentWord}
              </span>
            </div>
          )}

          {message && (
            <div className="text-center mt-2">
              <div className="text-xs text-red-500">{message}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
