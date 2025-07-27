'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useGameLogic } from '@/hooks/useGameLogic';
import { GameState, WordResult } from '@/interfaces/game';
import { GameBoard } from './GameBoard';
import { PlayersList } from './PlayersList';
import { FoundWords } from './FoundWords';
import { GameControls } from './GameControls';
import { GameInstructions } from './GameInstructions';
import { JoinGameForm } from './JoinGameForm';
import { DiceRollingAnimation } from './DiceRollingAnimation';

export const BoggleGameMain: React.FC = () => {
  const { socket, isConnected, joinGame, startGame, submitWord, resetGame, diceRolling, clearDiceRolling } = useSocket();
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
    handleKeyboardInput,
    handleKeyboardSubmit,
    handleKeyboardBackspace
  } = useGameLogic();

  const [gameState, setGameState] = useState<GameState>({
    board: [],
    players: [],
    gameState: 'waiting',
    timeLeft: 180
  });
  
  const [isMobile, setIsMobile] = useState(false);
  
  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
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
      setMessage('¡Juego iniciado! Encuentra palabras en el tablero.');
      resetFoundWords();
      resetSelection();
    });

    socket.on('timer-update', (timeLeft: number) => {
      setGameState(prev => ({ ...prev, timeLeft }));
    });

    socket.on('game-ended', (state: GameState) => {
      setGameState(state);
      setMessage('¡Juego terminado! Revisa las puntuaciones finales.');
      resetSelection();
    });

    socket.on('word-result', (result: WordResult) => {
      if (result.valid && result.word) {
        addFoundWord(result.word);
        setMessage(`¡Excelente! "${result.word}" vale ${result.points} puntos!`);
      } else {
        setMessage(`"${currentWord}" - ${result.reason || 'Palabra inválida'}`);
      }
      resetSelection();
    });

    socket.on('player-joined', ({ playerName }) => {
      setMessage(`¡${playerName} se unió al juego!`);
    });

    socket.on('player-left', () => {
      setMessage('Un jugador abandonó el juego.');
    });

    socket.on('player-scored', ({ playerId, word, points }) => {
      if (playerId !== socket.id) {
        setMessage(`¡Otro jugador encontró "${word}" por ${points} puntos!`);
      }
    });

    socket.on('game-reset', (state: GameState) => {
      setGameState(state);
      resetFoundWords();
      resetSelection();
      setMessage('¡El juego ha sido reiniciado!');
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

  // Layout móvil optimizado
  if (isMobile) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col overflow-hidden">
        {/* Animación de lanzamiento de dados */}
        {diceRolling && (
          <DiceRollingAnimation 
            diceRolls={diceRolling} 
            onAnimationComplete={clearDiceRolling}
          />
        )}
        
        {/* Header compacto con tiempo y puntos */}
        <div className="flex-shrink-0 bg-white shadow-sm p-3">
          <div className="flex justify-between items-center">
            <div className="text-lg font-bold text-gray-800">
              🎲 Boggle
            </div>
            
            {/* Tiempo restante */}
            <div className="flex items-center space-x-4">
              {gameState.gameState === 'playing' && (
                <div className="text-lg font-bold text-blue-600">
                  ⏱️ {Math.floor(gameState.timeLeft / 60)}:{(gameState.timeLeft % 60).toString().padStart(2, '0')}
                </div>
              )}
              
              {/* Puntos del jugador actual */}
              {gameState.players.find(p => p.id === currentPlayerId) && (
                <div className="text-lg font-bold text-green-600">
                  🏆 {gameState.players.find(p => p.id === currentPlayerId)?.score || 0}
                </div>
              )}
            </div>
          </div>
          
          {/* Controles de juego compactos */}
          {gameState.gameState === 'waiting' && (
            <div className="mt-2 text-center">
              <button
                onClick={startGame}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold"
              >
                ▶️ Iniciar Juego
              </button>
            </div>
          )}
          
          {gameState.gameState === 'finished' && (
            <div className="mt-2 text-center">
              <button
                onClick={resetGame}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold"
              >
                🔄 Nuevo Juego
              </button>
            </div>
          )}
        </div>
        
        {/* Tablero de juego - ocupa el resto del espacio */}
        <div className="flex-1 p-3 mobile-drag-area">
          <GameBoard
            gameState={gameState}
            currentWord={currentWord}
            message={message}
            onCellMouseDown={handleCellMouseDownWrapper}
            onCellMouseEnter={handleCellMouseEnterWrapper}
            onMouseUp={handleMouseUpWrapper}
            onMouseLeave={handleMouseLeave}
            isCellSelected={isCellSelected}
            onKeyboardInput={(letter) => handleKeyboardInput(letter, gameState.board)}
            onKeyboardSubmit={() => handleKeyboardSubmit(submitWord)}
            onKeyboardBackspace={handleKeyboardBackspace}
          />
        </div>
        
        {/* Footer con palabra actual y últimas palabras encontradas */}
        {gameState.gameState === 'playing' && (
          <div className="flex-shrink-0 bg-white shadow-sm p-3 border-t">
            {currentWord && (
              <div className="text-center mb-2">
                <span className="text-lg font-bold text-blue-600">
                  {currentWord}
                </span>
              </div>
            )}
            
            {foundWords.length > 0 && (
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Últimas palabras:</div>
                <div className="text-sm text-green-600 font-medium">
                  {foundWords.slice(-3).join(' • ')}
                </div>
              </div>
            )}
            
            {message && (
              <div className="text-center mt-2">
                <div className="text-xs text-red-500">
                  {message}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // Layout desktop normal
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Animación de lanzamiento de dados */}
      {diceRolling && (
        <DiceRollingAnimation 
          diceRolls={diceRolling} 
          onAnimationComplete={clearDiceRolling}
        />
      )}
      
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-6 flex items-center justify-center space-x-2">
          <span>🎯</span>
          <span>Juego de Boggle</span>
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
              onKeyboardInput={(letter) => handleKeyboardInput(letter, gameState.board)}
              onKeyboardSubmit={() => handleKeyboardSubmit(submitWord)}
              onKeyboardBackspace={handleKeyboardBackspace}
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
