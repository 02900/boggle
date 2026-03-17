import { test, expect, resetServerGame } from "../fixtures/scrabble-fixture";
import { ScrabblePage } from "../helpers/scrabble-page";

test.describe("Scrabble - Exchanging tiles", () => {
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

  test("player can enter exchange mode", async () => {
    const activePlayer = (await p1.isMyTurn()) ? p1 : p2;

    await activePlayer.enterExchangeMode();

    await expect(activePlayer.exchangeMessage).toBeVisible();
    await expect(activePlayer.confirmExchangeButton).toBeVisible();
    await expect(activePlayer.cancelExchangeButton).toBeVisible();
  });

  test("player can cancel exchange mode", async () => {
    const activePlayer = (await p1.isMyTurn()) ? p1 : p2;

    await activePlayer.enterExchangeMode();
    await activePlayer.cancelExchange();

    await expect(activePlayer.exchangeMessage).not.toBeVisible();
    // Normal action buttons should be back
    await expect(activePlayer.passButton).toBeVisible();
  });

  test("player can exchange tiles and turn advances", async () => {
    const p1IsActive = await p1.isMyTurn();
    const activePlayer = p1IsActive ? p1 : p2;
    const waitingPlayer = p1IsActive ? p2 : p1;

    const rackBefore = await activePlayer.getRackTileLetters();

    await activePlayer.enterExchangeMode();

    // Select 2 tiles for exchange
    await activePlayer.selectTileForExchange(0);
    await activePlayer.selectTileForExchange(1);

    await activePlayer.confirmExchange();

    // Turn should advance
    await waitingPlayer.waitForMyTurn();

    // Active player should still have 7 tiles
    const rackCount = await activePlayer.getRackTileCount();
    expect(rackCount).toBe(7);
  });
});
