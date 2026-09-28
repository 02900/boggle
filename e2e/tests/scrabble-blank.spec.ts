import { test, expect, resetServerGame } from "../fixtures/scrabble-fixture";
import { ScrabblePage } from "../helpers/scrabble-page";

test.describe("Scrabble - Blank tile", () => {
  test("a blank takes the chosen letter, scores 0 and keeps its mark on the board", async ({
    player1Page,
    player2Page,
  }) => {
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

    const active = (await p1.isMyTurn()) ? p1 : p2;
    const other = active === p1 ? p2 : p1;
    await active.setRack(["", "S", "A"]);

    // Blank at H8: the picker offers only Spanish tiles (no K, digraphs included)
    await active.tileRack.getByRole("button", { name: "Ficha comodín" }).click();
    await active.clickBoardCell(7, 7);
    const picker = active.page.getByRole("dialog");
    await expect(picker).toContainText("Elige una letra para el comodín");
    await expect(picker.getByRole("button", { name: "K", exact: true })).toHaveCount(0);
    await expect(picker.getByRole("button", { name: "LL", exact: true })).toBeVisible();
    await picker.getByRole("button", { name: "E", exact: true }).click();

    await active.tileRack.getByRole("button", { name: /^Ficha S,/ }).click();
    await active.clickBoardCell(7, 8);

    // ES through the center: blank 0 + S 1, double word → 2
    await expect(active.page.getByTestId("move-hint")).toHaveText("ES 2");
    await active.submitTurn();

    await other.waitForMyTurn();
    const center = other.boardGrid.locator("> button").nth(7 * 15 + 7);
    await expect(center.getByTestId("tile")).toHaveAttribute("data-letter", "E");
    await expect(center.getByTestId("tile")).toContainText("★");
    await expect.poll(() => active.getPlayerScore(active === p1 ? "Alice" : "Bob")).toBe(2);
  });
});
