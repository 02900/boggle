"use client";

const SPANISH_LETTERS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
  "K", "L", "M", "N", "\u00D1", "O", "P", "Q", "R", "S",
  "T", "U", "V", "W", "X", "Y", "Z",
];

interface Props {
  open: boolean;
  onSelect: (letter: string) => void;
  onCancel: () => void;
}

export function BlankTileModal({ open, onSelect, onCancel }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-800 rounded-xl p-4 max-w-xs w-full text-white">
        <h3 className="text-center font-bold mb-3">Elige una letra para el comod&iacute;n</h3>
        <div className="grid grid-cols-7 gap-1.5 mb-3">
          {SPANISH_LETTERS.map((letter) => (
            <button
              key={letter}
              onClick={() => onSelect(letter)}
              className="w-9 h-9 flex items-center justify-center rounded bg-amber-100 text-gray-800 font-bold text-sm hover:bg-yellow-300 hover:scale-110 transition-all"
            >
              {letter}
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="w-full py-2 rounded bg-gray-600 hover:bg-gray-500 text-sm font-medium transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
