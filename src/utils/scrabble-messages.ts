import type {
  GameEndReason,
  TurnChangedEvent,
  TurnPlayedEvent,
} from "@/interfaces/scrabble";

/** Human-readable copy for Scrabble lifecycle events. Kept pure so it's easy to test. */

export function describeTurnPlayed(event: TurnPlayedEvent, isMe: boolean): string {
  const who = isMe ? "Jugaste" : `${event.playerName} jugó`;
  switch (event.type) {
    case "place": {
      const words = (event.words ?? []).map((w) => w.word.toUpperCase()).join(", ");
      return `${who} ${words} · +${event.score ?? 0} pts`;
    }
    case "pass":
      return isMe ? "Pasaste el turno" : `${event.playerName} pasó`;
    case "exchange": {
      const n = event.exchangedCount ?? 0;
      const fichas = n === 1 ? "1 ficha" : `${n} fichas`;
      return isMe ? `Cambiaste ${fichas}` : `${event.playerName} cambió ${fichas}`;
    }
    case "timeout":
      if (event.skippedByName) {
        return isMe
          ? `${event.skippedByName} saltó tu turno (tiempo agotado)`
          : `${event.skippedByName} saltó el turno de ${event.playerName}`;
      }
      return isMe ? "Se agotó tu tiempo" : `Se agotó el tiempo de ${event.playerName}`;
    case "disconnect":
      return `${event.playerName} perdió el turno por desconexión`;
  }
}

export function describeTurnChanged(event: TurnChangedEvent, isMe: boolean): string {
  if (isMe) return "¡Tu turno!";
  return `Turno de ${event.currentPlayerName ?? "..."}`;
}

/** Announced once when the current turn's clock reaches zero. */
export function describeOvertime(playerName: string, isMe: boolean): string {
  return isMe
    ? "Se agotó tu tiempo · los demás pueden saltar tu turno"
    : `Se agotó el tiempo de ${playerName} · puedes saltar su turno`;
}

/** "3:05 en total · 0:40 de más" for the end-of-game summary. */
export function describePlayerTime(timeUsed: number, overtime: number): string {
  const clock = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const total = `${clock(timeUsed)} en total`;
  return overtime > 0 ? `${total} · ${clock(overtime)} de más` : total;
}

export function describeGameEnd(reason: GameEndReason): string {
  switch (reason) {
    case "passes":
      return "Partida terminada: todos pasaron 6 veces seguidas";
    case "bag-empty":
      return "Partida terminada: se acabaron las fichas";
    case "abandon":
      return "Partida terminada por abandono";
  }
}
