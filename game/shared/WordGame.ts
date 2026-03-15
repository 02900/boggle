import fs from "fs";
import path from "path";
import { RANDOM_NAMES } from "../../utils/names";
import { debugLog } from "../../utils/debug";
import type { GameStatus } from "../../src/interfaces/game";
import type { TypedServer, PlayerData } from "../../src/interfaces/server";

export interface WordGameConfig {
  timeLimit: number;
}

export abstract class WordGame {
  players: Map<string, PlayerData>;
  gameState: GameStatus;
  timeLeft: number;
  timer: ReturnType<typeof setInterval> | null;
  updateTimer: ReturnType<typeof setInterval> | null;
  io: TypedServer | null;
  words: Set<string>;
  availableNames: string[];
  gameHistory: Map<string, PlayerData>;
  clientSideValidation: boolean;
  protected config: WordGameConfig;

  constructor(config: WordGameConfig) {
    this.config = config;
    this.players = new Map();
    this.gameState = "waiting";
    this.timeLeft = config.timeLimit;
    this.timer = null;
    this.updateTimer = null;
    this.io = null;
    this.words = new Set();
    this.availableNames = [...RANDOM_NAMES];
    this.gameHistory = new Map();
    this.clientSideValidation = true;

    this.initializeDictionary();
  }

  abstract startGame(): unknown;
  abstract endGame(): void;
  abstract getGameState(): unknown;

  setIO(io: TypedServer): void {
    this.io = io;
  }

  clearTimers(): void {
    this.clearInternalTimer();
    this.clearUpdateTimer();
  }

  clearInternalTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  clearUpdateTimer(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  initializeDictionary(): void {
    try {
      const dictionaryPath = path.join(process.cwd(), "file-2017.txt");
      const fileContent = fs.readFileSync(dictionaryPath, "utf8");

      const allWords = fileContent
        .split("\n")
        .map((word) => word.trim().toLowerCase())
        .filter((word) => {
          return (
            word.length >= 3 &&
            word.length <= 16 &&
            /^[a-záéíóúñü]+$/.test(word)
          );
        });

      this.words = new Set(allWords);
      console.log(`Diccionario cargado: ${this.words.size} palabras válidas`);
    } catch (error) {
      console.error("Error al cargar el diccionario:", error);
      const basicWords = [
        "gato", "perro", "casa", "mesa", "silla", "agua", "fuego",
        "tierra", "aire", "amor", "tiempo", "lugar", "cosa",
        "persona", "animal", "planta", "comida",
      ];
      this.words = new Set(basicWords);
    }
  }

  getRandomName(): string {
    if (this.availableNames.length === 0) {
      this.availableNames = [...RANDOM_NAMES];
    }

    const randomIndex = Math.floor(Math.random() * this.availableNames.length);
    const selectedName = this.availableNames[randomIndex];

    this.availableNames.splice(randomIndex, 1);

    return selectedName;
  }

  releaseName(playerName: string): void {
    if (
      RANDOM_NAMES.includes(playerName) &&
      !this.availableNames.includes(playerName)
    ) {
      this.availableNames.push(playerName);
    }
  }

  addPlayer(playerId: string, playerName: string): void {
    const playerData: PlayerData = {
      id: playerId,
      name: playerName,
      score: 0,
      wordsFound: [],
      eliminatedWords: [],
      isConnected: true,
      joinedAt: Date.now(),
    };

    this.players.set(playerId, playerData);
    this.gameHistory.set(playerId, { ...playerData });

    debugLog("PLAYER_ADDED: Jugador agregado al juego y historial", {
      playerId,
      playerName,
      connectedPlayers: this.players.size,
      totalParticipants: this.gameHistory.size,
    });
  }

  removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      const historyPlayer = this.gameHistory.get(playerId);
      if (historyPlayer) {
        historyPlayer.score = player.score;
        historyPlayer.wordsFound = [...player.wordsFound];
        historyPlayer.eliminatedWords = [...(player.eliminatedWords || [])];
        historyPlayer.isConnected = false;
        historyPlayer.disconnectedAt = Date.now();
      }

      debugLog(
        "PLAYER_REMOVED: Jugador desconectado pero mantenido en historial",
        {
          playerId,
          playerName: player.name,
          finalScore: player.score,
          wordsFound: player.wordsFound.length,
          connectedPlayers: this.players.size - 1,
          totalParticipants: this.gameHistory.size,
        }
      );

      this.releaseName(player.name);
      this.players.delete(playerId);
    }
  }

  resetGame(): void {
    this.gameState = "waiting";
    this.timeLeft = this.config.timeLimit;
    this.clearTimers();

    for (const player of this.players.values()) {
      player.score = 0;
      player.wordsFound = [];
      player.eliminatedWords = player.eliminatedWords || [];
      player.eliminatedWords.length = 0;
      player.isConnected = true;
      player.joinedAt = Date.now();
    }

    this.gameHistory.clear();
    for (const [playerId, player] of this.players) {
      this.gameHistory.set(playerId, { ...player });
    }

    debugLog("GAME_RESET: Juego reiniciado y historial limpiado", {
      connectedPlayers: this.players.size,
      totalParticipants: this.gameHistory.size,
    });
  }

  setClientSideValidation(enabled: boolean): void {
    this.clientSideValidation = enabled;
    debugLog("CLIENT_SIDE_VALIDATION: Feature flag actualizado", {
      enabled: this.clientSideValidation,
    });
  }

  getClientSideValidation(): boolean {
    return this.clientSideValidation;
  }
}
