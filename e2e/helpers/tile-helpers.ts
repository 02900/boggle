/**
 * Common short Spanish words that are likely in the dictionary.
 * Used to find a playable word from random rack tiles.
 */
const COMMON_WORDS = [
  // 2-letter words
  "as", "da", "si", "no", "ya", "ir",
  // 3-letter words
  "sol", "sal", "mar", "pan", "rio", "luz", "eso", "uso",
  "era", "son", "ser", "oro", "uno", "sur", "sin", "dos",
  "dar", "ira", "red", "don", "ala", "aro", "asa", "ola",
  "osa", "oso", "rol", "ron", "sor", "una", "res", "tos",
  "mas", "les", "mis", "par", "pie", "fin", "mal", "mil",
  "col", "cal", "nos", "tos", "las", "los",
  // 4-letter words
  "casa", "mesa", "gato", "palo", "lado", "mano", "dona",
  "rosa", "luna", "sola", "sala", "oral", "rola", "silo",
  "piso", "ropa", "losa", "nido", "pila", "duro", "pura",
];

interface PlayableWord {
  word: string;
  /** Indices in the rack array for each letter of the word, in order */
  rackIndices: number[];
}

/**
 * Finds a word that can be formed from the available rack letters.
 * Returns the word and which rack tile indices to use.
 */
export function findPlayableWord(rackLetters: string[]): PlayableWord | null {
  const available = rackLetters.map((l) => l.toUpperCase());

  for (const word of COMMON_WORDS) {
    const needed = word.toUpperCase().split("");
    const tempAvailable = [...available];
    const usedOriginalIndices: number[] = [];
    let canForm = true;

    for (const letter of needed) {
      // Find the first available tile matching this letter that hasn't been used
      let foundIdx = -1;
      for (let i = 0; i < tempAvailable.length; i++) {
        if (tempAvailable[i] === letter) {
          foundIdx = i;
          break;
        }
      }

      if (foundIdx === -1) {
        canForm = false;
        break;
      }

      // Map back to original index: find the Nth occurrence in original
      let count = 0;
      for (let i = 0; i < available.length; i++) {
        if (available[i] === letter && !usedOriginalIndices.includes(i)) {
          if (count === 0) {
            usedOriginalIndices.push(i);
            break;
          }
          count++;
        }
      }

      tempAvailable[foundIdx] = ""; // Mark as used
    }

    if (canForm && usedOriginalIndices.length === needed.length) {
      return { word, rackIndices: usedOriginalIndices };
    }
  }

  return null;
}

/**
 * Calculate board positions for placing a word horizontally through center (7,7).
 * For the first turn, the word must cover the center cell.
 */
export function getFirstTurnPositions(
  wordLength: number
): Array<{ row: number; col: number }> {
  const centerCol = 7;
  const startCol = centerCol - Math.floor(wordLength / 2);
  return Array.from({ length: wordLength }, (_, i) => ({
    row: 7,
    col: startCol + i,
  }));
}
