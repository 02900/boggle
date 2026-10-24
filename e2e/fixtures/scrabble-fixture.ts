import { test as base, type Page, type BrowserContext } from "@playwright/test";

// No server reset between tests: every test creates its own room, so games are
// isolated by construction.

interface ScrabbleFixture {
  player1Page: Page;
  player2Page: Page;
  player1Context: BrowserContext;
  player2Context: BrowserContext;
}

export const test = base.extend<ScrabbleFixture>({
  player1Context: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    await use(ctx);
    await ctx.close();
  },
  player2Context: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    await use(ctx);
    await ctx.close();
  },
  player1Page: async ({ player1Context }, use) => {
    const page = await player1Context.newPage();
    await use(page);
  },
  player2Page: async ({ player2Context }, use) => {
    const page = await player2Context.newPage();
    await use(page);
  },
});

export { expect } from "@playwright/test";
