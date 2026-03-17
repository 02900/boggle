import { test as base, type Page, type BrowserContext } from "@playwright/test";
import { io, type Socket } from "socket.io-client";

const BASE_URL = "http://localhost:3001";

/**
 * Resets the server game state. Waits briefly for previous test's socket
 * disconnections to be processed, then emits reset-game and waits for the
 * game-reset response to confirm the reset completed.
 */
async function resetServerGame(): Promise<void> {
  // Allow time for previous test's browser contexts to close and
  // their socket disconnect events to be processed by the server
  await new Promise((resolve) => setTimeout(resolve, 500));

  return new Promise((resolve) => {
    const socket: Socket = io(BASE_URL, {
      query: { game: "scrabble" },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      socket.emit("reset-game");
    });

    // Wait for game-reset confirmation before disconnecting
    socket.on("game-reset", () => {
      setTimeout(() => {
        socket.disconnect();
        resolve();
      }, 200);
    });

    // Fallback timeout in case something goes wrong
    setTimeout(() => {
      socket.disconnect();
      resolve();
    }, 5000);
  });
}

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
export { resetServerGame };
