import { test, expect } from "../fixtures/scrabble-fixture";
import type { Page } from "@playwright/test";

/** Opens /boggle (optionally via an invite link) and waits until the room list has loaded. */
async function openBoggle(page: Page, roomCode?: string) {
  await page.goto(roomCode ? `/boggle?sala=${roomCode}` : "/boggle");
  await expect(page.getByText("Salas abiertas", { exact: true })).toBeVisible();
  await expect(page.getByText("Buscando salas…")).toBeHidden({ timeout: 15_000 });
}

async function useName(page: Page, name: string) {
  await page.getByLabel("✏️ Usar nombre personalizado").check();
  await page.getByPlaceholder("Tu nombre personalizado").fill(name);
}

const roomCodeOf = async (page: Page) =>
  (await page.getByTestId("room-code").first().getAttribute("data-code"))!;

test.describe("Boggle - Rooms", () => {
  test("create a room, invite by link, and play in it without touching other rooms", async ({
    browser,
    player1Page,
    player2Page,
  }) => {
    test.setTimeout(60_000);

    // Ana creates a room
    await openBoggle(player1Page);
    await useName(player1Page, "Ana");
    await player1Page.getByRole("button", { name: /Crear sala/ }).click();
    await expect(player1Page.getByTestId("room-code")).toBeVisible();
    const code = await roomCodeOf(player1Page);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
    await expect(player1Page).toHaveURL(new RegExp(`\\?sala=${code}$`));

    // Bob follows the invite link
    await openBoggle(player2Page, code);
    await expect(player2Page.getByTestId("linked-room")).toContainText(`sala ${code} de Ana`);
    await useName(player2Page, "Bob");
    await player2Page.getByRole("button", { name: `🚀 Unirse a ${code}` }).click();
    await expect(player1Page.getByText("Bob", { exact: true }).first()).toBeVisible();

    // Carol is in another room at the same time
    const otherContext = await browser.newContext();
    try {
      const carol = await otherContext.newPage();
      await openBoggle(carol);
      await useName(carol, "Carol");
      await carol.getByRole("button", { name: /Crear sala/ }).click();
      await expect(carol.getByTestId("room-code")).toBeVisible();
      expect(await roomCodeOf(carol)).not.toBe(code);

      // Ana starts her round: both players get the clock, Carol's room stays waiting
      await player1Page.getByRole("button", { name: /Iniciar Juego/ }).click();
      const clock = /^\d:\d{2}$/;
      await expect(player1Page.getByText(clock).first()).toBeVisible({ timeout: 20_000 });
      await expect(player2Page.getByText(clock).first()).toBeVisible({ timeout: 20_000 });

      await expect(carol.getByRole("button", { name: /Iniciar Juego/ })).toBeVisible();
      await expect(carol.getByText(clock)).toHaveCount(0);
      await expect(carol.getByText("Bob", { exact: true })).toHaveCount(0);
    } finally {
      await otherContext.close();
    }
  });

  test("joining an unknown code shows why", async ({ player1Page }) => {
    await openBoggle(player1Page);
    await player1Page.getByLabel("Código de sala").fill("ZZZZ");
    await player1Page.getByRole("button", { name: "Unirse con código" }).click();

    await expect(player1Page.getByText("La sala no existe")).toBeVisible();
  });
});
