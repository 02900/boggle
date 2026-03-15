import fs from "fs";
import path from "path";
import type { StreakData, SessionStats } from "../src/interfaces/server";

const STREAK_FILE_PATH = path.join(
  process.cwd(),
  "data",
  "player-streaks.json"
);
const SESSION_DURATION = 6 * 60 * 60 * 1000; // 6 horas en milisegundos

export class StreakTracker {
  streaks: Map<string, StreakData>;

  constructor() {
    this.streaks = new Map();
    this.loadStreaks();
  }

  loadStreaks(): void {
    try {
      const dataDir = path.dirname(STREAK_FILE_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(STREAK_FILE_PATH)) {
        const data = fs.readFileSync(STREAK_FILE_PATH, "utf8");
        const streakData: Record<string, StreakData> = JSON.parse(data);

        Object.entries(streakData).forEach(([playerName, playerData]) => {
          const sessionTime = playerData.sessionStartTime || playerData.lastWinTime;
          if (this.isSessionActive(sessionTime)) {
            this.streaks.set(playerName, playerData);
          }
        });

        console.log(`Rachas cargadas: ${this.streaks.size} jugadores activos`);
      }
    } catch (error) {
      console.error("Error cargando rachas:", error);
      this.streaks = new Map();
    }
  }

  saveStreaks(): void {
    try {
      const streakData = Object.fromEntries(this.streaks);
      fs.writeFileSync(STREAK_FILE_PATH, JSON.stringify(streakData, null, 2));
    } catch (error) {
      console.error("Error guardando rachas:", error);
    }
  }

  isSessionActive(lastWinTime: number | undefined): boolean {
    if (!lastWinTime) return false;
    return Date.now() - lastWinTime < SESSION_DURATION;
  }

  recordWin(playerName: string): StreakData {
    const now = Date.now();
    const currentData = this.streaks.get(playerName);

    if (currentData && this.isSessionActive(currentData.sessionStartTime)) {
      currentData.wins += 1;
      currentData.lastWinTime = now;
    } else {
      this.streaks.set(playerName, {
        wins: 1,
        lastWinTime: now,
        sessionStartTime: now,
      });
    }

    this.saveStreaks();
    return this.streaks.get(playerName)!;
  }

  getPlayerStreak(playerName: string): number {
    const data = this.streaks.get(playerName);
    if (data && this.isSessionActive(data.sessionStartTime)) {
      return data.wins;
    }
    return 0;
  }

  getPlayersStreaks(playerNames: string[]): Record<string, number> {
    const result: Record<string, number> = {};
    playerNames.forEach((name) => {
      result[name] = this.getPlayerStreak(name);
    });
    return result;
  }

  cleanExpiredSessions(): number {
    let cleaned = 0;

    for (const [playerName, data] of this.streaks.entries()) {
      if (!this.isSessionActive(data.sessionStartTime)) {
        this.streaks.delete(playerName);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.saveStreaks();
      console.log(`Limpiadas ${cleaned} sesiones expiradas`);
    }

    return cleaned;
  }

  getSessionStats(): SessionStats {
    this.cleanExpiredSessions();

    const activePlayers = Array.from(this.streaks.entries()).map(
      ([name, data]) => ({
        name,
        wins: data.wins,
        sessionDuration: Date.now() - data.sessionStartTime,
      })
    );

    return {
      totalActivePlayers: activePlayers.length,
      players: activePlayers.sort((a, b) => b.wins - a.wins),
    };
  }
}

export const streakTracker = new StreakTracker();
