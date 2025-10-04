/**
 * Servicio de diccionario robusto para validación de palabras del cliente
 * Maneja carga asíncrona, cache, fallbacks y optimizaciones de rendimiento
 */

export interface DictionaryLoadResult {
  success: boolean;
  wordsLoaded: number;
  source: 'remote' | 'fallback' | 'cache';
  loadTime: number;
  error?: string;
}

export class DictionaryService {
  private dictionary: Set<string> = new Set();
  private isLoaded: boolean = false;
  private isLoading: boolean = false;
  private loadPromise: Promise<DictionaryLoadResult> | null = null;
  private fallbackDictionary: Set<string> = new Set();
  private isClient: boolean = false;

  // Cache en localStorage
  private readonly CACHE_KEY = 'boggle-dictionary-cache';
  private readonly CACHE_VERSION_KEY = 'boggle-dictionary-version';
  private readonly CACHE_VERSION = '1.0.0';
  private readonly CACHE_EXPIRY_HOURS = 24;

  // URLs y configuración
  private readonly DICTIONARY_URL = '/diccionario-espanol.txt';
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor() {
    // Verificar si estamos en el cliente
    this.isClient = typeof window !== 'undefined';
    this.initializeFallbackDictionary();
  }

  /**
   * Inicializa el diccionario básico como fallback
   */
  private initializeFallbackDictionary(): void {
    const basicWords = [
      // Palabras comunes de 3+ letras para fallback
      "casa", "mesa", "silla", "agua", "fuego", "tierra", "aire", "luz",
      "sol", "luna", "mar", "rio", "lago", "monte", "valle", "campo",
      "ciudad", "pueblo", "calle", "plaza", "parque", "jardin", "flor",
      "arbol", "hoja", "rama", "raiz", "fruto", "semilla", "planta",
      "animal", "perro", "gato", "ave", "pez", "leon", "tigre", "oso",
      "lobo", "zorro", "conejo", "raton", "caballo", "vaca", "oveja",
      "cerdo", "pollo", "pato", "ganso", "paloma", "aguila", "halcon",
      "buho", "cuervo", "loro", "canario", "perico", "serpiente", "lagarto",
      "rana", "sapo", "tiburon", "ballena", "delfin", "pulpo", "calamar",
      "cangrejo", "langosta", "camaron", "estrella", "coral", "alga",
      "arena", "roca", "piedra", "cristal", "metal", "oro", "plata",
      "cobre", "hierro", "acero", "madera", "papel", "tela", "cuero",
      "plastico", "vidrio", "ceramica", "barro", "arcilla", "carbon",
      "petroleo", "gas", "electricidad", "energia", "fuerza", "poder",
      "velocidad", "tiempo", "espacio", "distancia", "altura", "peso",
      "masa", "volumen", "temperatura", "calor", "frio", "hielo", "nieve",
      "lluvia", "viento", "tormenta", "rayo", "trueno", "nube", "cielo",
      "planeta", "cometa", "galaxia", "universo", "mundo", "continente",
      "pais", "region", "provincia", "estado", "municipio", "zona", "area",
      "lugar", "sitio", "punto", "linea", "curva", "circulo", "cuadrado",
      "triangulo", "rectangulo", "rombo", "ovalo", "esfera", "cubo",
      "piramide", "cilindro", "cono", "prisma", "figura", "forma", "color",
      "rojo", "azul", "verde", "amarillo", "naranja", "violeta", "rosa",
      "blanco", "negro", "gris", "marron", "beige", "dorado", "plateado",
      "libro", "escuela", "trabajo", "familia", "amigo", "amor", "vida",
      "muerte", "salud", "enfermedad", "medicina", "doctor", "hospital",
      "comer", "beber", "dormir", "caminar", "correr", "saltar", "volar",
      "nadar", "leer", "escribir", "hablar", "escuchar", "ver", "mirar"
    ];

    this.fallbackDictionary = new Set(basicWords.map(word => word.toLowerCase()));
    console.log(`DICTIONARY_SERVICE: Fallback dictionary loaded with ${this.fallbackDictionary.size} words`);
  }

