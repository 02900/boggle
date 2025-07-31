import React from "react";
import { Player, GameStatus } from "@/interfaces/game";
import { useViewportStore } from "@/stores/viewport.store";

export const PlayersList = ({
  players,
  currentPlayerId,
  gameState = "waiting",
}: {
  players: Player[];
  currentPlayerId?: string;
  gameState?: GameStatus;
}) => {
  const { isMobile } = useViewportStore();

  // Determinar si se deben mostrar las puntuaciones
  const shouldShowScores = gameState === "finished" || isMobile;

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

  // Función para ordenar jugadores
  const getSortedPlayers = () => {
    if (shouldShowScores) {
      // Si se muestran puntuaciones, ordenar por puntuación
      return players.sort((a, b) => b.score - a.score);
    } else {
      // Si no se muestran puntuaciones, ordenar por nombre para mantener consistencia
      return players.sort((a, b) => a.name.localeCompare(b.name));
    }
  };
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-xl font-bold mb-3 flex items-center">
        <span className="mr-2">👥</span>
        Jugadores ({players.length})
      </h3>

      {players.length > 0 ? (
        <div className="space-y-2">
          {getSortedPlayers().map((player, index) => (
            <div
              key={player.id}
              className={`
                  flex justify-between items-center p-3 rounded-lg transition-all
                  ${
                    player.id === currentPlayerId
                      ? "bg-blue-100 border-2 border-blue-300"
                      : "bg-gray-50 hover:bg-gray-100"
                  }
                  ${
                    shouldShowScores && index === 0 && players.length > 1
                      ? "ring-2 ring-yellow-300"
                      : ""
                  }
                `}
            >
              <div className="flex items-center space-x-2">
                {shouldShowScores && index === 0 && players.length > 1 && (
                  <span className="text-yellow-500 text-lg">👑</span>
                )}
                <div>
                  <span className="font-medium text-gray-800">
                    {player.name}
                    {player.id === currentPlayerId && (
                      <span className="text-xs text-blue-600 ml-1">(Tú)</span>
                    )}
                  </span>
                  <div className="text-xs text-gray-500">
                    {/* Solo mostrar conteo de palabras al jugador actual durante la partida */}
                    {gameState === "finished" ||
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
                  {gameState === "finished" && (
                    <div className="mt-2 space-y-1">
                      {/* Palabras válidas */}
                      {player.wordsFound.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {player.wordsFound.map((word, wordIndex) => (
                            <span
                              key={`valid-${wordIndex}`}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-800"
                            >
                              {word}
                              <span className="ml-1 text-green-600 font-medium text-xs">
                                +{getWordScore(word)}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Palabras eliminadas */}
                      {player.eliminatedWords &&
                        player.eliminatedWords.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {player.eliminatedWords.map((word, wordIndex) => (
                              <span
                                key={`eliminated-${wordIndex}`}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-800 line-through"
                              >
                                {word}
                                <span className="ml-1 text-red-600 font-medium text-xs">
                                  -{getWordScore(word)}
                                </span>
                              </span>
                            ))}
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
                  </>
                ) : (
                  <div className="text-sm text-gray-400">
                    {gameState === "playing" ? "🎮" : "⏳"}
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
