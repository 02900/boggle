'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const { socket, isConnected, joinGame, startGame, submitWord, resetGame, rotateBoard, diceRolling, clearDiceRolling, triggerVibration, playSuccessSound, playErrorSound } = useSocket();
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
  const [rotationCooldown, setRotationCooldown] = useState(0);
  const [rotationMessage, setRotationMessage] = useState('');
  const [highlightedPath, setHighlightedPath] = useState<[number, number][]>([]);
  const [highlightedErrorPath, setHighlightedErrorPath] = useState<[number, number][]>([]);
  const [lastSubmittedPath, setLastSubmittedPath] = useState<[number, number][]>([]);
  const [lastSubmittedWord, setLastSubmittedWord] = useState<string>('');
  const lastSubmittedRef = useRef<{path: [number, number][], word: string}>({path: [], word: ''});
  
  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);

  // Función para calcular el puntaje de una palabra
  const getWordScore = (word: string): number => {
    const length = word.length;
    if (length < 3) return 0;
    if (length <= 4) return 1;
    if (length === 5) return 2;
    if (length === 6) return 3;
    if (length === 7) return 5;
    return 11; // 8+ letras
  };

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
      console.log('word-result recibido en BoggleGameMain:', result);
      if (result.valid && result.word) {
        addFoundWord(result.word);
        setMessage(`¡Excelente! "${result.word}" vale ${result.points} puntos!`);
        // Activar sonido y vibración para palabras válidas
        console.log('Activando sonido y vibración para palabra válida');
        triggerVibration();
        playSuccessSound();
      } else {
        // Usar el último camino enviado para mostrarlo en rojo
        const currentPath = [...lastSubmittedRef.current.path];
        const currentWordToShow = lastSubmittedRef.current.word || currentWord;
        console.log('Error path captured:', currentPath, 'Current word:', currentWordToShow, 'Last submitted from ref:', lastSubmittedRef.current);
        
        // Si el jugador no fue encontrado, redirigir al menú principal
        if (result.reason === 'Jugador no encontrado') {
          setMessage('Sesión perdida. Redirigiendo al menú principal...');
          setTimeout(() => {
            setIsJoined(false);
            resetFoundWords();
            resetSelection();
          }, 2000);
        } else {
          setMessage(`"${currentWordToShow}" - ${result.reason || 'Palabra inválida'}`);
          // Mostrar el camino en rojo por 2 segundos
          if (currentPath.length > 0) {
            console.log('Setting error path:', currentPath);
            setHighlightedErrorPath(currentPath);
            // Resetear la selección después de un pequeño delay para permitir que se vea el rojo
            setTimeout(() => {
              resetSelection();
            }, 100);
            // Limpiar el resaltado de error después de 2 segundos
            setTimeout(() => {
              setHighlightedErrorPath([]);
            }, 2000);
          } else {
            resetSelection();
          }
          // Activar sonido de error para palabras inválidas
          console.log('Activando sonido de error para palabra inválida');
          playErrorSound();
        }
      }
    });

    socket.on('player-joined', ({ playerName }) => {
      setMessage(`¡${playerName} se unió al juego!`);
    });

    socket.on('player-left', () => {
      setMessage('Un jugador abandonó el juego.');
    });

    socket.on('player-scored', ({ playerId, word, points }) => {
      // No mostrar mensaje a otros jugadores para no revelar palabras válidas
      // Solo se actualiza el estado del juego automáticamente
    });

    socket.on('game-reset', (state: GameState) => {
      setGameState(state);
      resetFoundWords();
      resetSelection();
      setMessage('¡El juego ha sido reiniciado!');
    });
    
    socket.on('board-rotated', ({ board, cooldownTime }) => {
      setGameState(prev => ({ ...prev, board }));
      setMessage('¡Tablero rotado 90°!');
      setRotationCooldown(cooldownTime);
      
      // Iniciar countdown del cooldown
      let countdown = cooldownTime;
      const cooldownInterval = setInterval(() => {
        countdown--;
        setRotationCooldown(countdown);
        if (countdown <= 0) {
          clearInterval(cooldownInterval);
        }
      }, 1000);
    });
    
    socket.on('rotation-error', ({ message }) => {
      setRotationMessage(message);
      setTimeout(() => setRotationMessage(''), 3000);
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
      socket.off('board-rotated');
      socket.off('rotation-error');
    };
  }, [socket, currentWord, addFoundWord, setMessage, resetFoundWords, resetSelection, triggerVibration, playSuccessSound, playErrorSound]);

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
    handleMouseUp((word, path) => {
      // Capturar el camino y palabra antes de enviar
      setLastSubmittedPath([...path]);
      setLastSubmittedWord(word);
      lastSubmittedRef.current = {path: [...path], word};
      console.log('Submitting word:', word, 'with path:', path);
      submitWord(word, path);
    });
  };

  const handleMouseLeave = () => {
    if (isSelecting) {
      resetSelection();
    }
  };

  // Nueva función para manejar palabras completas desde el teclado
  const handleKeyboardWordInput = (word: string) => {
    // Buscar todas las rutas posibles para la palabra en el tablero
    const foundPath = findWordPath(word, gameState.board);
    
    if (foundPath) {
      // Si se encuentra una ruta válida, resaltarla y enviar la palabra
      setHighlightedPath(foundPath);
      // Capturar el camino y palabra antes de enviar
      setLastSubmittedPath([...foundPath]);
      setLastSubmittedWord(word);
      lastSubmittedRef.current = {path: [...foundPath], word};
      console.log('Submitting keyboard word:', word, 'with path:', foundPath);
      console.log('States set - lastSubmittedPath:', [...foundPath], 'lastSubmittedWord:', word);
      submitWord(word, foundPath);
      
      // Limpiar el highlight después de un tiempo
      setTimeout(() => {
        setHighlightedPath([]);
      }, 2000);
    } else {
      // Si no se encuentra ruta, mostrar mensaje de error
      setMessage(`"${word}" - No se encontró ruta válida en el tablero`);
      playErrorSound();
    }
  };

  // Función para buscar una ruta válida para una palabra en el tablero
  const findWordPath = (word: string, board: string[][]): [number, number][] | null => {
    const rows = board.length;
    const cols = board[0].length;
    const wordUpper = word.toUpperCase();
    
    // Buscar desde cada posición del tablero
    for (let startRow = 0; startRow < rows; startRow++) {
      for (let startCol = 0; startCol < cols; startCol++) {
        const path = searchFromPosition(wordUpper, board, startRow, startCol, [], 0);
        if (path) {
          return path;
        }
      }
    }
    
    return null;
  };

  // Función recursiva para buscar la palabra desde una posición específica
  const searchFromPosition = (
    word: string,
    board: string[][],
    row: number,
    col: number,
    currentPath: [number, number][],
    letterIndex: number
  ): [number, number][] | null => {
    // Verificar límites
    if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) {
      return null;
    }
    
    // Verificar si la celda ya está en el path actual
    if (currentPath.some(([r, c]) => r === row && c === col)) {
      return null;
    }
    
    const currentLetter = board[row][col];
    const targetLetter = word[letterIndex];
    
    // Manejar dígrafos (CH, LL, QU)
    let letterMatch = false;
    let nextLetterIndex = letterIndex + 1;
    
    // Verificar si la letra actual coincide directamente
    if (currentLetter === targetLetter) {
      letterMatch = true;
    }
    // Verificar dígrafos: QU, CH, LL
    else if (letterIndex < word.length - 1) {
      const digraph = word.substring(letterIndex, letterIndex + 2);
      
      // Para QU: la celda contiene "QU" y la palabra necesita "QU"
      if (digraph === 'QU' && currentLetter === 'QU') {
        letterMatch = true;
        nextLetterIndex = letterIndex + 2;
      }
      // Para CH: la celda contiene "CH" y la palabra necesita "CH"
      else if (digraph === 'CH' && currentLetter === 'CH') {
        letterMatch = true;
        nextLetterIndex = letterIndex + 2;
      }
      // Para LL: la celda contiene "LL" y la palabra necesita "LL"
      else if (digraph === 'LL' && currentLetter === 'LL') {
        letterMatch = true;
        nextLetterIndex = letterIndex + 2;
      }
    }
    
    if (!letterMatch) {
      return null;
    }
    
    const newPath = [...currentPath, [row, col] as [number, number]];
    
    // Si hemos encontrado toda la palabra
    if (nextLetterIndex >= word.length) {
      return newPath;
    }
    
    // Buscar en todas las direcciones adyacentes (incluyendo diagonales)
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (const [dr, dc] of directions) {
      const nextRow = row + dr;
      const nextCol = col + dc;
      
      const result = searchFromPosition(word, board, nextRow, nextCol, newPath, nextLetterIndex);
      if (result) {
        return result;
      }
    }
    
    return null;
  };

  if (!isJoined) {
    return <JoinGameForm onJoinGame={handleJoinGame} isConnected={isConnected} socket={socket} />;
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
          
          {gameState.gameState === 'playing' && (
            <div className="mt-2 flex justify-center space-x-2">
              <button
                onClick={rotateBoard}
                disabled={rotationCooldown > 0}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm font-semibold"
                title={rotationCooldown > 0 ? `Espera ${rotationCooldown}s` : 'Rotar tablero 90°'}
              >
                🔄 {rotationCooldown > 0 ? `${rotationCooldown}s` : 'Rotar'}
              </button>
              <button
                onClick={resetGame}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold"
              >
                ♾️ Reiniciar
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
          
          {/* Mensaje de Error de Rotación en Móvil */}
          {rotationMessage && (
            <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-center">
              <div className="text-red-700 text-xs font-medium">
                {rotationMessage}
              </div>
            </div>
          )}
        </div>
        
        {/* Tablero de juego o resultados finales - ocupa el resto del espacio */}
        <div className="flex-1 p-3 mobile-results-scrollable">
          {gameState.gameState === 'finished' ? (
            /* Pantalla de resultados finales */
            <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
              <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
                🏆 ¡Juego Terminado!
              </h2>
              
              {/* Clasificación de jugadores */}
              <div className="flex-1 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-3 text-center text-gray-700">
                  Clasificación Final
                </h3>
                
                <div className="space-y-4">
                  {gameState.players
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => {
                      const isCurrentPlayer = player.id === currentPlayerId;
                      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
                      
                      // Ordenar palabras del jugador por puntaje (mayor a menor)
                      const sortedWords = [...player.wordsFound]
                        .map(word => ({ word, score: getWordScore(word) }))
                        .sort((a, b) => b.score - a.score);
                      
                      return (
                        <div
                          key={player.id}
                          className={`
                            p-4 rounded-lg border-2
                            ${
                              isCurrentPlayer
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-gray-50 border-gray-200'
                            }
                          `}
                        >
                          {/* Header del jugador */}
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{medal}</span>
                              <div>
                                <div className={`font-semibold ${
                                  isCurrentPlayer ? 'text-blue-800' : 'text-gray-800'
                                }`}>
                                  {player.name} {isCurrentPlayer && '(Tú)'}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {player.wordsFound.length} palabras encontradas
                                </div>
                              </div>
                            </div>
                            
                            <div className={`text-xl font-bold ${
                              isCurrentPlayer ? 'text-blue-600' : 'text-gray-700'
                            }`}>
                              {player.score} pts
                            </div>
                          </div>
                          
                          {/* Lista de palabras ordenadas por puntaje */}
                          {sortedWords.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="text-sm font-medium text-gray-700 mb-2">
                                Palabras (ordenadas por puntaje):
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {sortedWords.map(({ word, score }, wordIndex) => (
                                  <span
                                    key={wordIndex}
                                    className={`
                                      inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                                      ${
                                        score >= 5
                                          ? 'bg-green-100 text-green-800'
                                          : score >= 3
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-gray-100 text-gray-700'
                                      }
                                    `}
                                  >
                                    {word}
                                    <span className="ml-1 text-xs opacity-75">
                                      ({score}pts)
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            </div>
          ) : (
            /* Tablero de juego normal */
            <GameBoard
              gameState={gameState}
              currentWord={currentWord}
              message={message}
              onCellMouseDown={handleCellMouseDownWrapper}
              onCellMouseEnter={handleCellMouseEnterWrapper}
              onMouseUp={handleMouseUpWrapper}
              onMouseLeave={handleMouseLeave}
              isCellSelected={isCellSelected}
              onKeyboardInput={handleKeyboardWordInput}
              highlightedPath={highlightedPath}
              highlightedErrorPath={highlightedErrorPath}
            />
          )}
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
          onRotateBoard={rotateBoard}
          isConnected={isConnected}
          rotationCooldown={rotationCooldown}
          rotationMessage={rotationMessage}
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
              onKeyboardInput={handleKeyboardWordInput}
              highlightedPath={highlightedPath}
              highlightedErrorPath={highlightedErrorPath}
            />
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-6">
              {/* Players List */}
              <PlayersList 
                players={gameState.players} 
                currentPlayerId={currentPlayerId || undefined}
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
