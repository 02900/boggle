import fs from "fs";
import path from "path";
import { SCOREBOARD_FILE } from "../config/constants";
import type { ScoreboardEntry } from "../src/interfaces/server";

const getScoreboardPath = (): string => path.join(process.cwd(), SCOREBOARD_FILE);

export function loadScoreboard(): ScoreboardEntry[] {
  try {
    const scoreboardPath = getScoreboardPath();
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

export function saveScoreboard(scoreboard: ScoreboardEntry[]): void {
  try {
    const scoreboardPath = getScoreboardPath();
    fs.writeFileSync(scoreboardPath, JSON.stringify(scoreboard, null, 2));
  } catch (error) {
    console.error("Error al guardar scoreboard:", error);
  }
}

export function updateScoreboard(
  playerScores: Array<{ name: string; score: number }>,
  playerCount: number
): ScoreboardEntry[] {
  const scoreboard = loadScoreboard();
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

  saveScoreboard(top50);
  return top50;
}
