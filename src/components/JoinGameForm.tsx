import React, { useState, useEffect } from 'react';

interface JoinGameFormProps {
  onJoinGame: (playerName: string) => void;
  isConnected: boolean;
}

export const JoinGameForm: React.FC<JoinGameFormProps> = ({ onJoinGame, isConnected }) => {
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNameEditor, setShowNameEditor] = useState(false);
  
  // Cargar nombre desde localStorage al inicializar
  useEffect(() => {
    const savedName = localStorage.getItem('boggle-player-name');
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !isConnected) return;
    
    setIsLoading(true);
    try {
      const trimmedName = playerName.trim();
      // Guardar nombre en localStorage
      localStorage.setItem('boggle-player-name', trimmedName);
      onJoinGame(trimmedName);
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
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Juego de Boggle</h1>
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

        {/* Editor de nombre o formulario */}
        {playerName && !showNameEditor ? (
          /* Mostrar nombre guardado con opción de editar */
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-green-800 mb-1">
                    ¡Bienvenido de vuelta!
                  </div>
                  <div className="text-lg font-semibold text-green-900">
                    {playerName}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNameEditor(true)}
                  className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-800 rounded-md transition-colors"
                >
                  ✏️ Editar
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Formulario para ingresar/editar nombre */
          <div className="space-y-4">
            <div>
              <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
                {showNameEditor ? 'Editar tu nombre' : 'Ingresa tu nombre'}
              </label>
              <input
                id="playerName"
                type="text"
                placeholder="Tu nombre (ej: MaestroPalabras)"
                value={playerName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                maxLength={20}
                disabled={!isConnected || isLoading}
              />
              <div className="text-xs text-gray-500 mt-1">
                {playerName.length}/20 caracteres
              </div>
            </div>
            
            {showNameEditor && (
              <button
                type="button"
                onClick={() => setShowNameEditor(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                ✅ Guardar Cambios
              </button>
            )}
          </div>
        )}
        
        {/* Formulario de unirse al juego */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">

          <button
            type="submit"
            disabled={!playerName.trim() || !isConnected || isLoading}
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
                <span>Unirse al Juego</span>
              </>
            )}
          </button>
        </form>

        {/* Información del Juego */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Características del Juego:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Juego multijugador en tiempo real</li>
            <li>• Rondas de 3 minutos</li>
            <li>• Gana puntos por encontrar palabras</li>
            <li>• Compite con otros jugadores</li>
          </ul>
        </div>

        {/* Pie de página */}
        <div className="mt-6 text-center text-xs text-gray-500">
          Desarrollado con Socket.IO y Next.js
        </div>
      </div>
    </div>
  );
};
