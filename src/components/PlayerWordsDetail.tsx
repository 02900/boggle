import React, { useState } from 'react';
import { Player } from '@/interfaces/game';

interface PlayerWordsDetailProps {
  players: Player[];
  gameState: 'waiting' | 'playing' | 'finished';
}

export const PlayerWordsDetail: React.FC<PlayerWordsDetailProps> = ({
  players,
  gameState
}) => {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  // Solo mostrar detalles cuando el juego ha terminado
  if (gameState !== 'finished' || players.length === 0) {
    return null;
  }

  const togglePlayerExpansion = (playerId: string) => {
    setExpandedPlayer(expandedPlayer === playerId ? null : playerId);
  };

  const getWordScore = (word: string): number => {
    const length = word.length;
    if (length < 3) return 0;
    if (length <= 4) return 1;
    if (length === 5) return 2;
    if (length === 6) return 3;
    if (length === 7) return 5;
    return 11; // 8+ letras
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-bold mb-3 flex items-center">
        <span className="mr-2">📝</span>
        Palabras Encontradas
      </h3>
      
      <div className="space-y-3">
        {players
          .sort((a, b) => b.score - a.score)
          .map((player) => (
            <div key={player.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => togglePlayerExpansion(player.id)}
                className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 flex justify-between items-center transition-colors"
              >
                <div>
                  <span className="font-medium">{player.name}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({player.wordsFound.length} palabras válidas
                    {player.eliminatedWords && player.eliminatedWords.length > 0 && (
                      <span className="text-red-500">
                        , {player.eliminatedWords.length} eliminadas
                      </span>
                    )})
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-blue-600">{player.score} pts</span>
                  <span className="text-gray-400">
                    {expandedPlayer === player.id ? '▼' : '▶'}
                  </span>
                </div>
              </button>
              
              {expandedPlayer === player.id && (
                <div className="p-3 bg-white border-t">
                  {/* Palabras válidas */}
                  {player.wordsFound.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-green-600 mb-2">
                        Palabras Válidas ({player.wordsFound.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {player.wordsFound.map((word, index) => (
                          <span
                            key={`valid-${index}`}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-green-100 text-green-800"
                          >
                            {word}
                            <span className="ml-1 text-green-600 font-medium">
                              +{getWordScore(word)}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Palabras eliminadas */}
                  {player.eliminatedWords && player.eliminatedWords.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-red-600 mb-2">
                        Palabras Eliminadas ({player.eliminatedWords.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {player.eliminatedWords.map((word, index) => (
                          <span
                            key={`eliminated-${index}`}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-red-100 text-red-800 line-through"
                          >
                            {word}
                            <span className="ml-1 text-red-600 font-medium">
                              -{getWordScore(word)}
                            </span>
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Estas palabras fueron encontradas por múltiples jugadores y han sido eliminadas.
                      </p>
                    </div>
                  )}
                  
                  {player.wordsFound.length === 0 && (!player.eliminatedWords || player.eliminatedWords.length === 0) && (
                    <p className="text-gray-500 text-sm italic">
                      No se encontraron palabras válidas.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};
