"use client";

import React from "react";
import { useGameLogicStore } from "@/stores/game-logic.store";
import { ModalType, useModalStore } from "@/stores/modal.store";
import { useSocketsStore } from "@/stores/sockets.store";
import { useViewportStore } from "@/stores/viewport.store";
import { GameInstructions } from "../GameInstructions";
import { GameSettings } from "../GameSettings";
import { JoinGameForm } from "../JoinGameForm";
import { MaxScoreModal } from "../MaxScoreModal";
import { useBoggleGameMainStore } from "./boogle-game.main.store";
import { useBoggleGameMain } from "./use-boggle-game-main";
import { ViewDesktop } from "./view-desktop";
import { ViewMobile } from "./view-mobile";

export const BoggleGameMain = () => {
  const {
    gameState,
    rotationCooldown,
    rotationMessage,
    highlightedPath,
    highlightedErrorPath,
    highlightedSkipPath,
    currentPlayerId,
    isJoined,
  } = useBoggleGameMainStore();
  const { foundWords, currentWord, message } = useGameLogicStore();
  const { socket, isConnected, diceRolling, eliminateCommonWords } =
    useSocketsStore();
  const { isMobile } = useViewportStore();
  const { modalType, setModalType } = useModalStore();

  const {
    handleJoinGame,
    clearDiceRolling,
    getWordScore,
    startGame,
    rotateBoard,
    resetGame,
    handleCellMouseEnterWrapper,
    handleMouseUpWrapper,
    handleMouseLeave,
    isCellSelected,
    handleKeyboardWordInput,
    handleCellMouseDownWrapper,
    toggleEliminateCommonWords,
  } = useBoggleGameMain();

  if (!isJoined) {
    return (
      <JoinGameForm
        onJoinGame={handleJoinGame}
        isConnected={isConnected}
        socket={socket}
      />
    );
  }
  return (
    <>
      {isMobile ? (
        <ViewMobile
          diceRolling={diceRolling}
          clearDiceRolling={clearDiceRolling}
          gameState={gameState}
          currentPlayerId={currentPlayerId}
          getWordScore={getWordScore}
          startGame={startGame}
          rotateBoard={rotateBoard}
          resetGame={resetGame}
          rotationCooldown={rotationCooldown}
          rotationMessage={rotationMessage}
          currentWord={currentWord}
          message={message}
          handleCellMouseEnterWrapper={handleCellMouseEnterWrapper}
          handleMouseUpWrapper={handleMouseUpWrapper}
          handleMouseLeave={handleMouseLeave}
          isCellSelected={isCellSelected}
          handleKeyboardWordInput={handleKeyboardWordInput}
          highlightedPath={highlightedPath}
          highlightedErrorPath={highlightedErrorPath}
          highlightedSkipPath={highlightedSkipPath}
          socket={socket}
          handleCellMouseDownWrapper={handleCellMouseDownWrapper}
        />
      ) : (
        <ViewDesktop
          diceRolling={diceRolling}
          clearDiceRolling={clearDiceRolling}
          gameState={gameState}
          currentPlayerId={currentPlayerId}
          getWordScore={getWordScore}
          startGame={startGame}
          rotateBoard={rotateBoard}
          resetGame={resetGame}
          rotationCooldown={rotationCooldown}
          rotationMessage={rotationMessage}
          currentWord={currentWord}
          message={message}
          handleCellMouseEnterWrapper={handleCellMouseEnterWrapper}
          handleMouseUpWrapper={handleMouseUpWrapper}
          handleMouseLeave={handleMouseLeave}
          isCellSelected={isCellSelected}
          handleKeyboardWordInput={handleKeyboardWordInput}
          highlightedPath={highlightedPath}
          highlightedErrorPath={highlightedErrorPath}
          highlightedSkipPath={highlightedSkipPath}
          handleCellMouseDownWrapper={handleCellMouseDownWrapper}
          isConnected={isConnected}
        />
      )}

      {/* Modal de Puntuación Máxima */}
      {modalType === ModalType.MaxScore && (
        <MaxScoreModal
          socket={socket}
          foundWords={gameState.players.flatMap((player) => [
            ...player.wordsFound,
            ...(player.eliminatedWords || []),
          ])}
        />
      )}

      {/* Modal de Configuración */}
      {modalType === ModalType.Settings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <GameSettings
            eliminateCommonWords={eliminateCommonWords}
            onToggleEliminateCommonWords={toggleEliminateCommonWords}
          />
        </div>
      )}

      {/* Modal de Instrucciones */}
      {modalType === ModalType.Instructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <GameInstructions />
        </div>
      )}
    </>
  );
};