  /**
   * Carga el diccionario con estrategia robusta
   */
  public async loadDictionary(): Promise<DictionaryLoadResult> {
    // Si no estamos en el cliente, usar solo fallback
    if (!this.isClient) {
      console.log('DICTIONARY_SERVICE: Server-side execution, using fallback only');
      this.dictionary = new Set(this.fallbackDictionary);
      this.isLoaded = true;
      return {
        success: false,
        wordsLoaded: this.dictionary.size,
        source: 'fallback',
        loadTime: 0,
        error: 'Server-side execution'
      };
    }

    // Si ya está cargando, retornar la promesa existente
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Si ya está cargado, retornar resultado exitoso
    if (this.isLoaded) {
      return {
        success: true,
        wordsLoaded: this.dictionary.size,
        source: 'cache',
        loadTime: 0
      };
    }

    this.isLoading = true;
    const startTime = performance.now();

    this.loadPromise = this.performDictionaryLoad(startTime);
    
    try {
      const result = await this.loadPromise;
      this.isLoaded = result.success;
      return result;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Realiza la carga efectiva del diccionario
   */
  private async performDictionaryLoad(startTime: number): Promise<DictionaryLoadResult> {
    try {
      // Intentar cargar desde cache primero
      const cachedResult = await this.loadFromCache();
      if (cachedResult) {
        this.dictionary = cachedResult;
        const loadTime = performance.now() - startTime;
        console.log(`DICTIONARY_SERVICE: Loaded ${this.dictionary.size} words from cache in ${loadTime.toFixed(2)}ms`);
        return {
          success: true,
          wordsLoaded: this.dictionary.size,
          source: 'cache',
          loadTime
        };
      }

      // Cargar desde servidor con reintentos
      const remoteResult = await this.loadFromRemoteWithRetry();
      if (remoteResult.success && remoteResult.dictionary) {
        this.dictionary = remoteResult.dictionary;
        // Guardar en cache para futuras cargas
        await this.saveToCache(this.dictionary);
        const loadTime = performance.now() - startTime;
        console.log(`DICTIONARY_SERVICE: Loaded ${this.dictionary.size} words from remote in ${loadTime.toFixed(2)}ms`);
        return {
          success: true,
          wordsLoaded: this.dictionary.size,
          source: 'remote',
          loadTime
        };
      }

      // Fallback al diccionario básico
      console.warn('DICTIONARY_SERVICE: Failed to load remote dictionary, using fallback');
      this.dictionary = new Set(this.fallbackDictionary);
      const loadTime = performance.now() - startTime;
      return {
        success: false,
        wordsLoaded: this.dictionary.size,
        source: 'fallback',
        loadTime,
        error: remoteResult.error
      };

    } catch (error) {
      console.error('DICTIONARY_SERVICE: Unexpected error during load:', error);
      this.dictionary = new Set(this.fallbackDictionary);
      const loadTime = performance.now() - startTime;
      return {
        success: false,
        wordsLoaded: this.dictionary.size,
        source: 'fallback',
        loadTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Carga diccionario desde cache localStorage
   */
  private async loadFromCache(): Promise<Set<string> | null> {
    // Solo funciona en el cliente
    if (!this.isClient) {
      return null;
    }

    try {
      const cachedVersion = localStorage.getItem(this.CACHE_VERSION_KEY);
      const cachedData = localStorage.getItem(this.CACHE_KEY);
      const cacheTimestamp = localStorage.getItem(`${this.CACHE_KEY}-timestamp`);

      if (!cachedVersion || !cachedData || !cacheTimestamp) {
        return null;
      }

      // Verificar versión
      if (cachedVersion !== this.CACHE_VERSION) {
        console.log('DICTIONARY_SERVICE: Cache version mismatch, invalidating');
        this.clearCache();
        return null;
      }

      // Verificar expiración
      const cacheAge = Date.now() - parseInt(cacheTimestamp);
      const maxAge = this.CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
      if (cacheAge > maxAge) {
        console.log('DICTIONARY_SERVICE: Cache expired, invalidating');
        this.clearCache();
        return null;
      }

      // Deserializar datos
      const words = JSON.parse(cachedData) as string[];
      return new Set(words);

    } catch (error) {
      console.warn('DICTIONARY_SERVICE: Error loading from cache:', error);
      this.clearCache();
      return null;
    }
  }

  /**
   * Carga diccionario desde servidor con reintentos
   */
  private async loadFromRemoteWithRetry(): Promise<{ success: boolean; dictionary?: Set<string>; error?: string }> {
    let lastError: string = '';

    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`DICTIONARY_SERVICE: Loading from remote (attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS})`);
        
        const response = await fetch(this.DICTIONARY_URL, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const text = await response.text();
        const words = text
          .split('\n')
          .map(word => word.trim().toLowerCase())
          .filter(word => word.length >= 3); // Filtrar palabras muy cortas

        const dictionary = new Set(words);
        
        if (dictionary.size === 0) {
          throw new Error('Dictionary file appears to be empty');
        }

        return { success: true, dictionary };

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`DICTIONARY_SERVICE: Attempt ${attempt} failed:`, lastError);
        
        // Esperar antes del siguiente intento (excepto en el último)
        if (attempt < this.MAX_RETRY_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS * attempt));
        }
      }
    }

    return { success: false, error: lastError };
  }

