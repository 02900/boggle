"use client";

import React from "react";
import { Socket } from "socket.io-client";
import { DiceRoll, GameState } from "@/interfaces/game";
import { DiceRollingAnimation } from "../DiceRollingAnimation";
import { FoundWords } from "../FoundWords";
import { GameBoard } from "../GameBoard";
import { GameControls } from "../GameControls";
import { GameInstructions } from "../GameInstructions";
import { GameSettings } from "../GameSettings";
import { MaxScoreModal } from "../MaxScoreModal";
import { PlayersList } from "../PlayersList";
import { PlayerWordsDetail } from "../PlayerWordsDetail";

export const ViewDesktop = ({
  diceRolling,
  clearDiceRolling,
  gameState,
  currentPlayerId,
  getWordScore,
  startGame,
  rotateBoard,
  resetGame,
  rotationCooldown,
  rotationMessage,
  setShowMaxScoreModal,
  currentWord,
  message,
  handleCellMouseDownWrapper,
  handleCellMouseEnterWrapper,
  handleMouseUpWrapper,
  handleMouseLeave,
  isCellSelected,
  handleKeyboardWordInput,
  highlightedPath,
  highlightedErrorPath,
  highlightedSkipPath,
  foundWords,
  showMaxScoreModal,
  socket,
  isConnected,
  toggleEliminateCommonWords,
  eliminateCommonWords,
}: {
  diceRolling: DiceRoll[] | null;
  clearDiceRolling: () => void;
  gameState: GameState;
  currentPlayerId: string | null;
  getWordScore: (word: string) => number;
  startGame: () => void;
  rotateBoard: () => void;
  resetGame: () => void;
  rotationCooldown: number;
  rotationMessage: string;
  setShowMaxScoreModal: (show: boolean) => void;
  currentWord: string;
  message: string;
  handleCellMouseDownWrapper: (row: number, col: number) => void;
  handleCellMouseEnterWrapper: (row: number, col: number) => void;
  handleMouseUpWrapper: () => void;
  handleMouseLeave: () => void;
  isCellSelected: (row: number, col: number) => boolean;
  handleKeyboardWordInput: (key: string) => void;
  highlightedPath: [number, number][];
  highlightedErrorPath: [number, number][];
  highlightedSkipPath: [number, number][];
  foundWords: string[];
  showMaxScoreModal: boolean;
  socket: Socket | null;
  isConnected: boolean;
  toggleEliminateCommonWords: (enabled: boolean) => void;
  eliminateCommonWords: boolean;
}) => {
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
          onShowMaxScore={() => setShowMaxScoreModal(true)}
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
              highlightedSkipPath={highlightedSkipPath}
            />
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-6">
              {/* Players List */}
              <PlayersList
                players={gameState.players}
                currentPlayerId={currentPlayerId || undefined}
                gameState={gameState.gameState}
              />

              {/* Found Words */}
              <FoundWords foundWords={foundWords} />
            </div>

            {/* Game Settings */}
            <GameSettings
              eliminateCommonWords={eliminateCommonWords}
              onToggleEliminateCommonWords={toggleEliminateCommonWords}
              gameState={gameState.gameState}
            />

            {/* Player Words Detail */}
            <PlayerWordsDetail
              players={gameState.players}
              gameState={gameState.gameState}
            />

            {/* Instructions */}
            <GameInstructions />
          </div>
        </div>
      </div>

      {/* Modal de Puntuación Máxima */}
      <MaxScoreModal
        isOpen={showMaxScoreModal}
        onClose={() => setShowMaxScoreModal(false)}
        socket={socket}
        foundWords={gameState.players.flatMap((player) => [
          ...player.wordsFound,
          ...(player.eliminatedWords || []),
        ])}
      />
    </div>
  );
};
