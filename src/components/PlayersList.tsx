import React, { useState, useEffect } from 'react';
import { Player, GameStatus } from '@/interfaces/game';

interface PlayersListProps {
  players: Player[];
  currentPlayerId?: string;
  gameState?: GameStatus;
}

export const PlayersList: React.FC<PlayersListProps> = ({ players, currentPlayerId, gameState = 'waiting' }) => {
  const [isMobile, setIsMobile] = useState(false);
  
  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Determinar si se deben mostrar las puntuaciones
  const shouldShowScores = gameState === 'finished' || isMobile;
  
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
                  ${player.id === currentPlayerId 
                    ? 'bg-blue-100 border-2 border-blue-300' 
                    : 'bg-gray-50 hover:bg-gray-100'
                  }
                  ${shouldShowScores && index === 0 && players.length > 1 ? 'ring-2 ring-yellow-300' : ''}
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
                      {player.wordsFound.length} palabras encontradas
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  {(shouldShowScores || player.id === currentPlayerId) ? (
                    <>
                      <div className="text-lg font-bold text-blue-600">
                        {player.score}
                      </div>
                      <div className="text-xs text-gray-500">puntos</div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-400">
                      {gameState === 'playing' ? '🎮' : '⏳'}
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
