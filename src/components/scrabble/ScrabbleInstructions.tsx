"use client";

export function ScrabbleInstructions() {
  return (
    <div className="bg-gray-800 text-white rounded-lg p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Reglas de Scrabble</h2>

      <div className="space-y-3 text-sm text-gray-300">
        <div>
          <h3 className="font-semibold text-white">Objetivo</h3>
          <p>Formar palabras en el tablero usando tus fichas para obtener la mayor puntuacion.</p>
        </div>

        <div>
          <h3 className="font-semibold text-white">Turno</h3>
          <p>Selecciona una ficha de tu atril y haz click en el tablero para colocarla. Las fichas deben formar una linea (horizontal o vertical) y conectar con fichas existentes.</p>
        </div>

        <div>
          <h3 className="font-semibold text-white">Puntuacion</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Cada letra tiene un valor en puntos</li>
            <li><span className="text-red-400">TW</span> = Palabra triple, <span className="text-pink-400">DW</span> = Palabra doble</li>
            <li><span className="text-blue-400">TL</span> = Letra triple, <span className="text-cyan-400">DL</span> = Letra doble</li>
            <li>Los multiplicadores solo aplican la primera vez que se cubren</li>
            <li>Usar las 7 fichas en un turno: +50 puntos bonus</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-white">Primer turno</h3>
          <p>Al menos una ficha debe cubrir la casilla central del tablero.</p>
        </div>

        <div>
          <h3 className="font-semibold text-white">Fin del juego</h3>
          <p>El juego termina cuando la bolsa esta vacia y un jugador coloca todas sus fichas, o cuando todos los jugadores pasan consecutivamente.</p>
        </div>
      </div>
    </div>
  );
}
