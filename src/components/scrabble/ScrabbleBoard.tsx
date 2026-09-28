"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { useScrabbleSocket } from "@/hooks/use-scrabble-socket";
import { composeClasses } from "@/utils/compose-classes";
import { orderRack } from "@/utils/rack-order";
import {
  BOARD_SIZE,
  keyToLetter,
  moveFocus,
  nextFreeCell,
  pickTileForLetter,
  placementDirection,
} from "@/utils/board-keyboard";
import { ScrabbleTile } from "./ScrabbleTile";
import { BlankTileModal } from "./BlankTileModal";
import type { MultiplierType, ScrabbleTile as ScrabbleTileType } from "@/interfaces/scrabble";

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

/** H8: the only tab stop until the player moves around the board. */
const CENTER_INDEX = 7 * BOARD_SIZE + 7;

export function ScrabbleBoard() {
  // Narrow selectors: the turn timer rewrites gameState every second, but the
  // board only cares about the cells and whose turn it is.
  const board = useScrabbleGameStore((s) => s.gameState?.board);
  const isMyTurn = useScrabbleGameStore(
    (s) => s.gameState?.gameState === "playing" && s.gameState.currentTurnPlayerId === s.currentPlayerId
  );
  const hasSelection = useScrabbleGameStore((s) => s.selectedTile !== null);
  const tentativePlacements = useScrabbleGameStore((s) => s.tentativePlacements);
  const exchangeMode = useScrabbleGameStore((s) => s.exchangeMode);
  const lastPlayedCells = useScrabbleGameStore((s) => s.lastPlayedCells);
  const invalidMoveAt = useScrabbleGameStore((s) => s.invalidMoveAt);
  const { placeTiles, recallTile } = useScrabbleSocket();

  const [pendingBlankPlacement, setPendingBlankPlacement] = useState<{ row: number; col: number } | null>(null);
  const [focusIndex, setFocusIndex] = useState(CENTER_INDEX);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const tentativeMap = useMemo(
    () => new Map(tentativePlacements.map((p) => [p.row * BOARD_SIZE + p.col, p])),
    [tentativePlacements]
  );
  const flashSet = useMemo(() => new Set(lastPlayedCells), [lastPlayedCells]);

  const canAct = isMyTurn && !exchangeMode;

  // Handlers read the latest state from the store so they stay stable and the
  // memoized cells only re-render when their own props change.
  const place = useCallback(
    (tile: ScrabbleTileType, row: number, col: number, assignedLetter?: string) => {
      const s = useScrabbleGameStore.getState();
      const placement = { tile: assignedLetter ? { ...tile, assignedLetter } : tile, row, col };
      s.addTentativePlacement(placement);
      placeTiles([placement]);
      s.setSelectedTile(null);
    },
    [placeTiles]
  );

  const focusCell = useCallback((index: number) => {
    setFocusIndex(index);
    cellRefs.current[index]?.focus();
  }, []);

  const activate = useCallback(
    (row: number, col: number) => {
      const s = useScrabbleGameStore.getState();
      const gs = s.gameState;
      if (!gs || gs.gameState !== "playing" || gs.currentTurnPlayerId !== s.currentPlayerId || s.exchangeMode) return;

      // Clicking one of my tentative tiles takes it back to the rack
      const tentative = s.tentativePlacements.find((p) => p.row === row && p.col === col);
      if (tentative) {
        recallTile(tentative.tile.id);
        return;
      }
      if (gs.board[row][col].tile || !s.selectedTile) return;
      if (s.selectedTile.isBlank) {
        setPendingBlankPlacement({ row, col });
        return;
      }
      place(s.selectedTile, row, col);
    },
    [place, recallTile]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, row: number, col: number) => {
      const index = row * BOARD_SIZE + col;
      const moved = moveFocus(index, e.key);
      if (moved !== null) {
        e.preventDefault();
        focusCell(moved);
        return;
      }

      const s = useScrabbleGameStore.getState();
      const gs = s.gameState;
      const myTurn = gs?.gameState === "playing" && gs.currentTurnPlayerId === s.currentPlayerId && !s.exchangeMode;

      if (e.key === "Escape") {
        s.setSelectedTile(null);
        return;
      }
      if (!gs || !myTurn || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        const here = s.tentativePlacements.find((p) => p.row === row && p.col === col);
        if (here) {
          recallTile(here.tile.id);
          return;
        }
        // Like a text field: step back over the word and take that tile back
        const [dr, dc] = placementDirection(s.tentativePlacements) === "down" ? [1, 0] : [0, 1];
        const pr = row - dr;
        const pc = col - dc;
        if (pr < 0 || pc < 0) return;
        focusCell(pr * BOARD_SIZE + pc);
        const prev = s.tentativePlacements.find((p) => p.row === pr && p.col === pc);
        if (prev) recallTile(prev.tile.id);
        return;
      }

      const letter = keyToLetter(e.key);
      if (!letter) return;
      e.preventDefault();
      if (gs.board[row][col].tile || s.tentativePlacements.some((p) => p.row === row && p.col === col)) return;

      const rack = orderRack(s.rack, s.rackOrder).filter(
        (t) => !s.tentativePlacements.some((p) => p.tile.id === t.id)
      );
      const pick = pickTileForLetter(rack, letter);
      if (!pick) {
        s.notify("error", `No tienes la letra ${letter}`, 2000);
        return;
      }
      place(pick.tile, row, col, pick.assignedLetter);

      const placed = [...s.tentativePlacements, { tile: pick.tile, row, col }];
      const next = nextFreeCell(gs.board, placed, row, col, placementDirection(placed));
      if (next !== null) focusCell(next);
    },
    [focusCell, place, recallTile]
  );

  const handleFocus = useCallback((index: number) => setFocusIndex(index), []);
  const registerCell = useCallback((index: number, el: HTMLButtonElement | null) => {
    cellRefs.current[index] = el;
  }, []);

  if (!board) return null;

  function handleBlankLetterSelect(letter: string) {
    const selected = useScrabbleGameStore.getState().selectedTile;
    if (!selected || !pendingBlankPlacement) return;
    place(selected, pendingBlankPlacement.row, pendingBlankPlacement.col, letter);
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
          aria-label="Tablero. Flechas para moverte, escribe una letra para colocar esa ficha, Retroceso para devolverla."
          // Re-keying on a rejected move replays the shake animation
          key={invalidMoveAt ?? "board"}
          className={composeClasses(
            "grid gap-px rounded-lg border-4 border-board-frame bg-board-frame p-0.5 shadow-2xl",
            invalidMoveAt !== null && "animate-shake ring-2 ring-danger/70"
          )}
          style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}
        >
          {board.map((cells, r) =>
            cells.map((cell, c) => {
              const index = r * BOARD_SIZE + c;
              const tentative = tentativeMap.get(index);
              return (
                <BoardCell
                  key={index}
                  row={r}
                  col={c}
                  multiplier={cell.multiplier}
                  tile={cell.tile}
                  tentativeTile={tentative?.tile ?? null}
                  flash={flashSet.has(`${r},${c}`)}
                  placeable={canAct && hasSelection && !cell.tile && !tentative}
                  recallable={canAct && tentative !== undefined}
                  tabStop={index === focusIndex}
                  onActivate={activate}
                  onKeyDown={handleKeyDown}
                  onFocusCell={handleFocus}
                  registerCell={registerCell}
                />
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

interface BoardCellProps {
  row: number;
  col: number;
  multiplier: MultiplierType;
  tile: ScrabbleTileType | null;
  tentativeTile: ScrabbleTileType | null;
  flash: boolean;
  /** A tile is selected and this cell is free */
  placeable: boolean;
  /** Holds one of my tentative tiles: activating it takes it back */
  recallable: boolean;
  /** Roving tabindex: the one cell reachable with Tab */
  tabStop: boolean;
  onActivate: (row: number, col: number) => void;
  onKeyDown: (e: React.KeyboardEvent, row: number, col: number) => void;
  onFocusCell: (index: number) => void;
  registerCell: (index: number, el: HTMLButtonElement | null) => void;
}

/** One board square. Memoized: a placement re-renders a couple of cells, not 225. */
const BoardCell = memo(function BoardCell({
  row,
  col,
  multiplier,
  tile,
  tentativeTile,
  flash,
  placeable,
  recallable,
  tabStop,
  onActivate,
  onKeyDown,
  onFocusCell,
  registerCell,
}: BoardCellProps) {
  const index = row * BOARD_SIZE + col;
  const occupied = tile !== null || tentativeTile !== null;
  const name = cellName(row, col);
  const label = MULTIPLIER_NAMES[multiplier];
  const content = tile ?? tentativeTile;
  const letter = content ? (content.isBlank ? content.assignedLetter ?? "" : content.letter) : "";

  return (
    <button
      ref={(el) => registerCell(index, el)}
      type="button"
      role="gridcell"
      aria-label={
        recallable
          ? `${name}, ${letter} colocada: activa para devolverla al atril`
          : content
            ? `${name}, ${letter}`
            : `${name}${label ? `, ${label}` : ""}`
      }
      // Not `disabled`: disabled buttons can't take focus, which keyboard play needs
      aria-disabled={!placeable && !recallable}
      tabIndex={tabStop ? 0 : -1}
      title={recallable ? "Devolver al atril" : undefined}
      onClick={() => onActivate(row, col)}
      onKeyDown={(e) => onKeyDown(e, row, col)}
      onFocus={() => onFocusCell(index)}
      className={composeClasses(
        "relative flex aspect-square items-center justify-center rounded-[3px] p-px",
        "text-[max(0.5rem,2.1cqw)] font-semibold leading-none",
        "transition-colors duration-100 cursor-default",
        "focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
        !occupied && MULTIPLIER_CLASSES[multiplier],
        placeable && "cursor-pointer hover:brightness-125 ring-inset hover:ring-1 hover:ring-accent/70",
        occupied && "bg-board-cell",
        recallable && "cursor-pointer hover:brightness-90"
      )}
    >
      {tile ? (
        <ScrabbleTile tile={tile} size="sm" className={flash ? "animate-word-flash z-10" : undefined} />
      ) : tentativeTile ? (
        <ScrabbleTile tile={tentativeTile} size="sm" isPlaced className="animate-tile-drop" />
      ) : (
        <span aria-hidden className="text-white/55">
          {MULTIPLIER_LABELS[multiplier]}
        </span>
      )}
    </button>
  );
});

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
