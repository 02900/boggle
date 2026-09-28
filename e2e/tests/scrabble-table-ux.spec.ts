import { test, expect, resetServerGame } from "../fixtures/scrabble-fixture";
import { ScrabblePage } from "../helpers/scrabble-page";

test.describe("Scrabble - Table helpers", () => {
  let p1: ScrabblePage;
  let p2: ScrabblePage;
  let active: ScrabblePage;
  let waiting: ScrabblePage;

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

    const p1IsActive = await p1.isMyTurn();
    active = p1IsActive ? p1 : p2;
    waiting = p1IsActive ? p2 : p1;
  });

  /** Rack indices of non-blank tiles (a blank would open the letter picker). */
  async function plainTileIndices(page: ScrabblePage): Promise<number[]> {
    const tiles = page.tileRack.locator("button");
    const indices: number[] = [];
    for (let i = 0; i < (await tiles.count()); i++) {
      if (await tiles.nth(i).getAttribute("data-letter")) indices.push(i);
    }
    return indices;
  }

  test("shows the estimated score before confirming, or why the move is invalid", async () => {
    const [first] = await plainTileIndices(active);
    await active.selectRackTile(first);
    await active.clickBoardCell(7, 7);

    const hint = active.page.getByTestId("move-hint");
    await expect(hint).toHaveText("No se formó ninguna palabra válida");
    await expect(active.page.getByTestId("move-score")).not.toBeVisible();

    const [second] = await plainTileIndices(active);
    await active.selectRackTile(second);
    await active.clickBoardCell(7, 8);

    await expect(active.page.getByTestId("move-score")).toHaveText(/^\+\d+$/);
    await expect(hint).toHaveText(/^[A-ZÑ]{2,} \d+$/);
  });

  test("clicking a placed tile returns it to the rack", async () => {
    const [first] = await plainTileIndices(active);
    await active.selectRackTile(first);
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
