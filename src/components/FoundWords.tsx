import React from 'react';

interface FoundWordsProps {
  foundWords: string[];
  playerName?: string;
}

export const FoundWords: React.FC<FoundWordsProps> = ({ foundWords, playerName }) => {
  const getWordScore = (word: string): number => {
    const length = word.length;
    if (length <= 4) return 1;
    if (length === 5) return 2;
    if (length === 6) return 3;
    if (length === 7) return 5;
    return 11; // 8+ letras
  };

  const totalScore = foundWords.reduce((sum, word) => sum + getWordScore(word), 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-xl font-bold mb-3 flex items-center justify-between">
        <span className="flex items-center">
          <span className="mr-2">📝</span>
          {playerName ? `Palabras de ${playerName}` : 'Tus Palabras'}
        </span>
        <span className="text-sm font-normal text-gray-600">
          ({foundWords.length})
        </span>
      </h3>
      
      {totalScore > 0 && (
        <div className="mb-3 p-2 bg-green-50 rounded-lg border border-green-200">
          <div className="text-sm text-green-700 font-medium">
            Puntuación Total: <span className="text-lg font-bold">{totalScore}</span> puntos
          </div>
        </div>
      )}
      
      <div className="max-h-64 overflow-y-auto">
        {foundWords.length > 0 ? (
          <div className="space-y-1">
            {foundWords.map((word, index) => {
              const score = getWordScore(word);
              return (
                <div 
                  key={index} 
                  className="flex justify-between items-center bg-green-100 text-green-800 px-3 py-2 rounded-lg hover:bg-green-200 transition-colors"
                >
                  <span className="font-medium capitalize">{word}</span>
                  <span className="text-xs bg-green-200 px-2 py-1 rounded-full">
                    {score} pt{score !== 1 ? 's' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">🔍</div>
            <div className="text-sm">Aún no has encontrado palabras</div>
            <div className="text-xs text-gray-400 mt-1">
              ¡Comienza a buscar palabras en el tablero!
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
