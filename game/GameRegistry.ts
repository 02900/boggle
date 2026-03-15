import type { WordGame } from "./shared/WordGame";

export class GameRegistry {
  private games: Map<string, WordGame> = new Map();

  registerGame(gameType: string, game: WordGame): void {
    this.games.set(gameType, game);
  }

  getGame(gameType: string): WordGame | undefined {
    return this.games.get(gameType);
  }

  getGameTypes(): string[] {
    return Array.from(this.games.keys());
  }

  hasGame(gameType: string): boolean {
    return this.games.has(gameType);
  }
}
