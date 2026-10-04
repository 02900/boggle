export const DEBUG_MODE = true; // cambiar a false para desactivar logs de eventos
export type GameType = "boggle" | "scrabble";

/**
 * One leaderboard per game: scores aren't comparable across games. Boggle keeps the
 * original file (every entry in it predates Scrabble).
 */
export const SCOREBOARD_FILES: Record<GameType, string> = {
  boggle: "scoreboard.json",
  scrabble: "scoreboard-scrabble.json",
};
