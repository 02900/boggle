import React from "react";
import Link from "next/link";
import { useBoggleGameMainStore } from "./BoggleGameMain/boogle-game-main.store";

export const PlayersList = () => {
  const { gameState, currentPlayerId } = useBoggleGameMainStore();

  // Determinar si se deben mostrar las puntuaciones
  const shouldShowScores = gameState.gameState === "finished";

  // Función para calcular el puntaje de una palabra
  const getWordScore = (word: string): number => {
    const length = word.length;
    if (length < 3) return 0;
    if (length <= 4) return 1;
    if (length === 5) return 2;
    if (length === 6) return 3;
    if (length === 7) return 5;
    return 11; // 8+ letras
  };

  // Mapea la categoría de puntos a una paleta de colores distinta
  const getScoreBadgeClass = (score: number): string => {
    switch (score) {
      case 1:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
      case 2:
        return "bg-emerald-100 text-emerald-800 hover:bg-emerald-200";
      case 3:
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case 5:
        return "bg-purple-100 text-purple-800 hover:bg-purple-200";
      case 11:
        return "bg-orange-100 text-orange-800 hover:bg-orange-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  // Función para obtener todos los participantes (conectados y desconectados)
  const getAllParticipants = () => {
    if (gameState.gameState === "finished" && gameState.allParticipants) {
      // Al final del juego, mostrar todos los participantes
      return gameState.allParticipants;
    } else {
      // Durante el juego, mostrar solo jugadores conectados
      return gameState.players;
    }
  };

  // Función para ordenar jugadores
  const getSortedPlayers = () => {
    const participants = getAllParticipants();
    if (shouldShowScores) {
      // Si se muestran puntuaciones, ordenar por puntuación
      return participants.sort((a, b) => b.score - a.score);
    } else {
      // Si no se muestran puntuaciones, ordenar por nombre para mantener consistencia
      return participants.sort((a, b) => a.name.localeCompare(b.name));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-xl font-bold mb-3 flex items-center">
        <span className="mr-2">👥</span>
        {gameState.gameState === "finished" && gameState.allParticipants ? (
          <>
            Participantes ({gameState.allParticipants.length})
            {gameState.allParticipants.length > gameState.players.length && (
              <span className="ml-2 text-sm text-gray-500 font-normal">
                ({gameState.allParticipants.length - gameState.players.length}{" "}
                desconectados)
              </span>
            )}
          </>
        ) : (
          `Jugadores (${gameState.players.length})`
        )}
      </h3>

      {getAllParticipants().length > 0 ? (
        <div className="space-y-2">
          {getSortedPlayers().map((player, index) => (
            <div
              key={player.id}
              className={`
                  flex justify-between items-center p-3 rounded-lg transition-all
                  ${
                    player.id === currentPlayerId
                      ? "bg-blue-100 border-2 border-blue-300"
                      : player.isConnected === false
                      ? "bg-red-50 border border-red-200 opacity-75"
                      : "bg-gray-50 hover:bg-gray-100"
                  }
                  ${
                    shouldShowScores &&
                    index === 0 &&
                    getAllParticipants().length > 1
                      ? "ring-2 ring-yellow-300"
                      : ""
                  }
                `}
            >
              <div className="flex items-center space-x-2">
                {shouldShowScores && getAllParticipants().length > 1 && (
                  <span className="text-xl">
                    {index === 0
                      ? "🥇"
                      : index === 1
                      ? "🥈"
                      : index === 2
                      ? "🥉"
                      : `${index + 1}º`}
                  </span>
                )}
                <div>
                  <span className="font-medium text-gray-800">
                    {player.name}
                    {player.id === currentPlayerId && (
                      <span className="text-xs text-blue-600 ml-1">(Tú)</span>
                    )}
                    {player.isConnected === false && (
                      <span className="text-xs text-red-600 ml-1">
                        (Desconectado)
                      </span>
                    )}
                  </span>
                  <div className="text-xs text-gray-500">
                    {/* Solo mostrar conteo de palabras al jugador actual durante la partida */}
                    {gameState.gameState === "finished" ||
                    player.id === currentPlayerId ? (
                      <>
                        {player.wordsFound.length} palabras encontradas
                        {player.eliminatedWords &&
                          player.eliminatedWords.length > 0 && (
                            <span className="text-red-500 ml-1">
                              ({player.eliminatedWords.length} eliminadas)
                            </span>
                          )}
                      </>
                    ) : (
                      <span className="text-gray-400">Jugando...</span>
                    )}
                  </div>

                  {/* Mostrar palabras cuando el juego ha terminado */}
                  {gameState.gameState === "finished" && (
                    <div className="mt-2 space-y-1">
                      {/* Palabras válidas ordenadas por puntaje */}
                      {player.wordsFound.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {[...player.wordsFound]
                            .map((word) => ({
                              word,
                              score: getWordScore(word),
                            }))
                            .sort((a, b) => b.score - a.score)
                            .map(({ word, score }, wordIndex) => {
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
                                    ${getScoreBadgeClass(score)}
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
                      )}

                      {/* Palabras eliminadas ordenadas por puntaje */}
                      {player.eliminatedWords &&
                        player.eliminatedWords.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {[...player.eliminatedWords]
                              .map((word) => ({
                                word,
                                score: getWordScore(word),
                              }))
                              .sort((a, b) => b.score - a.score)
                              .map(({ word, score }, wordIndex) => {
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
                        )}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                {shouldShowScores || player.id === currentPlayerId ? (
                  <>
                    <div className="text-lg font-bold text-blue-600">
                      {player.score}
                    </div>
                    <div className="text-xs text-gray-500">puntos</div>
                    {/* Mostrar total de victorias en las últimas 6 horas */}
                    {shouldShowScores &&
                      gameState.playerStreaks &&
                      gameState.playerStreaks[player.name] > 0 && (
                        <div className="text-xs text-orange-600 font-medium mt-1">
                          🏆 {gameState.playerStreaks[player.name]} victoria
                          {gameState.playerStreaks[player.name] > 1 ? "s" : ""} (6h)
                        </div>
                      )}
                  </>
                ) : (
                  <div className="text-sm text-gray-400">
                    {gameState.gameState === "playing" ? "🎮" : "⏳"}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-4">
          <div className="text-4xl mb-2">🤷‍♂️</div>
          <div>Aún no hay jugadores</div>
        </div>
      )}
    </div>
  );
};
