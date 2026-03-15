import fs from "fs";
import path from "path";
import { RANDOM_NAMES } from "../utils/names.js";
import { updateScoreboard } from "../utils/scoreboard.js";
import { debugLog } from "../utils/debug.js";
import { streakTracker } from "../utils/streakTracker.js";

/**
 * Base class for word games (Boggle, Scrabble, etc.)
 * Contains shared logic: players, dictionary, timers, scoring, streaks.
 */
export class WordGame {
  constructor({ timeLimit = 180 } = {}) {
    this.players = new Map();
    this.gameState = "waiting";
    this.timeLimit = timeLimit;
    this.timeLeft = timeLimit;
    this.timer = null;
    this.updateTimer = null;
    this.io = null;
    this.words = new Set();
    this.availableNames = [...RANDOM_NAMES];
    this.eliminateCommonWords = true;
    this.gameHistory = new Map();
    this.clientSideValidation = true;

    this.initializeDictionary();
  }

  setIO(io) {
    this.io = io;
  }

  // --- Timer management ---

  clearTimers() {
    this.clearInternalTimer();
    this.clearUpdateTimer();
  }

  clearInternalTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  clearUpdateTimer() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  // --- Dictionary ---

  initializeDictionary() {
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
      console.log(`Dictionary loaded: ${this.words.size} valid words`);
    } catch (error) {
      console.error("Error loading dictionary:", error);
      const basicWords = [
        "gato", "perro", "casa", "mesa", "silla", "agua", "fuego",
        "tierra", "aire", "amor", "tiempo", "lugar", "cosa", "persona",
        "animal", "planta", "comida",
      ];
      this.words = new Set(basicWords);
    }
  }

  hasWord(word) {
    return this.words.has(word.toLowerCase());
  }

  // --- Player management ---

  getRandomName() {
    if (this.availableNames.length === 0) {
      this.availableNames = [...RANDOM_NAMES];
    }
    const randomIndex = Math.floor(Math.random() * this.availableNames.length);
    const selectedName = this.availableNames[randomIndex];
    this.availableNames.splice(randomIndex, 1);
    return selectedName;
  }

  releaseName(playerName) {
    if (
      RANDOM_NAMES.includes(playerName) &&
      !this.availableNames.includes(playerName)
    ) {
      this.availableNames.push(playerName);
    }
  }

  addPlayer(playerId, playerName) {
    const playerData = {
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

    debugLog("PLAYER_ADDED", {
      playerId,
      playerName,
      connectedPlayers: this.players.size,
      totalParticipants: this.gameHistory.size,
    });
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      const historyPlayer = this.gameHistory.get(playerId);
      if (historyPlayer) {
        historyPlayer.score = player.score;
        historyPlayer.wordsFound = [...player.wordsFound];
        historyPlayer.eliminatedWords = [...player.eliminatedWords];
        historyPlayer.isConnected = false;
        historyPlayer.disconnectedAt = Date.now();
      }

      this.releaseName(player.name);
      this.players.delete(playerId);

      debugLog("PLAYER_REMOVED", {
        playerId,
        playerName: player.name,
        connectedPlayers: this.players.size,
      });
    }
  }

  // --- Feature flags ---

  setEliminateCommonWords(enabled) {
    this.eliminateCommonWords = enabled;
  }

  setClientSideValidation(enabled) {
    this.clientSideValidation = enabled;
  }

  getClientSideValidation() {
    return this.clientSideValidation;
  }

  // --- Scoring ---

  calculateWordPoints(word) {
    const length = word.length;
    if (length < 3) return 0;
    if (length <= 4) return 1;
    if (length === 5) return 2;
    if (length === 6) return 3;
    if (length === 7) return 5;
    return 11;
  }

  // --- Common word elimination ---

  eliminateCommonWordsFromPlayers() {
    const allParticipants = Array.from(this.gameHistory.values());
    if (allParticipants.length < 2) return;

    const wordToPlayers = new Map();
    allParticipants.forEach((player) => {
      player.wordsFound.forEach((word) => {
        if (!wordToPlayers.has(word)) {
          wordToPlayers.set(word, []);
        }
        wordToPlayers.get(word).push(player.id);
      });
    });

    const commonWords = new Set();
    wordToPlayers.forEach((playerIds, word) => {
      if (playerIds.length > 1) {
        commonWords.add(word);
      }
    });

    if (commonWords.size === 0) return;

    allParticipants.forEach((historyPlayer) => {
      if (!historyPlayer.eliminatedWords) {
        historyPlayer.eliminatedWords = [];
      }

      const originalWords = [...historyPlayer.wordsFound];
      const eliminatedWords = [];
      const validWords = [];

      originalWords.forEach((word) => {
        if (commonWords.has(word)) {
          eliminatedWords.push(word);
        } else {
          validWords.push(word);
        }
      });

      historyPlayer.wordsFound = validWords;
      historyPlayer.eliminatedWords = eliminatedWords;

      const oldScore = historyPlayer.score;
      historyPlayer.score = validWords.reduce((total, word) => {
        return total + this.calculateWordPoints(word);
      }, 0);

      const activePlayer = this.players.get(historyPlayer.id);
      if (activePlayer) {
        activePlayer.wordsFound = validWords;
        activePlayer.eliminatedWords = eliminatedWords;
        activePlayer.score = historyPlayer.score;
      }

      debugLog("ELIMINATE_COMMON_WORDS: Participant processed", {
        playerName: historyPlayer.name,
        oldScore,
        newScore: historyPlayer.score,
        eliminated: eliminatedWords.length,
      });
    });
  }

  // --- Client word revalidation ---

  revalidateClientWords() {
    let totalWordsRemoved = 0;

    for (const [playerId, player] of this.gameHistory) {
      const originalCount = player.wordsFound.length;
      const validWords = [];

      for (const word of player.wordsFound) {
        if (word.length >= 3 && this.words.has(word.toLowerCase())) {
          validWords.push(word);
        }
      }

      player.wordsFound = validWords;
      player.score = validWords.reduce(
        (total, word) => total + this.calculateWordPoints(word),
        0
      );

      const removed = originalCount - validWords.length;
      totalWordsRemoved += removed;

      const connectedPlayer = this.players.get(playerId);
      if (connectedPlayer) {
        connectedPlayer.wordsFound = [...validWords];
        connectedPlayer.score = player.score;
      }
    }

    if (totalWordsRemoved > 0 && this.io) {
      this.io.emit("words-revalidated", {
        totalWordsRemoved,
        affectedPlayers: this.gameHistory.size,
        summary: `${totalWordsRemoved} words removed after server revalidation`,
      });
    }
  }

  // --- End game shared logic ---

  finalizeGame() {
    this.gameState = "finished";
    this.clearTimers();

    if (this.clientSideValidation) {
      this.revalidateClientWords();
    }

    if (this.eliminateCommonWords) {
      this.eliminateCommonWordsFromPlayers();
    }

    // Update scoreboard
    const allParticipantScores = Array.from(this.gameHistory.values()).map(
      (player) => ({
        name: player.name,
        score: player.score,
        isConnected: player.isConnected,
      })
    );
    const totalParticipants = this.gameHistory.size;
    updateScoreboard(allParticipantScores, totalParticipants);

    // Update streaks
    if (totalParticipants > 1) {
      const maxScore = Math.max(...allParticipantScores.map((p) => p.score));
      const winners = allParticipantScores.filter(
        (p) => p.score === maxScore && p.score > 0
      );
      winners.forEach((winner) => {
        streakTracker.recordWin(winner.name);
      });
    }
  }

  // --- Reset shared logic ---

  resetPlayers() {
    for (const player of this.players.values()) {
      player.score = 0;
      player.wordsFound = [];
      player.eliminatedWords = [];
      player.isConnected = true;
      player.joinedAt = Date.now();
    }

    this.gameHistory.clear();
    for (const [playerId, player] of this.players) {
      this.gameHistory.set(playerId, { ...player });
    }
  }

  // --- Abstract methods (must be implemented by subclasses) ---

  getGameState() {
    throw new Error("getGameState() must be implemented by subclass");
  }
}
