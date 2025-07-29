import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Scoreboard } from './Scoreboard';

interface JoinGameFormProps {
  onJoinGame: (playerName: string) => void;
  isConnected: boolean;
  socket: Socket | null;
}

export const JoinGameForm: React.FC<JoinGameFormProps> = ({ onJoinGame, isConnected, socket }) => {
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [useRandomName, setUseRandomName] = useState(true);
  
  // Cargar nombre desde localStorage al inicializar
  useEffect(() => {
    const savedName = localStorage.getItem('boggle-player-name');
    if (savedName) {
      setPlayerName(savedName);
      setUseRandomName(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return;
    
    setIsLoading(true);
    try {
      if (useRandomName || !playerName.trim()) {
        // Usar nombre aleatorio (el servidor lo asignará)
        onJoinGame('');
      } else {
        // Usar nombre personalizado
        const trimmedName = playerName.trim();
        localStorage.setItem('boggle-player-name', trimmedName);
        onJoinGame(trimmedName);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNameChange = (newName: string) => {
    setPlayerName(newName);
    // Guardar inmediatamente en localStorage cuando se edita
    if (newName.trim()) {
      localStorage.setItem('boggle-player-name', newName.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        {/* Encabezado */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎲</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Boggle</h1>
          <p className="text-gray-600">
            ¡Únete al desafío multijugador de búsqueda de palabras!
          </p>
        </div>

        {/* Estado de Conexión */}
        <div className="mb-4 p-3 rounded-lg border">
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-sm font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
              {isConnected ? '✅ Conectado al servidor' : '❌ Conectando al servidor...'}
            </span>
          </div>
        </div>

        {/* Opciones de nombre */}
        <div className="space-y-4">
          {/* Opción de nombre aleatorio */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="randomName"
                name="nameOption"
                checked={useRandomName}
                onChange={() => setUseRandomName(true)}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="randomName" className="text-sm font-medium text-gray-700">
                🎲 Usar nombre aleatorio
              </label>
            </div>
          </div>

          {/* Opción de nombre personalizado */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="customName"
                name="nameOption"
                checked={!useRandomName}
                onChange={() => setUseRandomName(false)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="customName" className="text-sm font-medium text-gray-700">
                ✏️ Usar nombre personalizado
              </label>
            </div>
            
            {!useRandomName && (
              <div className="ml-7 mt-3">
                <input
                  type="text"
                  placeholder="Tu nombre personalizado"
                  value={playerName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                  maxLength={20}
                  disabled={!isConnected || isLoading}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {playerName.length}/20 caracteres
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Formulario de unirse al juego */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">

          <button
            type="submit"
            disabled={(!useRandomName && !playerName.trim()) || !isConnected || isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Uniéndose...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>{useRandomName ? 'Unirse con Nombre Aleatorio' : 'Unirse al Juego'}</span>
              </>
            )}
          </button>
        </form>

        {/* Botón para ver scoreboard */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowScoreboard(true)}
            disabled={!isConnected}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center space-x-2 shadow-md"
          >
            <span>🏆</span>
            <span>Ver Mejores Puntajes</span>
          </button>
        </div>
      </div>
      
      {/* Modal del Scoreboard */}
      {showScoreboard && (
        <Scoreboard 
          socket={socket} 
          onClose={() => setShowScoreboard(false)} 
        />
      )}
    </div>
  );
};
