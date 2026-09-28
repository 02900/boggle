"use client";

import { useMemo, useState } from "react";
import { useScrabbleGameStore } from "@/stores/scrabble-game.store";
import { ScrabbleTile } from "./ScrabbleTile";
import { composeClasses } from "@/utils/compose-classes";
import { orderRack } from "@/utils/rack-order";
import { SCRABBLE_RACK_SIZE } from "../../../config/scrabbleConstants";

export function TileRack() {
  const rack = useScrabbleGameStore((s) => s.rack);
  const selectedTile = useScrabbleGameStore((s) => s.selectedTile);
  const setSelectedTile = useScrabbleGameStore((s) => s.setSelectedTile);
  const tentativePlacements = useScrabbleGameStore((s) => s.tentativePlacements);
  const exchangeMode = useScrabbleGameStore((s) => s.exchangeMode);
  const selectedForExchange = useScrabbleGameStore((s) => s.selectedForExchange);
  const toggleExchangeSelection = useScrabbleGameStore((s) => s.toggleExchangeSelection);
  const rackOrder = useScrabbleGameStore((s) => s.rackOrder);
  const shuffleRack = useScrabbleGameStore((s) => s.shuffleRack);
  const moveRackTile = useScrabbleGameStore((s) => s.moveRackTile);

  // Drag & drop reordering (HTML5 DnD: desktop pointers; on touch, "Mezclar" still works)
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const displayRack = useMemo(
    () => orderRack(rack, rackOrder).filter((t) => !tentativePlacements.some((p) => p.tile.id === t.id)),
    [rack, rackOrder, tentativePlacements]
  );

  const endDrag = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

  /** Drop target props; `targetId` null means "to the end" (empty slots). */
  const dropProps = (targetId: string | null) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!draggingId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDropTargetId(targetId ?? "end");
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (draggingId) moveRackTile(draggingId, targetId);
      endDrag();
    },
  });
  const emptySlots = Math.max(0, SCRABBLE_RACK_SIZE - displayRack.length);
  const isMyTurn = useScrabbleGameStore(
    (s) => s.gameState?.gameState === "playing" && s.gameState.currentTurnPlayerId === s.currentPlayerId
  );
  const invalidMoveAt = useScrabbleGameStore((s) => s.invalidMoveAt);

  return (
    // sm+: the spacer mirrors the shuffle button so the rack stays centered.
    // Phones have no room beside a full rack, so the button sits on its corner.
    <div className="relative mx-auto flex w-fit items-center justify-center gap-2">
      <span aria-hidden className="hidden w-9 shrink-0 sm:block" />
      <div
        key={invalidMoveAt ?? "rack"}
        data-testid="tile-rack"
        role="group"
        aria-label="Tu atril"
        className={composeClasses(
          "mx-auto inline-flex items-center gap-1.5 rounded-xl border border-rack-edge bg-rack px-3 py-2.5 shadow-inner",
          isMyTurn && "animate-glow",
          invalidMoveAt !== null && "animate-shake"
        )}
      >
        {displayRack.map((tile, i) => {
          const isExchangeSelected = exchangeMode && selectedForExchange.has(tile.id);
          return (
            <div
              key={tile.id}
              className={composeClasses(
                "relative transition-[opacity,transform] duration-100",
                draggingId === tile.id && "opacity-40",
                dropTargetId === tile.id && draggingId !== tile.id && "-translate-y-1 scale-105"
              )}
              draggable={!exchangeMode}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", tile.id);
                setDraggingId(tile.id);
              }}
              onDragEnd={endDrag}
              {...dropProps(tile.id)}
            >
              {/* Keyed by tile id: freshly drawn tiles are dealt in with a stagger */}
              <ScrabbleTile
                tile={tile}
                className="animate-deal"
                style={{ animationDelay: `${i * 45}ms` }}
                isSelected={exchangeMode ? isExchangeSelected : selectedTile?.id === tile.id}
                onClick={() =>
                  exchangeMode
                    ? toggleExchangeSelection(tile.id)
                    : setSelectedTile(selectedTile?.id === tile.id ? null : tile)
                }
              />
              {isExchangeSelected && (
                <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-ink">
                  ✓
                </span>
              )}
            </div>
          );
        })}
        {Array.from({ length: emptySlots }, (_, i) => (
          <div
            key={`empty-${i}`}
            aria-hidden
            className={composeClasses(
              "h-11 w-11 rounded-md border border-dashed border-rack-edge/80 lg:h-14 lg:w-14",
              dropTargetId === "end" && "border-accent/70"
            )}
            {...dropProps(null)}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={shuffleRack}
        disabled={displayRack.length < 2}
        aria-label="Mezclar fichas"
        title="Mezclar fichas"
        data-testid="shuffle-rack"
        className={composeClasses(
          "flex shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-ink",
          "disabled:opacity-30 disabled:hover:bg-transparent",
          "absolute -right-2 -top-3 z-10 h-7 w-7 border border-edge bg-surface-raised text-sm",
          "sm:static sm:h-9 sm:w-9 sm:border-0 sm:bg-transparent sm:text-lg sm:hover:bg-surface-raised"
        )}
      >
        <span aria-hidden>⇄</span>
      </button>
    </div>
  );
}
