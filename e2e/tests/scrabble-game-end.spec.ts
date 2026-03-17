import { test, expect, resetServerGame } from "../fixtures/scrabble-fixture";
import { ScrabblePage } from "../helpers/scrabble-page";

test.describe("Scrabble - Game end", () => {
  let p1: ScrabblePage;
  let p2: ScrabblePage;

  test.beforeEach(async ({ player1Page, player2Page }) => {
    await resetServerGame();

    p1 = new ScrabblePage(player1Page);
    p2 = new ScrabblePage(player2Page);

    await p1.goto();
    await p1.joinGame("Alice");
    await p2.goto();
    await p2.joinGame("Bob");
    await p1.waitForPlayerVisible("Bob");
    await p1.startGame();

    await expect(p2.turnIndicator).toBeVisible();
  });

  test("game ends when all players pass consecutively", async () => {
    // Determine who goes first
    const p1IsFirst = await p1.isMyTurn();
    const first = p1IsFirst ? p1 : p2;
    const second = p1IsFirst ? p2 : p1;

    // First player passes
    await first.passTurn();
    await second.waitForMyTurn();

    // Second player passes
    await second.passTurn();

    // Game should end — "Juego Terminado" should appear for both
    await expect(first.gameEndHeading).toBeVisible({ timeout: 10_000 });
    await expect(second.gameEndHeading).toBeVisible({ timeout: 10_000 });

    // Both should see player scores
    await expect(first.page.locator("text=/Alice:.*puntos/")).toBeVisible();
    await expect(first.page.locator("text=/Bob:.*puntos/")).toBeVisible();
  });

  test("'Nueva Partida' resets the game", async () => {
    const p1IsFirst = await p1.isMyTurn();
    const first = p1IsFirst ? p1 : p2;
    const second = p1IsFirst ? p2 : p1;

    // End the game by consecutive passes
    await first.passTurn();
    await second.waitForMyTurn();
    await second.passTurn();

    // Wait for game to end
    await expect(first.gameEndHeading).toBeVisible({ timeout: 10_000 });
    await expect(first.resetButton).toBeVisible();

    // Click reset
    await first.resetGame();

    // Should return to waiting state — start button should be available again
    // (both players are still connected, so 2 players = start button visible)
    await expect(first.startButton).toBeVisible({ timeout: 10_000 });
    await expect(first.gameEndHeading).not.toBeVisible();
  });
});
