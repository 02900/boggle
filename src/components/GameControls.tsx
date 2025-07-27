import React from 'react';
import { GameStatus } from '@/interfaces/game';

interface GameControlsProps {
  gameState: GameStatus;
  timeLeft: number;
  onStartGame: () => void;
  onResetGame: () => void;
  isConnected: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  gameState,
  timeLeft,
  onStartGame,
  onResetGame,
  isConnected,
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: GameStatus): string => {
    switch (status) {
      case 'waiting':
        return 'text-yellow-600';
      case 'playing':
        return 'text-green-600';
      case 'finished':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: GameStatus): string => {
    switch (status) {
      case 'waiting':
        return '⏳';
      case 'playing':
        return '🎮';
      case 'finished':
        return '🏁';
      default:
        return '❓';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Game Status */}
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStatusIcon(gameState)}</span>
          <div className="text-lg font-semibold">
            Status: <span className={`capitalize ${getStatusColor(gameState)}`}>
              {gameState}
            </span>
          </div>
        </div>

        {/* Timer */}
        {gameState === 'playing' && (
          <div className="flex items-center space-x-2">
            <span className="text-lg">⏰</span>
            <div className={`text-xl font-bold ${timeLeft <= 30 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex space-x-2">
          {gameState === 'waiting' && (
            <button
              onClick={onStartGame}
              disabled={!isConnected}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
            >
              <span>🚀</span>
              <span>Start Game</span>
            </button>
          )}
          
          <button
            onClick={onResetGame}
            disabled={!isConnected}
            className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2"
          >
            <span>🔄</span>
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Game Progress Bar */}
      {gameState === 'playing' && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-1000 ${
                timeLeft <= 30 ? 'bg-red-500' : timeLeft <= 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${(timeLeft / 180) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">
            Game Progress
          </div>
        </div>
      )}
    </div>
  );
};
