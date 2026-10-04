import fs from "fs";
import path from "path";
import { SCOREBOARD_FILES, type GameType } from "../config/constants";
import type { ScoreboardEntry } from "../src/interfaces/server";

const getScoreboardPath = (gameType: GameType): string =>
  path.join(process.cwd(), SCOREBOARD_FILES[gameType]);

export function loadScoreboard(gameType: GameType): ScoreboardEntry[] {
  try {
    const scoreboardPath = getScoreboardPath(gameType);
    if (fs.existsSync(scoreboardPath)) {
      const data = fs.readFileSync(scoreboardPath, "utf8");
      return JSON.parse(data);
    } else {
      const emptyScoreboard: ScoreboardEntry[] = [];
      fs.writeFileSync(
        scoreboardPath,
        JSON.stringify(emptyScoreboard, null, 2)
      );
      console.log("Archivo de scoreboard creado:", scoreboardPath);
      return emptyScoreboard;
    }
  } catch (error) {
    console.error("Error al cargar scoreboard:", error);
    return [];
  }
}

export function saveScoreboard(gameType: GameType, scoreboard: ScoreboardEntry[]): void {
  try {
    const scoreboardPath = getScoreboardPath(gameType);
    fs.writeFileSync(scoreboardPath, JSON.stringify(scoreboard, null, 2));
  } catch (error) {
    console.error("Error al guardar scoreboard:", error);
  }
}

export function updateScoreboard(
  playerScores: Array<{ name: string; score: number }>,
  playerCount: number,
  gameType: GameType
): ScoreboardEntry[] {
  const scoreboard = loadScoreboard(gameType);
  const currentDate = new Date().toISOString().split("T")[0];

  playerScores.forEach(({ name, score }) => {
    if (score > 0) {
      scoreboard.push({
        name,
        score,
        date: currentDate,
        playerCount,
      });
    }
  });

  scoreboard.sort((a, b) => b.score - a.score);
  const top50 = scoreboard.slice(0, 50);

  saveScoreboard(gameType, top50);
  return top50;
}
