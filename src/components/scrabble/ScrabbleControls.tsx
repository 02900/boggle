"use client";

import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { useScrabbleSocket } from "@/hooks/use-scrabble-socket";
import { Button } from "@/components/ui";

export function ScrabbleControls() {
  const gameState = useScrabbleGameStore((s) => s.gameState);
  const currentPlayerId = useScrabbleGameStore((s) => s.currentPlayerId);
  const tentativePlacements = useScrabbleGameStore((s) => s.tentativePlacements);
  const rack = useScrabbleGameStore((s) => s.rack);
  const exchangeMode = useScrabbleGameStore((s) => s.exchangeMode);
  const selectedForExchange = useScrabbleGameStore((s) => s.selectedForExchange);
  const setExchangeMode = useScrabbleGameStore((s) => s.setExchangeMode);
  const clearExchangeSelection = useScrabbleGameStore((s) => s.clearExchangeSelection);
  const { startGame, submitTurn, passTurn, recallTiles, exchangeTiles, resetGame } = useScrabbleSocket();

  const isPlaying = gameState?.gameState === "playing";
  const isWaiting = gameState?.gameState === "waiting";
  const isFinished = gameState?.gameState === "finished";
  const isMyTurn = gameState?.currentTurnPlayerId === currentPlayerId;
  const hasPlacements = tentativePlacements.length > 0;
  const playerCount = gameState?.players.length ?? 0;

  const handleExchangeConfirm = () => {
    const tileIds = [...selectedForExchange];
    if (tileIds.length > 0) exchangeTiles(tileIds);
    setExchangeMode(false);
  };

  const handleExchangeCancel = () => {
    setExchangeMode(false);
    clearExchangeSelection();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {exchangeMode && (
        <p className="text-center text-sm text-warning">Selecciona las fichas que quieres cambiar</p>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {isWaiting && playerCount >= 2 && (
          <Button variant="primary" size="lg" onClick={startGame}>
            Iniciar Juego
          </Button>
        )}

        {isPlaying && isMyTurn && !exchangeMode && (
          <>
            <Button variant="primary" onClick={submitTurn} disabled={!hasPlacements}>
              Confirmar
            </Button>
            <Button onClick={recallTiles} disabled={!hasPlacements}>
              Devolver
            </Button>
            <Button variant="ghost" onClick={() => setExchangeMode(true)} disabled={hasPlacements || rack.length === 0}>
              Cambiar
            </Button>
            <Button variant="ghost" onClick={passTurn}>
              Pasar
            </Button>
          </>
        )}

        {isPlaying && isMyTurn && exchangeMode && (
          <>
            <Button variant="primary" onClick={handleExchangeConfirm} disabled={selectedForExchange.size === 0}>
              Confirmar cambio ({selectedForExchange.size})
            </Button>
            <Button variant="ghost" onClick={handleExchangeCancel}>
              Cancelar
            </Button>
          </>
        )}

        {isFinished && (
          <Button variant="primary" size="lg" onClick={resetGame}>
            Nueva Partida
          </Button>
        )}
      </div>

      {isPlaying && (
        <p className="text-xs text-ink-faint">Fichas en bolsa: {gameState?.tileBagCount ?? 0}</p>
      )}
    </div>
  );
}
