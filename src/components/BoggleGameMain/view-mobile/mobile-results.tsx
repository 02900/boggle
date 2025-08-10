"use client";

import React from "react";
import Link from "next/link";
import { useBoggleGameMainStore } from "../boogle-game-main.store";
import { useBoggleGameMain } from "../use-boggle-game-main";

export const MobileResults = () => {
  const { gameState, currentPlayerId } = useBoggleGameMainStore();

  const { getWordScore } = useBoggleGameMain();
  return (
    <div className="bg-white rounded-lg shadow-md p-6 h-full gap-4 flex flex-col  overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
        🏆 ¡Juego Terminado!
      </h2>

      {/* Clasificación de jugadores */}
      {(gameState.allParticipants || gameState.players)
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
                      {player.isConnected === false && (
                        <span className="text-xs text-red-600 ml-1">
                          (Desconectado)
                        </span>
                      )}
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
                        {sortedWords.map(({ word, score }, wordIndex) => {
                          const raeUrl = `https://dle.rae.es/${encodeURIComponent(
                            word.toLowerCase()
                          )}?m=form`;
                          return (
                            <Link
                              key={`valid-${wordIndex}`}
                              href={raeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`
                                          inline-flex items-center px-2 py-1 rounded-full text-xs font-medium hover:no-underline transition-colors
                                          ${
                                            score >= 5
                                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                                              : score >= 3
                                              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                          }
                                        `}
                              title="Clic para ver definición RAE"
                            >
                              {word}
                              <span className="ml-1 text-xs opacity-75">
                                +{score}pts
                              </span>
                            </Link>
                          );
                        })}
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
                            const raeUrl = `https://dle.rae.es/${encodeURIComponent(
                              word.toLowerCase()
                            )}?m=form`;
                            return (
                              <Link
                                key={`eliminated-${wordIndex}`}
                                href={raeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 line-through hover:bg-red-200 hover:no-underline transition-colors"
                                title="Clic para ver definición RAE"
                              >
                                {word}
                                <span className="ml-1 text-xs opacity-75">
                                  -{score}pts
                                </span>
                              </Link>
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
  );
};
