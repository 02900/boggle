"use client";

import { useMemo } from "react";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { useScrabbleSocket } from "@/hooks/use-scrabble-socket";
import { Button } from "@/components/ui";
import { composeClasses } from "@/utils/compose-classes";
import {
  SCRABBLE_BINGO_BONUS,
  SCRABBLE_MIN_BAG_FOR_EXCHANGE,
  SCRABBLE_RACK_SIZE,
} from "../../../config/scrabbleConstants";
import { evaluateMove, isBoardEmpty } from "../../../game/scrabble/moveEvaluation";

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

  // Same rules and scoring as the server, minus the dictionary check (done on submit)
  const board = gameState?.board;
  const preview = useMemo(
    () => (board && tentativePlacements.length > 0 ? evaluateMove(board, tentativePlacements, isBoardEmpty(board)) : null),
    [board, tentativePlacements]
  );
  const showPreview = isPlaying && isMyTurn && !exchangeMode && preview !== null;

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
      {/* One reserved line for hints, so the layout doesn't jump while placing tiles */}
      <p
        data-testid="move-hint"
        className={composeClasses(
          "min-h-5 text-center text-sm",
          exchangeMode ? "text-warning" : preview?.valid ? "text-ink-muted" : "text-ink-faint"
        )}
        title={showPreview && preview.valid ? "Puntos si todas las palabras existen en el diccionario" : undefined}
      >
        {exchangeMode
          ? "Selecciona las fichas que quieres cambiar"
          : showPreview
            ? preview.valid
              ? preview.words.map((w) => `${w.word.toUpperCase()} ${w.score}`).join(" · ") +
                (tentativePlacements.length === SCRABBLE_RACK_SIZE ? ` · bingo +${SCRABBLE_BINGO_BONUS}` : "")
              : preview.reason
            : null}
      </p>

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
              {showPreview && preview.valid && (
                <span data-testid="move-score" className="ml-1.5 font-mono tabular-nums">
                  +{preview.score}
                </span>
              )}
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
