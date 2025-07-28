/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';

interface WordData {
  word: string;
  points: number;
  path: [number, number][];
}

interface MaxScoreData {
  words: WordData[];
  maxScore: number;
  totalWords: number;
}

interface MaxScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  socket: any;
}

export const MaxScoreModal: React.FC<MaxScoreModalProps> = ({ isOpen, onClose, socket }) => {
  const [maxScoreData, setMaxScoreData] = useState<MaxScoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'byPoints' | 'alphabetical'>('byPoints');

  useEffect(() => {
    if (!socket) return;

    socket.on('max-score-data', (data: MaxScoreData) => {
      setMaxScoreData(data);
      setLoading(false);
    });

    return () => {
      socket.off('max-score-data');
    };
  }, [socket]);

  useEffect(() => {
    if (isOpen && socket && !maxScoreData) {
      setLoading(true);
      socket.emit('get-max-score');
    }
  }, [isOpen, socket, maxScoreData]);

  if (!isOpen) return null;

  const sortedWords = maxScoreData?.words ? [...maxScoreData.words] : [];
  if (activeTab === 'alphabetical') {
    sortedWords.sort((a, b) => a.word.localeCompare(b.word));
  }

  const groupedByPoints = sortedWords.reduce((acc, word) => {
    if (!acc[word.points]) {
      acc[word.points] = [];
    }
    acc[word.points].push(word);
    return acc;
  }, {} as Record<number, WordData[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Puntuación Máxima Posible</h2>
            {maxScoreData && (
              <p className="text-gray-600 mt-1">
                {maxScoreData.totalWords} palabras • {maxScoreData.maxScore} puntos máximos
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('byPoints')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'byPoints'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Por Puntos
          </button>
          <button
            onClick={() => setActiveTab('alphabetical')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'alphabetical'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Alfabético
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Calculando palabras posibles...</span>
            </div>
          ) : maxScoreData ? (
            <div>
              {activeTab === 'byPoints' ? (
                <div className="space-y-6">
                  {Object.entries(groupedByPoints)
                    .sort(([a], [b]) => parseInt(b) - parseInt(a))
                    .map(([points, words]) => (
                      <div key={points} className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">
                          {points} punto{parseInt(points) !== 1 ? 's' : ''} ({words.length} palabra{words.length !== 1 ? 's' : ''})
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                          {words.map((wordData, index) => (
                            <div
                              key={index}
                              className="bg-white px-3 py-2 rounded border text-sm font-medium text-gray-700 hover:bg-blue-50 transition-colors"
                            >
                              {wordData.word.toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {sortedWords.map((wordData, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 px-3 py-2 rounded border text-sm font-medium text-gray-700 hover:bg-blue-50 transition-colors flex justify-between items-center"
                    >
                      <span>{wordData.word.toUpperCase()}</span>
                      <span className="text-blue-600 text-xs font-bold">
                        {wordData.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 h-32 flex items-center justify-center">
              No hay datos disponibles
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 rounded-b-lg">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              💡 Estas son todas las palabras válidas que se pueden formar en este tablero
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
