"use client";

function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-ink">{title}</h3>
      <div className="text-ink-muted">{children}</div>
    </div>
  );
}

// Tailwind only picks up literal class names, so no template interpolation here
const PREMIUM_BG = { tw: "bg-board-tw", dw: "bg-board-dw", tl: "bg-board-tl", dl: "bg-board-dl" };

function Premium({ kind, children }: { kind: keyof typeof PREMIUM_BG; children: React.ReactNode }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${PREMIUM_BG[kind]}`}>
      {children}
    </span>
  );
}

export function ScrabbleInstructions() {
  return (
    <div className="space-y-3 text-sm">
      <h2 className="text-lg font-bold text-ink">Reglas de Scrabble</h2>

      <Rule title="Objetivo">
        Formar palabras en el tablero usando tus fichas para obtener la mayor puntuación.
      </Rule>

      <Rule title="Jugadores">
        De 2 a 4. No se puede entrar a una partida ya empezada. El orden de turnos se sortea al iniciar.
      </Rule>

      <Rule title="Turno">
        Selecciona una ficha de tu atril y haz click en el tablero para colocarla. Las fichas deben formar una
        línea (horizontal o vertical) y conectar con fichas existentes. Se admiten palabras de 2 letras.
        Las palabras se validan automáticamente contra el diccionario (no hay desafíos).
      </Rule>

      <Rule title="Cambiar y pasar">
        En vez de jugar puedes cambiar fichas (solo si quedan al menos 7 en la bolsa) o pasar.
      </Rule>

      <Rule title="Tiempo">
        Cada turno dura 2 minutos. Si se agota, el reloj sigue corriendo en negativo y los demás jugadores pueden
        saltar el turno (cuenta como pase). Al final se muestra cuánto tiempo usó cada jugador.
      </Rule>

      <Rule title="Comodín">El comodín vale 0 puntos y representa la letra que elijas al colocarlo.</Rule>

      <Rule title="Puntuación">
        <ul className="list-inside list-disc space-y-1">
          <li>Cada letra tiene un valor en puntos</li>
          <li>
            <Premium kind="tw">3P</Premium> palabra triple · <Premium kind="dw">2P</Premium> palabra doble
          </li>
          <li>
            <Premium kind="tl">3L</Premium> letra triple · <Premium kind="dl">2L</Premium> letra doble
          </li>
          <li>Los multiplicadores solo aplican la primera vez que se cubren</li>
          <li>Usar las 7 fichas en un turno: +50 puntos</li>
        </ul>
      </Rule>

      <Rule title="Primer turno">Al menos una ficha debe cubrir la casilla central (★).</Rule>

      <Rule title="Fin del juego">
        Termina cuando la bolsa está vacía y un jugador coloca todas sus fichas, o tras 6 pases consecutivos.
        Cada jugador resta el valor de las fichas que le quedan (el puntaje puede quedar negativo); quien se
        quedó sin fichas suma ese total. Si un jugador abandona y queda uno solo, la partida termina con los
        puntajes actuales.
      </Rule>
    </div>
  );
}
