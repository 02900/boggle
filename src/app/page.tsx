'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Player {
  id: string;
  name: string;
  score: number;
  wordsFound: string[];
}

interface GameState {
  board: string[][];
  players: Player[];
  gameState: 'waiting' | 'playing' | 'finished';
  timeLeft: number;
}

interface WordResult {
  valid: boolean;
  reason?: string;
  points?: number;
  word?: string;
}

export default function BoggleGame() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    board: [],
    players: [],
    gameState: 'waiting',
    timeLeft: 180
  });
  const [playerName, setPlayerName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [selectedPath, setSelectedPath] = useState<[number, number][]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('game-state', (state: GameState) => {
      setGameState(state);
    });

    newSocket.on('game-started', (state: GameState) => {
      setGameState(state);
      setMessage('Game started! Find words on the board.');
    });

    newSocket.on('timer-update', (timeLeft: number) => {
      setGameState(prev => ({ ...prev, timeLeft }));
    });

    newSocket.on('game-ended', (state: GameState) => {
      setGameState(state);
      setMessage('Game ended! Check the final scores.');
    });

    newSocket.on('word-result', (result: WordResult) => {
      if (result.valid) {
        setFoundWords(prev => [...prev, result.word!]);
        setMessage(`Great! "${result.word}" is worth ${result.points} points!`);
      } else {
        setMessage(`"${currentWord}" - ${result.reason}`);
      }
      setCurrentWord('');
      setSelectedPath([]);
    });

    newSocket.on('player-joined', ({ playerName }) => {
      setMessage(`${playerName} joined the game!`);
    });

    newSocket.on('player-left', () => {
      setMessage('A player left the game.');
    });

    newSocket.on('game-reset', (state: GameState) => {
      setGameState(state);
      setFoundWords([]);
      setMessage('Game has been reset!');
    });

    return () => {
      newSocket.close();
    };
  }, [currentWord]);

  const joinGame = () => {
    if (socket && playerName.trim()) {
      socket.emit('join-game', playerName.trim());
      setIsJoined(true);
    }
  };

  const startGame = () => {
    if (socket) {
      socket.emit('start-game');
    }
  };

  const resetGame = () => {
    if (socket) {
      socket.emit('reset-game');
    }
  };

  const handleCellMouseDown = (row: number, col: number) => {
    if (gameState.gameState !== 'playing') return;
    
    setIsSelecting(true);
    setSelectedPath([[row, col]]);
    setCurrentWord(gameState.board[row][col]);
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!isSelecting || gameState.gameState !== 'playing') return;
    
    const lastCell = selectedPath[selectedPath.length - 1];
    if (!lastCell) return;
    
    const [lastRow, lastCol] = lastCell;
    const rowDiff = Math.abs(row - lastRow);
    const colDiff = Math.abs(col - lastCol);
    
    // Check if adjacent and not already in path
    if (rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0)) {
      const cellExists = selectedPath.some(([r, c]) => r === row && c === col);
      if (!cellExists) {
        const newPath = [...selectedPath, [row, col] as [number, number]];
        setSelectedPath(newPath);
        setCurrentWord(prev => prev + gameState.board[row][col]);
      }
    }
  };

  const handleMouseUp = () => {
    if (isSelecting && currentWord.length >= 3 && socket) {
      socket.emit('submit-word', { word: currentWord, path: selectedPath });
    } else if (currentWord.length < 3) {
      setMessage('Words must be at least 3 letters long!');
      setCurrentWord('');
      setSelectedPath([]);
    }
    setIsSelecting(false);
  };

  const isCellSelected = (row: number, col: number) => {
    return selectedPath.some(([r, c]) => r === row && c === col);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Boggle Game</h1>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && joinGame()}
            />
            <button
              onClick={joinGame}
              disabled={!playerName.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Join Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-6">Boggle Game</h1>
        
        {/* Game Status */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="text-lg font-semibold">
              Status: <span className="capitalize text-blue-600">{gameState.gameState}</span>
            </div>
            {gameState.gameState === 'playing' && (
              <div className="text-xl font-bold text-red-600">
                Time: {formatTime(gameState.timeLeft)}
              </div>
            )}
            <div className="space-x-2">
              {gameState.gameState === 'waiting' && (
                <button
                  onClick={startGame}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
                >
                  Start Game
                </button>
              )}
              <button
                onClick={resetGame}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                Reset Game
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Board */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-center">Game Board</h2>
              {gameState.board.length > 0 ? (
                <div 
                  ref={boardRef}
                  className="grid grid-cols-4 gap-2 max-w-md mx-auto select-none"
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => setIsSelecting(false)}
                >
                  {gameState.board.map((row, rowIndex) =>
                    row.map((letter, colIndex) => (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`
                          w-16 h-16 flex items-center justify-center text-xl font-bold rounded-lg cursor-pointer transition-all
                          ${isCellSelected(rowIndex, colIndex) 
                            ? 'bg-blue-500 text-white scale-105' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                          }
                        `}
                        onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                        onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                      >
                        {letter}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Waiting for game to start...
                </div>
              )}
              
              {/* Current Word */}
              {currentWord && (
                <div className="mt-4 text-center">
                  <div className="text-lg font-semibold text-blue-600">
                    Current Word: {currentWord}
                  </div>
                </div>
              )}
              
              {/* Message */}
              {message && (
                <div className="mt-4 text-center text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {message}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Players */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-xl font-bold mb-3">Players</h3>
              <div className="space-y-2">
                {gameState.players.map((player) => (
                  <div key={player.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium">{player.name}</span>
                    <span className="text-blue-600 font-bold">{player.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Found Words */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-xl font-bold mb-3">Your Words ({foundWords.length})</h3>
              <div className="max-h-64 overflow-y-auto">
                {foundWords.length > 0 ? (
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {foundWords.map((word, index) => (
                      <div key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded">
                        {word}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">No words found yet</div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-xl font-bold mb-3">How to Play</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>• Click and drag to select letters</p>
                <p>• Form words by connecting adjacent letters</p>
                <p>• Words must be at least 3 letters long</p>
                <p>• Longer words score more points</p>
                <p>• Find as many words as you can!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
