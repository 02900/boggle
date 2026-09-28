// 2 minutos por turno. Al agotarse el reloj sigue en negativo y los rivales pueden saltar el turno.
// Overridable por env para e2e (el cliente no lo usa).
export const SCRABBLE_TURN_TIME_LIMIT = Number(process.env.SCRABBLE_TURN_TIME_LIMIT) || 120;
export const SCRABBLE_GRACE_PERIOD = 30000; // 30 segundos de gracia para reconexión
export const SCRABBLE_BOARD_SIZE = 15; // Tablero 15x15
export const SCRABBLE_RACK_SIZE = 7; // 7 fichas por jugador
export const SCRABBLE_BINGO_BONUS = 50; // Bonus por usar las 7 fichas
export const SCRABBLE_MIN_WORD_LENGTH = 2; // Scrabble admite palabras de 2 letras
export const SCRABBLE_MAX_CONSECUTIVE_PASSES = 6; // Regla estándar: 6 pases seguidos terminan la partida
export const SCRABBLE_MAX_PLAYERS = 4; // Regla estándar: 2–4 jugadores
export const SCRABBLE_MIN_BAG_FOR_EXCHANGE = 7; // Solo se puede cambiar si quedan ≥7 fichas en la bolsa
