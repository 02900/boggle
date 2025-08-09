import fs from 'fs';
import path from 'path';
import { SCOREBOARD_FILE } from '../config/constants.js';

// Obtener la ruta completa del archivo de scoreboard
const getScoreboardPath = () => path.join(process.cwd(), SCOREBOARD_FILE);

/**
 * Carga el scoreboard desde el archivo JSON
 * @returns {Array} Array de objetos con puntuaciones
 */
export function loadScoreboard() {
  try {
    const scoreboardPath = getScoreboardPath();
    if (fs.existsSync(scoreboardPath)) {
      const data = fs.readFileSync(scoreboardPath, 'utf8');
      return JSON.parse(data);
    } else {
      // Si el archivo no existe, crearlo con un array vacío
      const emptyScoreboard = [];
      fs.writeFileSync(
        scoreboardPath,
        JSON.stringify(emptyScoreboard, null, 2)
      );
      console.log('Archivo de scoreboard creado:', scoreboardPath);
      return emptyScoreboard;
    }
  } catch (error) {
    console.error('Error al cargar scoreboard:', error);
    return [];
  }
}

/**
 * Guarda el scoreboard en el archivo JSON
 * @param {Array} scoreboard - Array de puntuaciones a guardar
 */
export function saveScoreboard(scoreboard) {
  try {
    const scoreboardPath = getScoreboardPath();
    fs.writeFileSync(scoreboardPath, JSON.stringify(scoreboard, null, 2));
  } catch (error) {
    console.error('Error al guardar scoreboard:', error);
  }
}

/**
 * Actualiza el scoreboard con nuevas puntuaciones
 * @param {Array} playerScores - Array de objetos {name, score}
 * @param {number} playerCount - Número de jugadores en la partida
 * @returns {Array} Top 50 puntuaciones actualizadas
 */
export function updateScoreboard(playerScores, playerCount) {
  const scoreboard = loadScoreboard();
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Agregar nuevos puntajes
  playerScores.forEach(({ name, score }) => {
    if (score > 0) {
      // Solo agregar si el puntaje es mayor a 0
      scoreboard.push({
        name,
        score,
        date: currentDate,
        playerCount, // Agregar número de jugadores
      });
    }
  });

  // Ordenar por puntaje descendente y mantener solo los top 50
  scoreboard.sort((a, b) => b.score - a.score);
  const top50 = scoreboard.slice(0, 50);

  saveScoreboard(top50);
  return top50;
}