import { test, expect, resetServerGame } from "../fixtures/scrabble-fixture";
import { ScrabblePage } from "../helpers/scrabble-page";

// Must match SCRABBLE_MAX_CONSECUTIVE_PASSES in config/scrabbleConstants.ts
const MAX_CONSECUTIVE_PASSES = 6;

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

  /** Alternates passes between both players until the pass limit is reached. */
  async function passUntilGameEnds(first: ScrabblePage, second: ScrabblePage) {
    for (let i = 0; i < MAX_CONSECUTIVE_PASSES; i++) {
      const active = i % 2 === 0 ? first : second;
      const waiting = i % 2 === 0 ? second : first;
      await active.passTurn();
      if (i < MAX_CONSECUTIVE_PASSES - 1) await waiting.waitForMyTurn();
    }
  }

  test("game ends after the consecutive-pass limit, not before", async () => {
    const p1IsFirst = await p1.isMyTurn();
    const first = p1IsFirst ? p1 : p2;
    const second = p1IsFirst ? p2 : p1;

    // One full round of passes must NOT end the game
    await first.passTurn();
    await second.waitForMyTurn();
    await second.passTurn();
    await first.waitForMyTurn();
    await expect(first.gameEndHeading).not.toBeVisible();

    // Complete the remaining passes
    for (let i = 2; i < MAX_CONSECUTIVE_PASSES; i++) {
      const active = i % 2 === 0 ? first : second;
      const waiting = i % 2 === 0 ? second : first;
      await active.passTurn();
      if (i < MAX_CONSECUTIVE_PASSES - 1) await waiting.waitForMyTurn();
    }

    // Game should end — "Juego Terminado" should appear for both
    await expect(first.gameEndHeading).toBeVisible({ timeout: 10_000 });
    await expect(second.gameEndHeading).toBeVisible({ timeout: 10_000 });

    // Both should see player results
    await expect(first.resultRow("Alice")).toBeVisible();
    await expect(first.resultRow("Bob")).toBeVisible();
    await expect(second.resultRow("Alice")).toHaveAttribute("data-score", /\d+/);

    // Each player's total time is listed
    await expect(first.resultRow("Alice").getByTestId("player-time")).toContainText(/\d+:\d{2} en total/);
  });

  test("'Nueva Partida' resets the game", async () => {
    const p1IsFirst = await p1.isMyTurn();
    const first = p1IsFirst ? p1 : p2;
    const second = p1IsFirst ? p2 : p1;

    await passUntilGameEnds(first, second);

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
