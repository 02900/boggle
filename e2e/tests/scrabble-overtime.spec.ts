import { test, expect, resetServerGame } from "../fixtures/scrabble-fixture";
import { ScrabblePage } from "../helpers/scrabble-page";

// The e2e server runs with SCRABBLE_TURN_TIME_LIMIT=15 (see playwright.config.ts)
const E2E_TURN_LIMIT = 15;

test.describe("Scrabble - Overtime", () => {
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

  test("the clock goes negative and the other player can skip the turn", async () => {
    test.setTimeout(60_000);
    const p1IsActive = await p1.isMyTurn();
    const late = p1IsActive ? p1 : p2;
    const other = p1IsActive ? p2 : p1;
    const lateName = p1IsActive ? "Alice" : "Bob";

    // A reused dev server (reuseExistingServer) may run with the default 2-minute turns
    const clock = await late.getTimerText();
    test.skip(parseInt(clock.split(":")[0], 10) > 0, `Server not running with ${E2E_TURN_LIMIT}s turns`);

    const skipButton = other.page.getByTestId("skip-turn");
    await expect(skipButton).not.toBeVisible();

    // Past the limit the clock keeps counting, negative, and the turn does not change
    await expect(late.turnIndicator.locator('[role="timer"]')).toHaveText(/^-0:0[1-9]$/, {
      timeout: (E2E_TURN_LIMIT + 5) * 1000,
    });
    expect(await late.isMyTurn()).toBe(true);
    await expect(late.page.getByTestId("skip-turn")).not.toBeVisible();

    await expect(skipButton).toHaveText(`Saltar turno de ${lateName}`);
    await skipButton.click();

    await other.waitForMyTurn();
    await expect(late.messageBox.filter({ hasText: "saltó tu turno" })).toBeVisible();
  });
});
