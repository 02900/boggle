import { test, expect, resetServerGame } from "../fixtures/scrabble-fixture";
import { ScrabblePage } from "../helpers/scrabble-page";

test.describe("Scrabble - Turn feedback and presence", () => {
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

  test("both players get turn notifications when a turn is passed", async () => {
    const p1IsActive = await p1.isMyTurn();
    const active = p1IsActive ? p1 : p2;
    const waiting = p1IsActive ? p2 : p1;
    const activeName = p1IsActive ? "Alice" : "Bob";

    await active.passTurn();

    // The waiting player learns what happened and that it's now their turn
    await expect(waiting.messageBox.filter({ hasText: `${activeName} pasó` })).toBeVisible();
    await expect(waiting.messageBox.filter({ hasText: "¡Tu turno!" })).toBeVisible();
    // The active player gets first-person feedback
    await expect(active.messageBox.filter({ hasText: "Pasaste el turno" })).toBeVisible();
  });

  test("a disconnected player is shown with a grace countdown, then as back when they return", async ({
    player2Page,
  }) => {
    await player2Page.goto("about:blank"); // drops Bob's socket without closing the context

    await expect(p1.connectionBanner).toContainText(/Bob se desconectó · \d+s para volver/);
    await expect(p1.playerBadges.filter({ hasText: "Bob" })).toHaveAttribute("data-connected", "false");

    // Bob comes back: his page auto-rejoins from the stored session
    await player2Page.goBack();
    const p2After = new ScrabblePage(player2Page);
    await expect(p2After.turnIndicator).toBeVisible({ timeout: 15_000 });

    await expect(p1.messageBox.filter({ hasText: "Bob volvió" })).toBeVisible();
    await expect(p1.connectionBanner).toHaveCount(0);
    await expect(p1.playerBadges.filter({ hasText: "Bob" })).toHaveAttribute("data-connected", "true");
    await expect(p1.playerBadges).toHaveCount(2);
  });

  test("the reconnecting player sees a connection banner until the socket is back", async ({
    player1Page,
  }) => {
    // Playwright's setOffline doesn't cut open WebSockets, so drop the transport directly.
    // socket.io then auto-reconnects, like after a real network blip.
    await player1Page.evaluate(() => {
      (window as unknown as { __SCRABBLE_SOCKET__: { io: { engine: { close(): void } } } })
        .__SCRABBLE_SOCKET__.io.engine.close();
    });

    await expect(p1.connectionBanner).toContainText("reconectando");
    await expect(p1.connectionBanner).toHaveCount(0, { timeout: 15_000 });
    await expect(p1.messageBox.filter({ hasText: "Reconectado a la partida" })).toBeVisible();
    await expect(p1.turnIndicator).toBeVisible();
    await expect(p1.playerBadges).toHaveCount(2);
  });
});
