import { test, expect, resetServerGame } from "../fixtures/scrabble-fixture";
import { ScrabblePage } from "../helpers/scrabble-page";

test.describe("Scrabble - Joining a game", () => {
  test.beforeEach(async () => {
    await resetServerGame();
  });

  test("shows the join form when navigating to /scrabble", async ({ player1Page }) => {
    const scrabble = new ScrabblePage(player1Page);
    await scrabble.goto();

    await expect(scrabble.nameInput).toBeVisible();
    await expect(scrabble.joinButton).toBeVisible();
    await expect(scrabble.joinButton).toHaveText("Unirse");
  });

  test("player can join with a name", async ({ player1Page }) => {
    const scrabble = new ScrabblePage(player1Page);
    await scrabble.goto();
    await scrabble.joinGame("Alice");

    // JoinForm should be gone, GameView should be visible
    await expect(scrabble.nameInput).not.toBeVisible();
    await expect(player1Page.locator("h1:has-text('Scrabble')")).toBeVisible();

    // Player name should appear in the player list
    const names = await scrabble.getPlayerNames();
    expect(names).toContain("Alice");
  });

  test("two players can join the same game", async ({ player1Page, player2Page }) => {
    const p1 = new ScrabblePage(player1Page);
    const p2 = new ScrabblePage(player2Page);

    await p1.goto();
    await p2.goto();

    await p1.joinGame("Alice");
    await p2.joinGame("Bob");

    // Wait for both players to see each other (socket propagation)
    await p1.waitForPlayerVisible("Bob");
    await p2.waitForPlayerVisible("Alice");

    const p1Names = await p1.getPlayerNames();
    const p2Names = await p2.getPlayerNames();

    expect(p1Names).toContain("Alice");
    expect(p1Names).toContain("Bob");
    expect(p2Names).toContain("Alice");
    expect(p2Names).toContain("Bob");
  });

  test("join button is disabled when name is empty", async ({ player1Page }) => {
    const scrabble = new ScrabblePage(player1Page);
    await scrabble.goto();

    await expect(scrabble.joinButton).toBeDisabled();
  });
});
