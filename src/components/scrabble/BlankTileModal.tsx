"use client";

import { Button, Modal } from "@/components/ui";
// Exactly the letters the server accepts for a blank (no K/W; CH, LL, RR included)
import { BLANK_LETTER_CHOICES } from "../../../game/scrabble/scrabbleConfig";

interface Props {
  open: boolean;
  onSelect: (letter: string) => void;
  onCancel: () => void;
}

export function BlankTileModal({ open, onSelect, onCancel }: Props) {
  return (
    <Modal open={open} onClose={onCancel} title="Elige una letra para el comodín">
      <div className="mb-3 grid grid-cols-7 gap-1.5">
        {BLANK_LETTER_CHOICES.map((letter) => (
          <button
            key={letter}
            type="button"
            onClick={() => onSelect(letter)}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-tile text-sm font-bold text-tile-ink shadow-tile transition-transform hover:-translate-y-0.5 hover:bg-tile-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {letter}
          </button>
        ))}
      </div>
      <Button variant="ghost" fullWidth onClick={onCancel}>
        Cancelar
      </Button>
    </Modal>
  );
}
