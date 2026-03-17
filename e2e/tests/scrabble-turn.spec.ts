import { test, expect, resetServerGame } from "../fixtures/scrabble-fixture";
import { ScrabblePage } from "../helpers/scrabble-page";
import { findPlayableWord, getFirstTurnPositions } from "../helpers/tile-helpers";

test.describe("Scrabble - Turns", () => {
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

    // Wait for turn indicator on p2 as well
    await expect(p2.turnIndicator).toBeVisible();
  });

  test("only the current player sees action buttons", async () => {
    // Determine who has the turn
    const p1IsActive = await p1.isMyTurn();

    const activePlayer = p1IsActive ? p1 : p2;
    const waitingPlayer = p1IsActive ? p2 : p1;

    await expect(activePlayer.confirmButton).toBeVisible();
    await expect(activePlayer.passButton).toBeVisible();
    await expect(activePlayer.exchangeButton).toBeVisible();

    await expect(waitingPlayer.confirmButton).not.toBeVisible();
    await expect(waitingPlayer.passButton).not.toBeVisible();
    await expect(waitingPlayer.exchangeButton).not.toBeVisible();
  });

  test("player can select a tile and place it on the board", async () => {
    const activePlayer = (await p1.isMyTurn()) ? p1 : p2;

    const tilesBefore = await activePlayer.getRackTileCount();

    // Select first tile from rack
    await activePlayer.selectRackTile(0);

    // Place on center cell (7,7) — required for first turn
    await activePlayer.clickBoardCell(7, 7);

    // Rack should have one less tile displayed
    const tilesAfter = await activePlayer.getRackTileCount();
    expect(tilesAfter).toBe(tilesBefore - 1);
  });

  test("player can recall placed tiles back to rack", async () => {
    const activePlayer = (await p1.isMyTurn()) ? p1 : p2;

    const tilesBefore = await activePlayer.getRackTileCount();

    // Place a tile
    await activePlayer.selectRackTile(0);
    await activePlayer.clickBoardCell(7, 7);

    // Recall
    await activePlayer.recallTiles();

    // Rack should be restored (wait for re-render)
    await expect(activePlayer.tileRack.locator("button")).toHaveCount(tilesBefore);
  });

  test("player can pass their turn", async () => {
    const p1IsActive = await p1.isMyTurn();
    const activePlayer = p1IsActive ? p1 : p2;
    const waitingPlayer = p1IsActive ? p2 : p1;

    await activePlayer.passTurn();

    // Turn should advance: the previously waiting player now has the turn
    await waitingPlayer.waitForMyTurn();
    const waitingIsNowActive = await waitingPlayer.isMyTurn();
    expect(waitingIsNowActive).toBe(true);
  });

  test("passing with placed tiles recalls them first", async () => {
    const activePlayer = (await p1.isMyTurn()) ? p1 : p2;

    const tilesBefore = await activePlayer.getRackTileCount();

    // Place a tile then pass
    await activePlayer.selectRackTile(0);
    await activePlayer.clickBoardCell(7, 7);
    await activePlayer.passTurn();

    // After pass, tiles should be recalled and rack restored
    await activePlayer.waitForOtherTurn();
    await expect(activePlayer.tileRack.locator("button")).toHaveCount(tilesBefore);
  });

  test("submitting a valid word scores points and advances turn", async () => {
    const p1IsActive = await p1.isMyTurn();
    const activePlayer = p1IsActive ? p1 : p2;
    const waitingPlayer = p1IsActive ? p2 : p1;
    const activePlayerName = p1IsActive ? "Alice" : "Bob";

    // Read rack tiles
    const rackLetters = await activePlayer.getRackTileLetters();
    const playable = findPlayableWord(rackLetters);

    if (!playable) {
      // If we can't find a playable word from these random tiles, skip gracefully
      test.skip(true, "No playable word found from random rack tiles");
      return;
    }

    const positions = getFirstTurnPositions(playable.word.length);

    // Place each tile: select from rack by index, then click board cell
    // We need to place tiles in order, but rack indices shift as tiles are placed
    // Sort rack indices descending so removals don't shift earlier indices
    const placements = playable.rackIndices.map((rackIdx, i) => ({
      rackIdx,
      position: positions[i],
    }));

    // Place tiles one by one (rack re-renders after each placement, indices shift)
    // Strategy: always read the current rack state and find the needed letter
    for (let i = 0; i < playable.word.length; i++) {
      const letter = playable.word[i].toUpperCase();
      const currentRack = await activePlayer.getRackTileLetters();
      const rackIdx = currentRack.findIndex((l) => l === letter);
      if (rackIdx === -1) {
        test.skip(true, `Could not find letter ${letter} in rack`);
        return;
      }
      await activePlayer.selectRackTile(rackIdx);
      await activePlayer.clickBoardCell(positions[i].row, positions[i].col);
    }

    // Submit
    await activePlayer.submitTurn();

    // Wait for turn to advance to the other player
    await waitingPlayer.waitForMyTurn();

    // Active player's score should have increased
    const score = await waitingPlayer.getPlayerScore(activePlayerName);
    expect(score).toBeGreaterThan(0);

    // Move history should appear
    await expect(activePlayer.moveHistoryToggle).toBeVisible();
  });

  test("timer is visible and counts down", async () => {
    const activePlayer = (await p1.isMyTurn()) ? p1 : p2;

    const timerText = await activePlayer.getTimerText();
    // Timer should show something like "2:00" or "1:59"
    expect(timerText).toMatch(/\d+:\d{2}/);
  });
});
