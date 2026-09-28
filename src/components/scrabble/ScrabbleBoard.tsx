"use client";

import { useMemo, useState } from "react";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { useScrabbleSocket } from "@/hooks/use-scrabble-socket";
import { composeClasses } from "@/utils/compose-classes";
import { ScrabbleTile } from "./ScrabbleTile";
import { BlankTileModal } from "./BlankTileModal";
import type { ScrabbleBoardCell, MultiplierType } from "@/interfaces/scrabble";

const MULTIPLIER_CLASSES: Record<MultiplierType, string> = {
  TW: "bg-board-tw",
  DW: "bg-board-dw",
  TL: "bg-board-tl",
  DL: "bg-board-dl",
  CENTER: "bg-board-center",
  NONE: "bg-board-cell",
};

const MULTIPLIER_LABELS: Record<MultiplierType, string> = {
  TW: "3P",
  DW: "2P",
  TL: "3L",
  DL: "2L",
  CENTER: "★",
  NONE: "",
};

const MULTIPLIER_NAMES: Record<MultiplierType, string> = {
  TW: "palabra triple",
  DW: "palabra doble",
  TL: "letra triple",
  DL: "letra doble",
  CENTER: "centro",
  NONE: "",
};

const COLUMN_LABELS = "ABCDEFGHIJKLMNO".split("");
const ROW_LABELS = Array.from({ length: 15 }, (_, i) => String(i + 1));

/** Board coordinate as players say it: column letter + row number, e.g. "H8". */
export function cellName(row: number, col: number): string {
  return `${COLUMN_LABELS[col]}${row + 1}`;
}

