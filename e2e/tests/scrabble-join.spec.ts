import { test, expect } from "../fixtures/scrabble-fixture";
import { ScrabblePage } from "../helpers/scrabble-page";

/** Code of the room the test's first player created */
let roomCode: string;

test.describe("Scrabble - Joining a game", () => {

  test("shows the room picker when navigating to /scrabble", async ({ player1Page }) => {
    const scrabble = new ScrabblePage(player1Page);
    await scrabble.goto();

    await expect(scrabble.nameInput).toBeVisible();
    await expect(scrabble.createRoomButton).toBeVisible();
    await expect(scrabble.roomCodeInput).toBeVisible();
  });

  test("creating a room puts the player in its lobby with a shareable code", async ({ player1Page }) => {
    const scrabble = new ScrabblePage(player1Page);
    await scrabble.goto();
    roomCode = await scrabble.joinGame("Alice");

    expect(roomCode).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
    await expect(scrabble.nameInput).not.toBeVisible();
    await expect(player1Page.getByTestId("room-code")).toContainText(`Sala ${roomCode}`);
    await expect(player1Page).toHaveURL(new RegExp(`\\?sala=${roomCode}$`));
    expect(await scrabble.getPlayerNames()).toContain("Alice");
  });

  test("two players can join the same game", async ({ player1Page, player2Page }) => {
    const p1 = new ScrabblePage(player1Page);
    const p2 = new ScrabblePage(player2Page);

    await p1.goto();
    await p2.goto();

    roomCode = await p1.joinGame("Alice");
    await p2.joinGame("Bob", roomCode);

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

  test("creating or joining needs a name", async ({ player1Page }) => {
    const scrabble = new ScrabblePage(player1Page);
    await scrabble.goto();
    await scrabble.nameInput.fill("");

    await expect(scrabble.createRoomButton).toBeDisabled();
    await scrabble.roomCodeInput.fill("K7QF");
    await expect(scrabble.joinByCodeButton).toBeDisabled();
  });

  test("a new room shows up live in other players' list and can be joined from it", async ({
    player1Page,
    player2Page,
  }) => {
    const p1 = new ScrabblePage(player1Page);
    const p2 = new ScrabblePage(player2Page);
    await p2.goto();
    await p1.goto();
    roomCode = await p1.joinGame("Alice");

    const row = player2Page.locator(`[data-testid="room-row"][data-code="${roomCode}"]`);
    await expect(row).toContainText("Sala de Alice");
    await expect(row).toContainText("1/4");
    await p2.nameInput.fill("Bob");
    await row.getByRole("button", { name: "Unirse" }).click();

    await p1.waitForPlayerVisible("Bob");
    expect(await p2.roomCode()).toBe(roomCode);
  });

  test("an invite link offers to join that room", async ({ player1Page, player2Page }) => {
    const p1 = new ScrabblePage(player1Page);
    const p2 = new ScrabblePage(player2Page);
    await p1.goto();
    roomCode = await p1.joinGame("Alice");

    await p2.goto(roomCode);
    const invite = player2Page.getByTestId("linked-room");
    await expect(invite).toContainText(`sala ${roomCode} de Alice`);
    await p2.nameInput.fill("Bob");
    await invite.getByRole("button", { name: `Unirse a ${roomCode}` }).click();

    await p1.waitForPlayerVisible("Bob");
  });

  test("an unknown code is rejected", async ({ player1Page }) => {
    const scrabble = new ScrabblePage(player1Page);
    await scrabble.goto();
    await scrabble.nameInput.fill("Alice");
    await scrabble.roomCodeInput.fill("ZZZZ");
    await scrabble.joinByCodeButton.click();

    await expect(scrabble.errorToast()).toContainText("La sala no existe");
    await expect(scrabble.createRoomButton).toBeVisible();
  });

  test("two rooms are independent", async ({ browser, player1Page, player2Page }) => {
    const p1 = new ScrabblePage(player1Page);
    const p2 = new ScrabblePage(player2Page);
    await p1.goto();
    roomCode = await p1.joinGame("Alice");
    await p2.goto();
    await p2.joinGame("Bob", roomCode);
    await p1.waitForPlayerVisible("Bob");

    const otherContext = await browser.newContext();
    try {
      const other = new ScrabblePage(await otherContext.newPage());
      await other.goto();
      const otherCode = await other.joinGame("Carol");
      expect(otherCode).not.toBe(roomCode);

      await p1.startGame();
      await expect(p2.turnIndicator).toBeVisible();

      // Carol's room didn't start and never heard of Alice or Bob
      await expect(other.startButton).not.toBeVisible();
      await expect(other.turnIndicator).toHaveCount(0);
      expect(await other.getPlayerNames()).toEqual(["Carol"]);
      expect(await p1.getPlayerNames()).not.toContain("Carol");
    } finally {
      await otherContext.close();
    }
  });

  test("shows Scrabble's own scoreboard from the join screen", async ({ player1Page }) => {
    const scrabble = new ScrabblePage(player1Page);
    await scrabble.goto();

    await player1Page.getByRole("button", { name: "Mejores puntajes" }).click();
    const dialog = player1Page.getByRole("dialog");
    await expect(dialog).toContainText("Mejores puntajes de Scrabble");
    // Loaded from the server (rows or the empty state), not stuck loading
    await expect(dialog.getByText("Cargando puntajes…")).toHaveCount(0);
    await expect(
      dialog.getByTestId("scoreboard-row").first().or(dialog.getByText(/Todavía no hay puntajes de Scrabble/))
    ).toBeVisible();
  });
});

