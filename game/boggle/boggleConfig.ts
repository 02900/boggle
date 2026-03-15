import type { DiceConfiguration } from "../../src/interfaces/server";

/**
 * Configuración de los 16 dados de Boggle en español
 * Cada dado tiene 6 caras con diferentes letras o dígrafos
 */
export function getDiceConfiguration(): DiceConfiguration {
  return [
    ["A", "E", "O", "S", "N", "R"],
    ["A", "E", "I", "O", "U", "L"],
    ["D", "E", "R", "L", "A", "S"],
    ["N", "C", "I", "O", "E", "T"],
    ["B", "U", "M", "A", "R", "O"],
    ["QU", "E", "I", "T", "A", "S"],
    ["G", "L", "E", "A", "N", "O"],
    ["CH", "A", "R", "E", "I", "S"],
    ["P", "O", "L", "A", "S", "U"],
    ["V", "E", "R", "A", "I", "D"],
    ["M", "E", "N", "T", "O", "A"],
    ["Z", "A", "QU", "U", "E", "N"],
    ["H", "O", "S", "T", "I", "A"],
    ["F", "A", "L", "D", "E", "I"],
    ["LL", "A", "O", "R", "I", "S"],
    ["Ñ", "C", "E", "A", "N", "O"],
  ];
}

/**
 * Calcula los puntos de una palabra según su longitud
 */
export function calculateWordPoints(word: string): number {
  const length = word.length;
  if (length <= 4) return 1;
  if (length === 5) return 2;
  if (length === 6) return 3;
  if (length === 7) return 5;
  return 11; // 8+ letters
}
