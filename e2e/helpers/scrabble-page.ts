import { type Page, type Locator, expect } from "@playwright/test";

export class ScrabblePage {
  readonly page: Page;

  // Locators
  readonly nameInput: Locator;
  readonly joinButton: Locator;
  readonly startButton: Locator;
  readonly confirmButton: Locator;
  readonly recallButton: Locator;
  readonly passButton: Locator;
  readonly exchangeButton: Locator;
  readonly confirmExchangeButton: Locator;
  readonly cancelExchangeButton: Locator;
  readonly resetButton: Locator;
  readonly tileRack: Locator;
  readonly boardGrid: Locator;
  readonly turnIndicator: Locator;
  readonly messageBox: Locator;
  readonly exchangeMessage: Locator;
  readonly moveHistoryToggle: Locator;
  readonly gameEndHeading: Locator;
  readonly tileBagCount: Locator;
  readonly playerBadges: Locator;
  readonly connectionBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.locator('input[placeholder="Tu nombre"]');
    this.joinButton = page.getByRole("button", { name: "Unirse" });
    this.startButton = page.getByRole("button", { name: "Iniciar Juego" });
    this.confirmButton = page.getByRole("button", { name: "Confirmar", exact: true });
    this.recallButton = page.getByRole("button", { name: "Devolver" });
    this.passButton = page.getByRole("button", { name: "Pasar" });
    this.exchangeButton = page.getByRole("button", { name: "Cambiar" });
    this.confirmExchangeButton = page.getByRole("button", { name: /Confirmar cambio/ });
    this.cancelExchangeButton = page.getByRole("button", { name: "Cancelar" });
    this.resetButton = page.getByRole("button", { name: "Nueva Partida" });
    this.tileRack = page.locator('[data-testid="tile-rack"]');
    this.playerBadges = page.locator('[data-testid="player-badge"]');
    this.connectionBanner = page.locator('[data-testid="connection-banner"]');
    this.boardGrid = page.locator('[data-testid="board"]');
    this.turnIndicator = page.locator('[data-testid="turn-indicator"]');
    // Transient notifications (turn events, errors). Most recent is last.
    this.messageBox = page.locator('[data-testid="toast"]');
    this.exchangeMessage = page.locator("text=Selecciona las fichas que quieres cambiar");
    this.moveHistoryToggle = page.locator("text=/Historial \\(/");
    this.gameEndHeading = page.getByRole("heading", { name: "Juego Terminado" });
    this.tileBagCount = page.locator("text=/Fichas en bolsa:/");
  }

  async goto() {
    await this.page.goto("/scrabble");
    await this.joinButton.or(this.page.getByRole("button", { name: "Conectando..." })).waitFor({ state: "visible" });
    // Wait for socket connection (button changes from "Conectando..." to "Unirse")
    await this.joinButton.waitFor({ state: "visible", timeout: 15_000 });
  }

  async joinGame(name: string) {
    await this.nameInput.fill(name);
    await this.joinButton.click();
    // Wait for GameView to appear (heading "Scrabble" in game view)
    await this.page.locator("h1:has-text('Scrabble')").waitFor({ state: "visible" });
    // Wait for player name to appear in player list
    await this.page.locator(`text=${name}`).first().waitFor({ state: "visible" });
  }

  async waitForPlayerVisible(name: string, timeout = 10_000) {
    await this.page
      .locator('[data-testid="player-badge"]', { hasText: name })
      .first()
      .waitFor({ state: "visible", timeout });
  }

  async startGame() {
    // Wait for start button to appear (needs 2+ players via socket update)
    await this.startButton.waitFor({ state: "visible", timeout: 10_000 });
    await this.startButton.click();
    // Wait for turn indicator to appear
    await this.turnIndicator.waitFor({ state: "visible", timeout: 15_000 });
  }

  private myTurnIndicator(): Locator {
    return this.page.locator('[data-testid="turn-indicator"][data-my-turn="true"]');
  }

  async isMyTurn(): Promise<boolean> {
    return this.myTurnIndicator().isVisible();
  }

  async waitForMyTurn(timeout = 15_000) {
    await this.myTurnIndicator().waitFor({ state: "visible", timeout });
  }

  async waitForOtherTurn(timeout = 15_000) {
    await this.page
      .locator('[data-testid="turn-indicator"][data-my-turn="false"]')
      .waitFor({ state: "visible", timeout });
  }

  async getRackTileLetters(): Promise<string[]> {
    const tiles = this.tileRack.locator("button");
    const count = await tiles.count();
    const letters: string[] = [];
    for (let i = 0; i < count; i++) {
      const letter = await tiles.nth(i).getAttribute("data-letter");
      if (letter) letters.push(letter);
    }
    return letters;
  }

  async getRackTileCount(): Promise<number> {
    return this.tileRack.locator("button").count();
  }

  async selectRackTile(index: number) {
    const tiles = this.tileRack.locator("button");
    await tiles.nth(index).click();
  }

  async clickBoardCell(row: number, col: number) {
    const cells = this.boardGrid.locator("> button");
    const cellIndex = row * 15 + col;
    await cells.nth(cellIndex).click();
  }

  async submitTurn() {
    await this.confirmButton.click();
  }

  async passTurn() {
    await this.passButton.click();
  }

  async recallTiles() {
    await this.recallButton.click();
  }

  async enterExchangeMode() {
    await this.exchangeButton.click();
    await this.exchangeMessage.waitFor({ state: "visible" });
  }

  async selectTileForExchange(index: number) {
    // In exchange mode, clicking rack tiles toggles exchange selection
    const tiles = this.tileRack.locator("button");
    await tiles.nth(index).click();
  }

  async confirmExchange() {
    await this.confirmExchangeButton.click();
  }

  async cancelExchange() {
    await this.cancelExchangeButton.click();
  }

  async resetGame() {
    await this.resetButton.click();
  }

  async getPlayerNames(): Promise<string[]> {
    const badges = this.playerBadges;
    const count = await badges.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const name = await badges.nth(i).locator('[data-testid="player-name"]').textContent();
      if (name) names.push(name.trim());
    }
    return names;
  }

  async getPlayerScore(name: string): Promise<number> {
    const badge = this.playerBadges.filter({ hasText: name });
    const scoreText = await badge.locator('[data-testid="player-score"]').textContent();
    return parseInt(scoreText?.replace("pts", "").trim() ?? "0", 10);
  }

  /** Text of all currently visible toasts, oldest first. */
  async getMessages(): Promise<string[]> {
    return this.messageBox.allTextContents();
  }

  errorToast(): Locator {
    return this.page.locator('[data-testid="toast"][data-kind="error"]');
  }

  /** Rows of the end-of-game results, in ranking order. */
  resultRow(name: string): Locator {
    return this.page.locator(`[data-testid="result-row"][data-player="${name}"]`);
  }

  async getTileBagCount(): Promise<number> {
    const text = await this.tileBagCount.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async getTimerText(): Promise<string> {
    const timer = this.turnIndicator.locator('[role="timer"]');
    if (await timer.isVisible()) {
      return (await timer.textContent()) ?? "";
    }
    return "";
  }
}
