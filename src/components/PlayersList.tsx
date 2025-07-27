import React from 'react';
import { Player } from '@/interfaces/game';

interface PlayersListProps {
  players: Player[];
  currentPlayerId?: string;
}

export const PlayersList: React.FC<PlayersListProps> = ({ players, currentPlayerId }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-xl font-bold mb-3 flex items-center">
        <span className="mr-2">👥</span>
        Players ({players.length})
      </h3>
      
      {players.length > 0 ? (
        <div className="space-y-2">
          {players
            .sort((a, b) => b.score - a.score) // Sort by score descending
            .map((player, index) => (
              <div 
                key={player.id} 
                className={`
                  flex justify-between items-center p-3 rounded-lg transition-all
                  ${player.id === currentPlayerId 
                    ? 'bg-blue-100 border-2 border-blue-300' 
                    : 'bg-gray-50 hover:bg-gray-100'
                  }
                  ${index === 0 && players.length > 1 ? 'ring-2 ring-yellow-300' : ''}
                `}
              >
                <div className="flex items-center space-x-2">
                  {index === 0 && players.length > 1 && (
                    <span className="text-yellow-500 text-lg">👑</span>
                  )}
                  <div>
                    <span className="font-medium text-gray-800">
                      {player.name}
                      {player.id === currentPlayerId && (
                        <span className="text-xs text-blue-600 ml-1">(You)</span>
                      )}
                    </span>
                    <div className="text-xs text-gray-500">
                      {player.wordsFound.length} words found
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {player.score}
                  </div>
                  <div className="text-xs text-gray-500">points</div>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-4">
          <div className="text-4xl mb-2">🤷‍♂️</div>
          <div>No players yet</div>
        </div>
      )}
    </div>
  );
};
