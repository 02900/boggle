import React, { useEffect, useRef } from 'react';
import { GameState } from '@/interfaces/game';

interface GameBoardProps {
  gameState: GameState;
  currentWord: string;
  message: string;
  onCellMouseDown: (row: number, col: number) => void;
  onCellMouseEnter: (row: number, col: number) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  isCellSelected: (row: number, col: number) => boolean;
  onKeyboardInput: (letter: string) => void;
  onKeyboardSubmit: () => void;
  onKeyboardBackspace: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  currentWord,
  message,
  onCellMouseDown,
  onCellMouseEnter,
  onMouseUp,
  onMouseLeave,
  isCellSelected,
  onKeyboardInput,
  onKeyboardSubmit,
  onKeyboardBackspace,
}) => {
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Enfocar el input invisible cuando el componente se monta y el juego está activo
  useEffect(() => {
    if (gameState.gameState === 'playing' && hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  }, [gameState.gameState]);

  // Manejar entrada del teclado
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (gameState.gameState !== 'playing') return;

    const key = e.key.toLowerCase();
    
    if (key === 'enter') {
      onKeyboardSubmit();
    } else if (key === 'backspace') {
      onKeyboardBackspace();
    } else if (/^[a-záéíóúñü]$/.test(key)) {
      onKeyboardInput(key.toUpperCase());
    }
  };

  // Mantener el foco en el input invisible
  const handleInputBlur = () => {
    if (gameState.gameState === 'playing' && hiddenInputRef.current) {
      setTimeout(() => {
        hiddenInputRef.current?.focus();
      }, 0);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6" onClick={() => hiddenInputRef.current?.focus()}>
      {/* Input invisible para capturar teclas del teclado */}
      <input
        ref={hiddenInputRef}
        type="text"
        className="absolute opacity-0 pointer-events-none -z-10"
        onKeyDown={handleKeyDown}
        onBlur={handleInputBlur}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      
      <h2 className="text-2xl font-bold mb-4 text-center">Tablero de Juego</h2>
      
      {gameState.board.length > 0 ? (
        <div 
          className="grid grid-cols-4 gap-2 max-w-md mx-auto select-none"
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        >
          {gameState.board.map((row, rowIndex) =>
            row.map((letter, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`
                  w-16 h-16 flex items-center justify-center text-xl font-bold rounded-lg cursor-pointer transition-all
                  ${isCellSelected(rowIndex, colIndex) 
                    ? 'bg-blue-500 text-white scale-105 shadow-lg' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800 hover:scale-102'
                  }
                `}
                onMouseDown={() => onCellMouseDown(rowIndex, colIndex)}
                onMouseEnter={() => onCellMouseEnter(rowIndex, colIndex)}
              >
                {letter}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <div className="animate-pulse">
            <div className="text-lg mb-2">⏳</div>
            <div>Esperando que comience el juego...</div>
          </div>
        </div>
      )}
      
      {/* Mostrar Palabra Actual */}
      {currentWord && (
        <div className="mt-6 text-center">
          <div className="text-lg font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg inline-block">
            Palabra Actual: <span className="font-mono">{currentWord}</span>
          </div>
        </div>
      )}
      
      {/* Mostrar Mensaje */}
      {message && (
        <div className="mt-4 text-center">
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border-l-4 border-blue-400">
            {message}
          </div>
        </div>
      )}
    </div>
  );
};
