import React, { useEffect, useRef, useState } from "react";
import { useViewportStore } from "@/stores/viewport.store";
import { useGameLogicStore } from "@/stores/game-logic.store";
import { useBoggleGameMainStore } from "./BoggleGameMain/boogle-game.main.store";
import { useBoggleGameMain } from "./BoggleGameMain/use-boggle-game-main";

export const GameBoard = () => {
  const { currentWord, message } = useGameLogicStore();
  const {
    gameState,
    highlightedPath,
    highlightedErrorPath,
    highlightedSkipPath,
  } = useBoggleGameMainStore();

  const {
    handleCellMouseDownWrapper,
    handleCellMouseEnterWrapper,
    handleKeyboardWordInput,
    handleMouseLeave,
    handleMouseUpWrapper,
    isCellSelected,
  } = useBoggleGameMain();

  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [typedWord, setTypedWord] = useState("");
  const { isMobile } = useViewportStore();

  // Enfocar el input invisible cuando el componente se monta y el juego está activo (solo en desktop)
  useEffect(() => {
    if (
      !isMobile &&
      gameState.gameState === "playing" &&
      hiddenInputRef.current
    ) {
      hiddenInputRef.current.focus();
    }
  }, [gameState.gameState, isMobile]);

  // Manejar entrada del teclado - Nuevo enfoque con palabra flotante
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    if (gameState.gameState !== "playing") return;

    const key = e.key.toLowerCase();

    if (key === "enter") {
      // Solo enviar si hay una palabra escrita
      if (typedWord.trim().length >= 3) {
        handleKeyboardWordInput(typedWord.trim());
        setTypedWord(""); // Limpiar después del submit
      }
    } else if (key === "backspace") {
      // Eliminar última letra de la palabra flotante
      setTypedWord((prev) => prev.slice(0, -1));
    } else if (/^[a-záéíóúñü]$/.test(key)) {
      // Agregar letra a la palabra flotante
      setTypedWord((prev) => prev + key.toUpperCase());
    }
  };

  // Mantener el foco en el input invisible (solo desktop)
  const handleInputBlur = () => {
    if (
      !isMobile &&
      gameState.gameState === "playing" &&
      hiddenInputRef.current
    ) {
      setTimeout(() => {
        hiddenInputRef.current?.focus();
      }, 0);
    }
  };

  // Eventos táctiles para móviles
  const handleTouchStart = (e: React.TouchEvent, row: number, col: number) => {
    if (isMobile) {
      e.preventDefault();
      handleCellMouseDownWrapper(row, col);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isMobile) {
      e.preventDefault();
      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const cellElement = element?.closest("[data-cell]");

      if (cellElement) {
        const row = parseInt(cellElement.getAttribute("data-row") || "0");
        const col = parseInt(cellElement.getAttribute("data-col") || "0");
        handleCellMouseEnterWrapper(row, col);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isMobile) {
      e.preventDefault();
      handleMouseUpWrapper();
    }
  };

  const className = !isMobile
    ? "bg-white rounded-lg shadow-md p-6 relative"
    : "";

  return (
    <div
      className={className}
      onClick={() => !isMobile && hiddenInputRef.current?.focus()}
    >
      {/* Input invisible para capturar teclas del teclado (solo desktop) */}
      {!isMobile && (
        <input
          ref={hiddenInputRef}
          type="text"
          className="absolute opacity-0 pointer-events-none -z-10"
          onKeyDown={handleKeyDown}
          onBlur={handleInputBlur}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      )}

      {/* Overlay flotante para mostrar la palabra que se está escribiendo (solo desktop) */}
      {!isMobile && typedWord && (
        <div className="fixed bottom-4 left-1/2 translate-x-[-50%] z-10">
          <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg border-2 border-blue-600">
            <div className="text-xs text-blue-100 mb-1">Escribiendo:</div>
            <div className="text-lg font-mono font-bold">{typedWord}</div>
            <div className="text-xs text-blue-100 mt-1">
              Presiona Enter para buscar
            </div>
          </div>
        </div>
      )}

      {gameState.board.length > 0 ? (
        <div
          className={`grid grid-cols-4 mx-auto select-none mobile-drag-area ${
            isMobile ? "w-auto gap-8" : "w-fit gap-4"
          }`}
          onMouseUp={handleMouseUpWrapper}
          onMouseLeave={handleMouseLeave}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {gameState.board.map((row, rowIndex) =>
            row.map((letter, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                data-cell="true"
                data-row={rowIndex}
                data-col={colIndex}
                className={`
                  flex items-center justify-center font-bold cursor-pointer transition-all
                  ${
                    // Prioridad: highlightedSkipPath (naranja) > highlightedErrorPath (rojo) > highlightedPath (verde) > selección actual (azul)
                    highlightedSkipPath.some(
                      ([r, c]) => r === rowIndex && c === colIndex
                    )
                      ? "bg-orange-500 text-white scale-105 shadow-lg ring-2 ring-orange-300"
                      : highlightedErrorPath.some(
                          ([r, c]) => r === rowIndex && c === colIndex
                        )
                      ? "bg-red-500 text-white scale-105 shadow-lg ring-2 ring-red-300"
                      : highlightedPath.some(
                          ([r, c]) => r === rowIndex && c === colIndex
                        )
                      ? "bg-green-500 text-white scale-105 shadow-lg ring-2 ring-green-300"
                      : isCellSelected(rowIndex, colIndex)
                      ? "bg-blue-500 text-white scale-105 shadow-lg"
                      : "bg-white md:bg-gray-100 hover:bg-gray-200 text-gray-800 hover:scale-102"
                  }
                  ${
                    isMobile
                      ? "aspect-square w-auto text-4xl rounded-2xl"
                      : "rounded-lg w-16 h-16 text-xl"
                  }
                `}
                onMouseDown={() =>
                  handleCellMouseDownWrapper(rowIndex, colIndex)
                }
                onMouseEnter={() =>
                  handleCellMouseEnterWrapper(rowIndex, colIndex)
                }
                onTouchStart={(e) => handleTouchStart(e, rowIndex, colIndex)}
              >
                {letter}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <div className="animate-pulse">
            <div className="text-lg mb-2">⏳</div>
            <div>Esperando que comience el juego...</div>
          </div>
        </div>
      )}

      {/* Mostrar Palabra Actual */}
      {currentWord && (
        <div className="mt-6 text-center">
          <div className="text-lg font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg inline-block">
            Palabra Actual: <span className="font-mono">{currentWord}</span>
          </div>
        </div>
      )}

      {/* Mostrar Mensaje */}
      {message && !isMobile && (
        <div className="mt-4 text-center">
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border-l-4 border-blue-400">
            {message}
          </div>
        </div>
      )}
    </div>
  );
};
