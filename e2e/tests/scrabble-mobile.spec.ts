import { test, expect, resetServerGame } from "../fixtures/scrabble-fixture";
import { ScrabblePage } from "../helpers/scrabble-page";
import type { Browser } from "@playwright/test";

const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

async function phonePage(browser: Browser) {
  const context = await browser.newContext(PHONE);
  return { context, page: new ScrabblePage(await context.newPage()) };
}

test.describe("Scrabble - Phone viewport", () => {
  test("the table fits the screen and can be played by tapping", async ({ browser }) => {
    await resetServerGame();
    const a = await phonePage(browser);
    const b = await phonePage(browser);
    try {
      await a.page.goto();
      await a.page.joinGame("Alice");
      await b.page.goto();
      await b.page.joinGame("Bob");
      await a.page.waitForPlayerVisible("Bob");
      await a.page.startGame();
      await expect(b.page.turnIndicator).toBeVisible();

      const active = (await a.page.isMyTurn()) ? a.page : b.page;
      const { page } = active;

      // No horizontal scroll; the whole board is on screen
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      const board = (await active.boardGrid.boundingBox())!;
      expect(board.x).toBeGreaterThanOrEqual(0);
      expect(board.x + board.width).toBeLessThanOrEqual(390);

      // Rack and actions are pinned in view without scrolling
      await expect(active.tileRack).toBeInViewport();
      await expect(active.confirmButton).toBeInViewport();
      await expect(page.getByTestId("shuffle-rack")).toBeInViewport();

      // Tap a tile, tap the center: it lands on the board
      await active.setRack(["S", "E"]);
      await active.tileRack.getByRole("button", { name: /^Ficha E,/ }).tap();
      await active.boardGrid.locator("> button").nth(7 * 15 + 7).tap();
      await active.tileRack.getByRole("button", { name: /^Ficha S,/ }).tap();
      await active.boardGrid.locator("> button").nth(7 * 15 + 8).tap();

      await expect(page.getByTestId("move-hint")).toHaveText("ES 4");
      await expect(active.confirmButton).toHaveText(/Confirmar \+4/);
    } finally {
      await a.context.close();
      await b.context.close();
    }
  });
});
