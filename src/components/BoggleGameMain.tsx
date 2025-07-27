'use client';

import React, { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useGameLogic } from '@/hooks/useGameLogic';
import { GameState, WordResult } from '@/interfaces/game';
import { GameBoard } from './GameBoard';
import { PlayersList } from './PlayersList';
import { FoundWords } from './FoundWords';
import { GameControls } from './GameControls';
import { GameInstructions } from './GameInstructions';
import { JoinGameForm } from './JoinGameForm';

export const BoggleGameMain: React.FC = () => {
  const { socket, isConnected, joinGame, startGame, submitWord, resetGame } = useSocket();
  const {
    currentWord,
    selectedPath,
    isSelecting,
    foundWords,
    message,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleMouseUp,
    isCellSelected,
    resetSelection,
    addFoundWord,
    setMessage,
    resetFoundWords,
  } = useGameLogic();

  const [gameState, setGameState] = useState<GameState>({
    board: [],
    players: [],
    gameState: 'waiting',
    timeLeft: 180
  });
  const [isJoined, setIsJoined] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');

  useEffect(() => {
    if (!socket) return;

    // Store the current player ID when socket connects
    if (socket.id) {
      setCurrentPlayerId(socket.id);
    }

    socket.on('game-state', (state: GameState) => {
      setGameState(state);
    });

    socket.on('game-started', (state: GameState) => {
      setGameState(state);
      setMessage('Game started! Find words on the board.');
      resetFoundWords();
      resetSelection();
    });

    socket.on('timer-update', (timeLeft: number) => {
      setGameState(prev => ({ ...prev, timeLeft }));
    });

    socket.on('game-ended', (state: GameState) => {
      setGameState(state);
      setMessage('Game ended! Check the final scores.');
      resetSelection();
    });

    socket.on('word-result', (result: WordResult) => {
      if (result.valid && result.word) {
        addFoundWord(result.word);
        setMessage(`Great! "${result.word}" is worth ${result.points} points!`);
      } else {
        setMessage(`"${currentWord}" - ${result.reason || 'Invalid word'}`);
      }
      resetSelection();
    });

    socket.on('player-joined', ({ playerName }) => {
      setMessage(`${playerName} joined the game!`);
    });

    socket.on('player-left', () => {
      setMessage('A player left the game.');
    });

    socket.on('player-scored', ({ playerId, word, points }) => {
      if (playerId !== socket.id) {
        setMessage(`Another player found "${word}" for ${points} points!`);
      }
    });

    socket.on('game-reset', (state: GameState) => {
      setGameState(state);
      resetFoundWords();
      resetSelection();
      setMessage('Game has been reset!');
    });

    return () => {
      socket.off('game-state');
      socket.off('game-started');
      socket.off('timer-update');
      socket.off('game-ended');
      socket.off('word-result');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('player-scored');
      socket.off('game-reset');
    };
  }, [socket, currentWord, addFoundWord, setMessage, resetFoundWords, resetSelection]);

  const handleJoinGame = (playerName: string) => {
    joinGame(playerName);
    setIsJoined(true);
  };

  const handleCellMouseDownWrapper = (row: number, col: number) => {
    if (gameState.gameState !== 'playing') return;
    handleCellMouseDown(row, col, gameState.board);
  };

  const handleCellMouseEnterWrapper = (row: number, col: number) => {
    if (gameState.gameState !== 'playing') return;
    handleCellMouseEnter(row, col, gameState.board);
  };

  const handleMouseUpWrapper = () => {
    handleMouseUp((word, path) => submitWord(word, path));
  };

  const handleMouseLeave = () => {
    if (isSelecting) {
      resetSelection();
    }
  };

  if (!isJoined) {
    return <JoinGameForm onJoinGame={handleJoinGame} isConnected={isConnected} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-6 flex items-center justify-center space-x-2">
          <span>🎯</span>
          <span>Boggle Game</span>
        </h1>
        
        {/* Game Controls */}
        <GameControls
          gameState={gameState.gameState}
          timeLeft={gameState.timeLeft}
          onStartGame={startGame}
          onResetGame={resetGame}
          isConnected={isConnected}
        />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Game Board - Takes up more space */}
          <div className="xl:col-span-2">
            <GameBoard
              gameState={gameState}
              currentWord={currentWord}
              message={message}
              onCellMouseDown={handleCellMouseDownWrapper}
              onCellMouseEnter={handleCellMouseEnterWrapper}
              onMouseUp={handleMouseUpWrapper}
              onMouseLeave={handleMouseLeave}
              isCellSelected={isCellSelected}
            />
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-6">
              {/* Players List */}
              <PlayersList 
                players={gameState.players} 
                currentPlayerId={currentPlayerId}
              />

              {/* Found Words */}
              <FoundWords foundWords={foundWords} />
            </div>

            {/* Instructions */}
            <GameInstructions />
          </div>
        </div>
      </div>
    </div>
  );
};
