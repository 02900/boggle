"use client";

import React from "react";
import { JoinGameForm } from "../JoinGameForm";
import { ViewMobile } from "./view-mobile";
import { ViewDesktop } from "./view-desktop";
import { useBoggleGameMain } from "./use-boggle-game-main";
import { useBoggleGameMainStore } from "./boogle-game.main.store";
import { useSocketsStore } from "@/stores/sockets.store";
import { useViewportStore } from "@/stores/viewport.store";
import { useGameLogicStore } from "@/stores/game-logic.store";

export const BoggleGameMain = () => {
  const {
    gameState,
    rotationCooldown,
    rotationMessage,
    highlightedPath,
    highlightedErrorPath,
    highlightedSkipPath,
    showMaxScoreModal,
    setShowMaxScoreModal,
    currentPlayerId,
    isJoined,
  } = useBoggleGameMainStore();
  const { foundWords, currentWord, message } = useGameLogicStore();
  const { socket, isConnected, diceRolling, eliminateCommonWords } = useSocketsStore();
  const { isMobile } = useViewportStore();

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

  if (isMobile) {
    return (
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
        setShowMaxScoreModal={setShowMaxScoreModal}
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
        foundWords={foundWords}
        showMaxScoreModal={showMaxScoreModal}
        socket={socket}
        handleCellMouseDownWrapper={handleCellMouseDownWrapper}
      />
    );
  }

  return (
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
      setShowMaxScoreModal={setShowMaxScoreModal}
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
      foundWords={foundWords}
      showMaxScoreModal={showMaxScoreModal}
      socket={socket}
      handleCellMouseDownWrapper={handleCellMouseDownWrapper}
      isConnected={isConnected}
      toggleEliminateCommonWords={toggleEliminateCommonWords}
      eliminateCommonWords={eliminateCommonWords}
    />
  );
};