  /**
   * Guarda diccionario en cache localStorage
   */
  private async saveToCache(dictionary: Set<string>): Promise<void> {
    // Solo funciona en el cliente
    if (!this.isClient) {
      return;
    }

    try {
      const words = Array.from(dictionary);
      const data = JSON.stringify(words);
      
      localStorage.setItem(this.CACHE_KEY, data);
      localStorage.setItem(this.CACHE_VERSION_KEY, this.CACHE_VERSION);
      localStorage.setItem(`${this.CACHE_KEY}-timestamp`, Date.now().toString());
      
      console.log(`DICTIONARY_SERVICE: Saved ${words.length} words to cache`);
    } catch (error) {
      console.warn('DICTIONARY_SERVICE: Failed to save to cache:', error);
    }
  }

  /**
   * Limpia el cache
   */
  private clearCache(): void {
    // Solo funciona en el cliente
    if (!this.isClient) {
      return;
    }

    try {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.CACHE_VERSION_KEY);
      localStorage.removeItem(`${this.CACHE_KEY}-timestamp`);
    } catch (error) {
      console.warn('DICTIONARY_SERVICE: Failed to clear cache:', error);
    }
  }

  /**
   * Verifica si una palabra está en el diccionario
   */
  public hasWord(word: string): boolean {
    return this.dictionary.has(word.toLowerCase());
  }

  /**
   * Obtiene el tamaño del diccionario
   */
  public getDictionarySize(): number {
    return this.dictionary.size;
  }

  /**
   * Verifica si el diccionario está listo
   */
  public isReady(): boolean {
    return this.isLoaded;
  }

  /**
   * Verifica si está cargando
   */
  public isLoadingDictionary(): boolean {
    return this.isLoading;
  }

  /**
   * Obtiene estadísticas del diccionario
   */
  public getStats(): {
    isLoaded: boolean;
    isLoading: boolean;
    size: number;
    hasFallback: boolean;
    fallbackSize: number;
  } {
    return {
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      size: this.dictionary.size,
      hasFallback: this.fallbackDictionary.size > 0,
      fallbackSize: this.fallbackDictionary.size,
    };
  }

  /**
   * Fuerza recarga del diccionario (limpia cache)
   */
  public async forceReload(): Promise<DictionaryLoadResult> {
    this.clearCache();
    this.isLoaded = false;
    this.dictionary.clear();
    return this.loadDictionary();
  }
}

// Instancia singleton del servicio
export const dictionaryService = new DictionaryService();
