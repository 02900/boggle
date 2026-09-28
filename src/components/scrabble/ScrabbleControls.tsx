"use client";

import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { useScrabbleSocket } from "@/hooks/use-scrabble-socket";
import { Button } from "@/components/ui";
import { SCRABBLE_MIN_BAG_FOR_EXCHANGE } from "../../../config/scrabbleConstants";

export function ScrabbleControls() {
  const gameState = useScrabbleGameStore((s) => s.gameState);
  const currentPlayerId = useScrabbleGameStore((s) => s.currentPlayerId);
  const tentativePlacements = useScrabbleGameStore((s) => s.tentativePlacements);
  const rack = useScrabbleGameStore((s) => s.rack);
  const exchangeMode = useScrabbleGameStore((s) => s.exchangeMode);
  const selectedForExchange = useScrabbleGameStore((s) => s.selectedForExchange);
  const setExchangeMode = useScrabbleGameStore((s) => s.setExchangeMode);
  const clearExchangeSelection = useScrabbleGameStore((s) => s.clearExchangeSelection);
  const { submitTurn, passTurn, recallTiles, exchangeTiles, skipTurn } = useScrabbleSocket();

  const isPlaying = gameState?.gameState === "playing";
  const isMyTurn = gameState?.currentTurnPlayerId === currentPlayerId;
  const hasPlacements = tentativePlacements.length > 0;
  const currentTurnPlayer = gameState?.players.find((p) => p.id === gameState.currentTurnPlayerId);
  const isOvertime = (gameState?.turnTimeLeft ?? 1) <= 0;
  const bagTooSmall = (gameState?.tileBagCount ?? 0) < SCRABBLE_MIN_BAG_FOR_EXCHANGE;

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

      <div className="flex min-h-10 flex-wrap items-center justify-center gap-2">
        {isPlaying && !isMyTurn && (
          <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
            <span aria-hidden className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint" />
            Esperando a {currentTurnPlayer?.name ?? "..."}…
          </p>
        )}

        {isPlaying && !isMyTurn && isOvertime && (
          <Button variant="danger" size="sm" onClick={skipTurn} data-testid="skip-turn">
            Saltar turno de {currentTurnPlayer?.name ?? "..."}
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
            <Button
              variant="ghost"
              onClick={() => setExchangeMode(true)}
              disabled={hasPlacements || rack.length === 0 || bagTooSmall}
              title={bagTooSmall ? `Solo se puede cambiar con al menos ${SCRABBLE_MIN_BAG_FOR_EXCHANGE} fichas en la bolsa` : undefined}
            >
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

      </div>
    </div>
  );
}
