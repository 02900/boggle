import { test, expect, resetServerGame } from "../fixtures/scrabble-fixture";
import { ScrabblePage } from "../helpers/scrabble-page";

test.describe("Scrabble - Reconnection", () => {
  test.beforeEach(async () => {
    await resetServerGame();
  });

  // TODO: reconnection is broken — server never sends gameId to client during game-started,
  // so localStorage session is never saved and rejoin-game cannot work.
  test.fixme("player can rejoin after page refresh", async ({
    player1Page,
    player2Page,
  }) => {
    const p1 = new ScrabblePage(player1Page);
    const p2 = new ScrabblePage(player2Page);

    await p1.goto();
    await p1.joinGame("Alice");
    await p2.goto();
    await p2.joinGame("Bob");
    await p1.waitForPlayerVisible("Bob");
    await p1.startGame();

    await expect(p2.turnIndicator).toBeVisible();

    // Verify player1 has tiles before refresh
    const tileCountBefore = await p1.getRackTileCount();
    expect(tileCountBefore).toBe(7);

    // Player 1 refreshes the page
    await player1Page.reload();

    // After reload, the session should auto-rejoin (via localStorage)
    // Wait for the game view to reappear
    const p1After = new ScrabblePage(player1Page);
    await expect(p1After.turnIndicator).toBeVisible({ timeout: 15_000 });

    // Should still have tiles in rack
    const tileCountAfter = await p1After.getRackTileCount();
    expect(tileCountAfter).toBe(7);

    // Player names should still be visible
    const names = await p1After.getPlayerNames();
    expect(names).toContain("Alice");
    expect(names).toContain("Bob");
  });

  test.fixme("reconnected player retains their score", async ({
    player1Page,
    player2Page,
  }) => {
    const p1 = new ScrabblePage(player1Page);
    const p2 = new ScrabblePage(player2Page);

    await p1.goto();
    await p1.joinGame("Alice");
    await p2.goto();
    await p2.joinGame("Bob");
    await p1.waitForPlayerVisible("Bob");
    await p1.startGame();

    await expect(p2.turnIndicator).toBeVisible();

    // Get initial score (should be 0)
    const scoreBefore = await p1.getPlayerScore("Alice");

    // Refresh
    await player1Page.reload();

    const p1After = new ScrabblePage(player1Page);
    await expect(p1After.turnIndicator).toBeVisible({ timeout: 15_000 });

    // Score should be preserved (still 0 since no turns played)
    const scoreAfter = await p1After.getPlayerScore("Alice");
    expect(scoreAfter).toBe(scoreBefore);
  });
});
