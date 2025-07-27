import React, { useState } from 'react';

interface JoinGameFormProps {
  onJoinGame: (playerName: string) => void;
  isConnected: boolean;
}

export const JoinGameForm: React.FC<JoinGameFormProps> = ({ onJoinGame, isConnected }) => {
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !isConnected) return;
    
    setIsLoading(true);
    try {
      onJoinGame(playerName.trim());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Boggle Game</h1>
          <p className="text-gray-600">
            Join the multiplayer word-finding challenge!
          </p>
        </div>

        {/* Connection Status */}
        <div className="mb-4 p-3 rounded-lg border">
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-sm font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
              {isConnected ? '✅ Connected to server' : '❌ Connecting to server...'}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
              Enter your name
            </label>
            <input
              id="playerName"
              type="text"
              placeholder="Your name (e.g., WordMaster)"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              maxLength={20}
              disabled={!isConnected || isLoading}
            />
            <div className="text-xs text-gray-500 mt-1">
              {playerName.length}/20 characters
            </div>
          </div>

          <button
            type="submit"
            disabled={!playerName.trim() || !isConnected || isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Joining...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Join Game</span>
              </>
            )}
          </button>
        </form>

        {/* Game Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Game Features:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Real-time multiplayer gameplay</li>
            <li>• 3-minute rounds</li>
            <li>• Score points for finding words</li>
            <li>• Compete with other players</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          Built with Socket.IO & Next.js
        </div>
      </div>
    </div>
  );
};
