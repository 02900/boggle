"use client";

import React from "react";
import { JoinGameForm } from "../JoinGameForm";
import { ViewMobile } from "./view-mobile";
import { ViewDesktop } from "./view-desktop";
import { useBoggleGameMain } from "./use-boggle-game-main";

export const BoggleGameMain = () => {
  const {
    isJoined,
    handleJoinGame,
    isConnected,
    socket,
    isMobile,
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
    handleCellMouseDownWrapper,
    toggleEliminateCommonWords,
    eliminateCommonWords,
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