export function ScrabbleBoard() {
  const gameState = useScrabbleGameStore((s) => s.gameState);
  const selectedTile = useScrabbleGameStore((s) => s.selectedTile);
  const tentativePlacements = useScrabbleGameStore((s) => s.tentativePlacements);
  const currentPlayerId = useScrabbleGameStore((s) => s.currentPlayerId);
  const setSelectedTile = useScrabbleGameStore((s) => s.setSelectedTile);
  const addTentativePlacement = useScrabbleGameStore((s) => s.addTentativePlacement);
  const lastPlayedCells = useScrabbleGameStore((s) => s.lastPlayedCells);
  const invalidMoveAt = useScrabbleGameStore((s) => s.invalidMoveAt);
  const { placeTiles, recallTile } = useScrabbleSocket();
  const exchangeMode = useScrabbleGameStore((s) => s.exchangeMode);

  const [pendingBlankPlacement, setPendingBlankPlacement] = useState<{ row: number; col: number } | null>(null);

  const tentativeMap = useMemo(
    () => new Map(tentativePlacements.map((p) => [`${p.row},${p.col}`, p])),
    [tentativePlacements]
  );
  const flashSet = useMemo(() => new Set(lastPlayedCells), [lastPlayedCells]);

  if (!gameState) return null;

  const isMyTurn = gameState.currentTurnPlayerId === currentPlayerId;
  const canPlace = isMyTurn && selectedTile !== null;

  function handleCellClick(cell: ScrabbleBoardCell) {
    // Clicking one of my tentative tiles takes it back to the rack
    const tentative = tentativeMap.get(`${cell.row},${cell.col}`);
    if (tentative) {
      if (isMyTurn && !exchangeMode) recallTile(tentative.tile.id);
      return;
    }
    if (!selectedTile || cell.tile || tentativeMap.has(`${cell.row},${cell.col}`) || !isMyTurn) return;
    if (selectedTile.isBlank) {
      setPendingBlankPlacement({ row: cell.row, col: cell.col });
      return;
    }
    const placement = { tile: selectedTile, row: cell.row, col: cell.col };
    addTentativePlacement(placement);
    placeTiles([placement]);
    setSelectedTile(null);
  }

  function handleBlankLetterSelect(letter: string) {
    if (!selectedTile || !pendingBlankPlacement) return;
    const placement = { tile: { ...selectedTile, assignedLetter: letter }, ...pendingBlankPlacement };
    addTentativePlacement(placement);
    placeTiles([placement]);
    setSelectedTile(null);
    setPendingBlankPlacement(null);
  }

  return (
    <>
      {/* Width lives on this wrapper (it also holds the coordinate labels); the
          wrapper is the cqw container that board text scales with. */}
      <div
        className={composeClasses(
          // As large as the screen allows: full width on phones, and on taller-than-needed
          // screens capped by the height left after header + rack + actions (keep the
          // offsets in sync with ScrabbleTable).
          "@container grid w-[min(100%,calc(100dvh-16rem))] lg:w-full",
          "grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_auto] gap-x-1 gap-y-0.5"
        )}
      >
        <span aria-hidden />
        <CoordinateLabels labels={COLUMN_LABELS} axis="x" />
        <CoordinateLabels labels={ROW_LABELS} axis="y" />
        <div
          data-testid="board"
          role="grid"
          aria-label="Tablero"
          // Re-keying on a rejected move replays the shake animation
          key={invalidMoveAt ?? "board"}
          className={composeClasses(
            "grid gap-px rounded-lg border-4 border-board-frame bg-board-frame p-0.5 shadow-2xl",
            invalidMoveAt !== null && "animate-shake ring-2 ring-danger/70"
          )}
          style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}
        >
          {gameState.board.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r},${c}`;
              const tentative = tentativeMap.get(key);
              const occupied = cell.tile !== null || tentative !== undefined;
              const label = MULTIPLIER_NAMES[cell.multiplier];
              const flash = flashSet.has(key);
              const canRecall = tentative !== undefined && isMyTurn && !exchangeMode;
              const name = cellName(r, c);

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  role="gridcell"
                  aria-label={
                    canRecall
                      ? `${name}, ficha colocada: click para devolverla al atril`
                      : `${name}${label ? `, ${label}` : ""}`
                  }
                  title={canRecall ? "Devolver al atril" : undefined}
                  onClick={() => handleCellClick(cell)}
                  disabled={canRecall ? false : !canPlace || occupied}
                  className={composeClasses(
                    "relative flex aspect-square items-center justify-center rounded-[3px] p-px",
                    "text-[max(0.5rem,2.1cqw)] font-semibold leading-none",
                    "transition-colors duration-100 disabled:cursor-default",
                    !occupied && MULTIPLIER_CLASSES[cell.multiplier],
                    !occupied && canPlace && "cursor-pointer hover:brightness-125 ring-inset hover:ring-1 hover:ring-accent/70",
                    occupied && "bg-board-cell",
                    canRecall && "cursor-pointer hover:brightness-90"
                  )}
                >
                  {cell.tile ? (
                    <ScrabbleTile tile={cell.tile} size="sm" className={flash ? "animate-word-flash z-10" : undefined} />
                  ) : tentative ? (
                    <ScrabbleTile tile={tentative.tile} size="sm" isPlaced className="animate-tile-drop" />
                  ) : (
                    <span aria-hidden className="text-white/55">
                      {MULTIPLIER_LABELS[cell.multiplier]}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      <BlankTileModal
        open={pendingBlankPlacement !== null}
        onSelect={handleBlankLetterSelect}
        onCancel={() => setPendingBlankPlacement(null)}
      />
    </>
  );
}

/** Column letters above the board / row numbers beside it, aligned with the cells. */
function CoordinateLabels({ labels, axis }: { labels: string[]; axis: "x" | "y" }) {
  return (
    <div
      aria-hidden
      className={composeClasses(
        // Same frame offsets as the board (4px border + 2px padding, 1px gaps) so labels line up
        "grid gap-px text-[max(0.5rem,1.6cqw)] font-medium leading-none text-ink-faint select-none",
        axis === "x" ? "grid-flow-col auto-cols-fr px-1.5" : "grid-flow-row auto-rows-fr py-1.5 pr-0.5"
      )}
    >
      {labels.map((l) => (
        <span key={l} className="flex items-center justify-center">
          {l}
        </span>
      ))}
    </div>
  );
}
