import { test, expect, resetServerGame } from "../fixtures/scrabble-fixture";
import { ScrabblePage } from "../helpers/scrabble-page";

// The e2e server runs with SCRABBLE_GRACE_PERIOD_MS=10000 (see playwright.config.ts)
const E2E_GRACE_SECONDS = 10;

test.describe("Scrabble - Abandon after the grace period", () => {
  test("a player who doesn't come back loses the game by abandon", async ({ player1Page, player2Page }) => {
    test.setTimeout(60_000);
    await resetServerGame();
    const p1 = new ScrabblePage(player1Page);
    const p2 = new ScrabblePage(player2Page);
    await p1.goto();
    await p1.joinGame("Alice");
    await p2.goto();
    await p2.joinGame("Bob");
    await p1.waitForPlayerVisible("Bob");
    await p1.startGame();
    await expect(p2.turnIndicator).toBeVisible();

    await player2Page.goto("about:blank"); // Bob's socket drops and never returns

    // A reused dev server (reuseExistingServer) may run with the default 30s grace
    await expect(p1.connectionBanner).toContainText(/Bob se desconectó · \d+s para volver/);
    const seconds = parseInt((await p1.connectionBanner.textContent())!.match(/(\d+)s/)![1], 10);
    // (the countdown rounds up, so 10s can show as 11s)
    test.skip(seconds > E2E_GRACE_SECONDS + 2, `Server not running with a ${E2E_GRACE_SECONDS}s grace period`);

    await expect(p1.gameEndHeading).toBeVisible({ timeout: (E2E_GRACE_SECONDS + 5) * 1000 });
    await expect(player1Page.getByRole("dialog")).toContainText("Partida terminada por abandono");
    await expect(p1.resultRow("Alice")).toBeVisible();
  });
});
