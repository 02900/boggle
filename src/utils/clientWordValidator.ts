import { dictionaryService, DictionaryLoadResult } from '@/services/dictionaryService';

/**
 * Validador de palabras del lado del cliente
 * Proporciona validación inmediata para mejorar la experiencia de usuario
 */

export interface ClientWordValidationResult {
  valid: boolean;
  reason?: string;
  points?: number;
  word?: string;
  isClientValidation: true; // Flag para distinguir de validación del servidor
}

export class ClientWordValidator {
  private loadResult: DictionaryLoadResult | null = null;
  private initializationPromise: Promise<DictionaryLoadResult> | null = null;
  private isClient: boolean = false;

  constructor() {
    this.isClient = typeof window !== 'undefined';
    if (this.isClient) {
      this.initializeDictionary();
    } else {
      // En el servidor, usar resultado de fallback inmediatamente
      this.loadResult = {
        success: false,
        wordsLoaded: 0,
        source: 'fallback',
        loadTime: 0,
        error: 'Server-side execution'
      };
    }
  }

  /**
   * Inicializa el diccionario de forma asíncrona
   */
  private initializeDictionary(): void {
    if (!this.initializationPromise) {
      this.initializationPromise = this.loadDictionaryWithLogging();
    }
  }

  /**
   * Carga el diccionario con logging detallado
   */
  private async loadDictionaryWithLogging(): Promise<DictionaryLoadResult> {
    try {
      console.log("CLIENT_VALIDATOR: Iniciando carga del diccionario...");
      
      const result = await dictionaryService.loadDictionary();
      this.loadResult = result;
      
      if (result.success) {
        console.log(`CLIENT_VALIDATOR: ✅ Diccionario cargado exitosamente`, {
          wordsCount: result.wordsLoaded,
          source: result.source,
          loadTime: `${result.loadTime.toFixed(2)}ms`
        });
      } else {
        console.warn(`CLIENT_VALIDATOR: ⚠️ Usando diccionario de respaldo`, {
          wordsCount: result.wordsLoaded,
          source: result.source,
          loadTime: `${result.loadTime.toFixed(2)}ms`,
          error: result.error
        });
      }
      
      return result;
    } catch (error) {
      console.error("CLIENT_VALIDATOR: Error crítico cargando diccionario", error);
      // Crear un resultado de error para mantener consistencia
      const errorResult: DictionaryLoadResult = {
        success: false,
        wordsLoaded: 0,
        source: 'fallback',
        loadTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      this.loadResult = errorResult;
      return errorResult;
    }
  }

  /**
   * Valida si una palabra está en el diccionario
   */
  private isWordInDictionary(word: string): boolean {
    return dictionaryService.hasWord(word);
  }

  /**
   * Calcula los puntos de una palabra según su longitud
   */
  private calculateWordPoints(word: string): number {
    const length = word.length;
    if (length < 3) return 0;
    if (length === 3 || length === 4) return 1;
    if (length === 5) return 2;
    if (length === 6) return 3;
    if (length === 7) return 5;
    return 11; // 8+ letras
  }

  /**
   * Valida que un camino en el tablero forme la palabra especificada
   */
  private isValidPath(board: string[][], path: [number, number][], word: string): boolean {
    if (!path || path.length === 0) return false;

    // Construir la palabra desde el path
    let pathWord = "";
    const used = new Set<string>();

    for (let i = 0; i < path.length; i++) {
      const [row, col] = path[i];

      // Verificar límites
      if (row < 0 || row >= 4 || col < 0 || col >= 4) return false;

      // Verificar si la celda ya fue usada
      const cellKey = `${row},${col}`;
      if (used.has(cellKey)) return false;
      used.add(cellKey);

      // Agregar la letra de esta celda
      const cellLetter = board[row][col].toLowerCase();
      pathWord += cellLetter;

      // Verificar adyacencia (excepto para la primera celda)
      if (i > 0) {
        const [prevRow, prevCol] = path[i - 1];
        const rowDiff = Math.abs(row - prevRow);
        const colDiff = Math.abs(col - prevCol);

        if (rowDiff > 1 || colDiff > 1 || (rowDiff === 0 && colDiff === 0)) {
          return false;
        }
      }
    }

    // Comparar la palabra construida con la palabra enviada
    return pathWord === word.toLowerCase();
  }

  /**
   * Valida una palabra completa (diccionario + path + longitud)
   */
  public validateWord(
    board: string[][],
    word: string,
    path: [number, number][],
    playerWords: string[] = []
  ): ClientWordValidationResult {
    const normalizedWord = word.toLowerCase();

    // Verificar longitud mínima
    if (normalizedWord.length < 3) {
      return {
        valid: false,
        reason: "Palabra muy corta (mínimo 3 letras)",
        isClientValidation: true,
      };
    }

    // Verificar si ya fue encontrada por el jugador
    if (playerWords.includes(normalizedWord)) {
      return {
        valid: false,
        reason: "Ya encontraste esta palabra",
        isClientValidation: true,
      };
    }

    // Verificar path válido en el tablero
    if (!this.isValidPath(board, path, normalizedWord)) {
      return {
        valid: false,
        reason: "Ruta inválida en el tablero",
        isClientValidation: true,
      };
    }

    // Verificar diccionario (solo si está cargado)
    if (dictionaryService.isReady() && !this.isWordInDictionary(normalizedWord)) {
      return {
        valid: false,
        reason: "Palabra no encontrada en el diccionario",
        isClientValidation: true,
      };
    }

    // Si el diccionario no está cargado, asumir válida (se validará en servidor)
    const points = this.calculateWordPoints(normalizedWord);
    
    return {
      valid: true,
      points,
      word: normalizedWord,
      reason: dictionaryService.isReady() ? undefined : "Validación pendiente del servidor",
      isClientValidation: true,
    };
  }

  /**
   * Verifica si el validador está listo para usar
   */
  public isReady(): boolean {
    return dictionaryService.isReady();
  }

  /**
   * Obtiene el tamaño del diccionario cargado
   */
  public getDictionarySize(): number {
    return dictionaryService.getDictionarySize();
  }

  /**
   * Obtiene estadísticas detalladas del diccionario
   */
  public getStats() {
    const serviceStats = dictionaryService.getStats();
    return {
      ...serviceStats,
      loadResult: this.loadResult,
    };
  }

  /**
   * Fuerza la recarga del diccionario
   */
  public async forceReload(): Promise<DictionaryLoadResult> {
    console.log("CLIENT_VALIDATOR: Forzando recarga del diccionario...");
    const result = await dictionaryService.forceReload();
    this.loadResult = result;
    return result;
  }

  /**
   * Espera a que el diccionario termine de cargar
   */
  public async waitForLoad(): Promise<DictionaryLoadResult> {
    if (this.initializationPromise) {
      return await this.initializationPromise;
    }
    
    // Si no hay promesa de inicialización, el diccionario ya está cargado o falló
    return this.loadResult || {
      success: false,
      wordsLoaded: 0,
      source: 'fallback',
      loadTime: 0,
      error: 'Dictionary not initialized'
    };
  }
}

// Instancia singleton del validador
export const clientWordValidator = new ClientWordValidator();
