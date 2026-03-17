import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  webServer: {
    command: "cross-env PORT=3001 pnpm dev",
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    cwd: "..",
  },
});
