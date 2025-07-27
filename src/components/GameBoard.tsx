import React from 'react';
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
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">Game Board</h2>
      
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
            <div>Waiting for game to start...</div>
          </div>
        </div>
      )}
      
      {/* Current Word Display */}
      {currentWord && (
        <div className="mt-6 text-center">
          <div className="text-lg font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg inline-block">
            Current Word: <span className="font-mono">{currentWord}</span>
          </div>
        </div>
      )}
      
      {/* Message Display */}
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
