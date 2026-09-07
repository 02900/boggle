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
      return isMe ? "Se agotó tu tiempo" : `Se agotó el tiempo de ${event.playerName}`;
    case "disconnect":
      return `${event.playerName} perdió el turno por desconexión`;
  }
}

export function describeTurnChanged(event: TurnChangedEvent, isMe: boolean): string {
  if (isMe) return "¡Tu turno!";
  return `Turno de ${event.currentPlayerName ?? "..."}`;
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
