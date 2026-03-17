import { test, expect, resetServerGame } from "../fixtures/scrabble-fixture";
import { ScrabblePage } from "../helpers/scrabble-page";

test.describe("Scrabble - Starting a game", () => {
  test.beforeEach(async () => {
    await resetServerGame();
  });

  test("start button does not appear with only 1 player", async ({ player1Page }) => {
    const p1 = new ScrabblePage(player1Page);
    await p1.goto();
    await p1.joinGame("Alice");

    await expect(p1.startButton).not.toBeVisible();
  });

  test("start button appears when 2 players have joined", async ({
    player1Page,
    player2Page,
  }) => {
    const p1 = new ScrabblePage(player1Page);
    const p2 = new ScrabblePage(player2Page);

    await p1.goto();
    await p1.joinGame("Alice");

    await p2.goto();
    await p2.joinGame("Bob");

    // Wait for socket propagation so both see 2 players
    await p1.waitForPlayerVisible("Bob");
    await p2.waitForPlayerVisible("Alice");

    // Both should see the start button
    await expect(p1.startButton).toBeVisible();
    await expect(p2.startButton).toBeVisible();
  });

  test("clicking start begins the game for both players", async ({
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

    // Both should see the turn indicator
    await expect(p1.turnIndicator).toBeVisible();
    await expect(p2.turnIndicator).toBeVisible();

    // Both should have 7 tiles in their rack
    const p1TileCount = await p1.getRackTileCount();
    const p2TileCount = await p2.getRackTileCount();
    expect(p1TileCount).toBe(7);
    expect(p2TileCount).toBe(7);

    // Tile bag count should be visible (100 - 14 = 86)
    await expect(p1.tileBagCount).toBeVisible();
    const bagCount = await p1.getTileBagCount();
    expect(bagCount).toBe(86);

    // Start button should disappear
    await expect(p1.startButton).not.toBeVisible();
    await expect(p2.startButton).not.toBeVisible();
  });
});
