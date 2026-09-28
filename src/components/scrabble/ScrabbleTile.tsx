"use client";

import { memo } from "react";
import { composeClasses } from "@/utils/compose-classes";
import type { ScrabbleTile as ScrabbleTileType } from "@/interfaces/scrabble";

interface Props {
  tile: ScrabbleTileType;
  isSelected?: boolean;
  /** Tentatively placed on the board this turn (not yet confirmed) */
  isPlaced?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
  className?: string;
  style?: React.CSSProperties;
}

const SIZE = {
  /** Fills its board cell */
  sm: "h-full w-full text-[0.7rem] sm:text-sm",
  md: "h-11 w-11 text-lg",
};

export const ScrabbleTile = memo(function ScrabbleTile({
  tile,
  isSelected,
  isPlaced,
  onClick,
  size = "md",
  className,
  style,
}: Props) {
  const letter = tile.isBlank ? tile.assignedLetter || "" : tile.letter;
  const isDigraph = letter.length > 1;
  const ariaLabel = `Ficha ${letter || "comodín"}${tile.value > 0 ? `, ${tile.value} puntos` : ""}`;

  // Interactive tiles (rack) are buttons; board tiles live inside a cell button, so they're plain divs.
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick, "aria-pressed": isSelected } : {})}
      aria-label={ariaLabel}
      data-testid="tile"
      data-letter={letter}
      style={style}
      className={composeClasses(
        className,
        SIZE[size],
        "relative flex items-center justify-center rounded-md font-bold select-none",
        "text-tile-ink transition-[transform,background-color,box-shadow] duration-150",
        onClick ? "cursor-pointer" : "cursor-default",
        isSelected
          ? "bg-tile-selected shadow-tile-lift -translate-y-1 ring-2 ring-accent"
          : isPlaced
            ? "bg-tile-tentative shadow-tile ring-1 ring-accent/60"
            : "bg-tile shadow-tile",
        onClick && !isSelected && "hover:-translate-y-0.5 hover:shadow-tile-lift"
      )}
    >
      <span className={composeClasses("leading-none", isDigraph && "text-[0.8em] tracking-tight")}>
        {letter || <span className="text-tile-ink/40">★</span>}
      </span>
      {tile.value > 0 && (
        <span className="absolute bottom-0.5 right-1 text-[0.55em] font-semibold leading-none text-tile-ink/60">
          {tile.value}
        </span>
      )}
      {tile.isBlank && letter && (
        <span aria-hidden className="absolute left-1 top-0.5 text-[0.5em] leading-none text-tile-ink/40">★</span>
      )}
    </Tag>
  );
});
