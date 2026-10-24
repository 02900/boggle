import { test, expect } from "../fixtures/scrabble-fixture";
import { ScrabblePage } from "../helpers/scrabble-page";

/** Code of the room the test's first player created */
let roomCode: string;

const RACK = ["E", "S", "A", "L", "O", "R", "T"];

test.describe("Scrabble - Table helpers", () => {
  let p1: ScrabblePage;
  let p2: ScrabblePage;
  let active: ScrabblePage;
  let waiting: ScrabblePage;

  test.beforeEach(async ({ player1Page, player2Page }) => {

    p1 = new ScrabblePage(player1Page);
    p2 = new ScrabblePage(player2Page);

    await p1.goto();
    roomCode = await p1.joinGame("Alice");
    await p2.goto();
    await p2.joinGame("Bob", roomCode);
    await p1.waitForPlayerVisible("Bob");
    await p1.startGame();
    await expect(p2.turnIndicator).toBeVisible();

    const p1IsActive = await p1.isMyTurn();
    active = p1IsActive ? p1 : p2;
    waiting = p1IsActive ? p2 : p1;

    // Known racks with distinct letters and no blank (a blank opens the letter picker)
    await active.setRack(RACK);
    await waiting.setRack(RACK);
  });

  const tile = (page: ScrabblePage, letter: string) =>
    page.tileRack.getByRole("button", { name: new RegExp(`^Ficha ${letter},`) });

  test("shows the estimated score before confirming, or why the move is invalid", async () => {
    await tile(active, "E").click();
    await active.clickBoardCell(7, 7);

    const hint = active.page.getByTestId("move-hint");
    await expect(hint).toHaveText("No se formó ninguna palabra válida");
    await expect(active.page.getByTestId("move-score")).not.toBeVisible();

    await tile(active, "S").click();
    await active.clickBoardCell(7, 8);

    // ES through the center (double word): (1 + 1) × 2
    await expect(active.page.getByTestId("move-score")).toHaveText("+4");
    await expect(hint).toHaveText("ES 4");
  });

  test("clicking a placed tile returns it to the rack", async () => {
    await tile(active, "E").click();
    await active.clickBoardCell(7, 7);
    await expect(active.tileRack.locator("button")).toHaveCount(6);

    const center = active.boardGrid.locator("> button").nth(7 * 15 + 7);
    await expect(center).toHaveAttribute("aria-label", /^H8, \S+ colocada/);
    await center.click();

    await expect(active.tileRack.locator("button")).toHaveCount(7);
    await expect(center.getByTestId("tile")).toHaveCount(0);
    await expect(center).toHaveAttribute("aria-label", /^H8, centro$/);
  });

  test("the rack can be shuffled and reordered by dragging", async () => {
    const before = await waiting.getRackTileLetters();

    await waiting.page.getByTestId("shuffle-rack").click();
    const shuffled = await waiting.getRackTileLetters();
    expect([...shuffled].sort()).toEqual([...before].sort());

    const tiles = waiting.tileRack.locator("button");
    const firstId = await tiles.nth(0).getAttribute("aria-label");
    await tiles.nth(0).dragTo(tiles.nth(2));
    // The dragged tile takes the target's place
    await expect(tiles.nth(2)).toHaveAttribute("aria-label", firstId!);
  });

  test("leaving mid-game asks first, then ends the game by abandon for the other player", async () => {
    await active.page.getByTestId("leave-game").click();
    await expect(active.page.getByRole("dialog")).toContainText("¿Abandonar la partida?");
    await active.page.getByRole("button", { name: "Abandonar" }).click();

    await expect(active.page).toHaveURL(/\/$/);
    await expect(waiting.gameEndHeading).toBeVisible();
    await expect(waiting.page.getByRole("dialog")).toContainText("Partida terminada por abandono");
  });
});
