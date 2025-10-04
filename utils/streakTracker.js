import fs from "fs";
import path from "path";

const STREAK_FILE_PATH = path.join(
  process.cwd(),
  "data",
  "player-streaks.json"
);
const SESSION_DURATION = 6 * 60 * 60 * 1000; // 6 horas en milisegundos

/**
 * Servicio para trackear total de victorias de jugadores durante sesiones de 6 horas
 */
export class StreakTracker {
  constructor() {
    this.streaks = new Map();
    this.loadStreaks();
  }

  /**
   * Carga las rachas desde el archivo JSON
   */
  loadStreaks() {
    try {
      // Crear directorio data si no existe
      const dataDir = path.dirname(STREAK_FILE_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(STREAK_FILE_PATH)) {
        const data = fs.readFileSync(STREAK_FILE_PATH, "utf8");
        const streakData = JSON.parse(data);

        // Convertir el objeto a Map y limpiar sesiones expiradas
        Object.entries(streakData).forEach(([playerName, playerData]) => {
          // Usar sessionStartTime si existe, sino lastWinTime para compatibilidad
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

  /**
   * Guarda las rachas al archivo JSON
   */
  saveStreaks() {
    try {
      const streakData = Object.fromEntries(this.streaks);
      fs.writeFileSync(STREAK_FILE_PATH, JSON.stringify(streakData, null, 2));
    } catch (error) {
      console.error("Error guardando rachas:", error);
    }
  }

  /**
   * Verifica si una sesión sigue activa (dentro de las 6 horas)
   */
  isSessionActive(lastWinTime) {
    if (!lastWinTime) return false;
    return Date.now() - lastWinTime < SESSION_DURATION;
  }

  /**
   * Registra una victoria para un jugador
   */
  recordWin(playerName) {
    const now = Date.now();
    const currentData = this.streaks.get(playerName);

    if (currentData && this.isSessionActive(currentData.sessionStartTime)) {
      // Sesión activa - incrementar contador de victorias
      currentData.wins += 1;
      currentData.lastWinTime = now;
    } else {
      // Nueva sesión o sesión expirada - iniciar nueva sesión
      this.streaks.set(playerName, {
        wins: 1,
        lastWinTime: now,
        sessionStartTime: now,
      });
    }

    this.saveStreaks();
    return this.streaks.get(playerName);
  }

  /**
   * Obtiene el total de victorias de un jugador en la sesión actual
   */
  getPlayerStreak(playerName) {
    const data = this.streaks.get(playerName);
    if (data && this.isSessionActive(data.sessionStartTime)) {
      return data.wins;
    }
    return 0;
  }

  /**
   * Obtiene el total de victorias de múltiples jugadores
   */
  getPlayersStreaks(playerNames) {
    const result = {};
    playerNames.forEach((name) => {
      result[name] = this.getPlayerStreak(name);
    });
    return result;
  }

  /**
   * Limpia sesiones expiradas
   */
  cleanExpiredSessions() {
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

  /**
   * Obtiene estadísticas de la sesión actual
   */
  getSessionStats() {
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

// Instancia singleton
export const streakTracker = new StreakTracker();
