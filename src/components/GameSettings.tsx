import React from 'react';

interface GameSettingsProps {
  eliminateCommonWords: boolean;
  onToggleEliminateCommonWords: (enabled: boolean) => void;
  gameState: 'waiting' | 'playing' | 'finished';
}

export const GameSettings: React.FC<GameSettingsProps> = ({
  eliminateCommonWords,
  onToggleEliminateCommonWords,
  gameState
}) => {
  // Solo mostrar configuraciones cuando el juego no está en progreso
  if (gameState === 'playing') {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-bold mb-3 flex items-center">
        <span className="mr-2">⚙️</span>
        Configuración del Juego
      </h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label 
              htmlFor="eliminate-common-words" 
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Eliminar palabras comunes
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Al finalizar, se eliminan las palabras encontradas por múltiples jugadores
            </p>
          </div>
          <div className="ml-3">
            <input
              id="eliminate-common-words"
              type="checkbox"
              checked={eliminateCommonWords}
              onChange={(e) => onToggleEliminateCommonWords(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
