import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "client",
          environment: "jsdom",
          include: ["src/**/__tests__/**/*.test.ts", "src/**/__tests__/**/*.test.tsx"],
          setupFiles: ["./src/__tests__/setup.ts"],
        },
        resolve: {
          alias: {
            "@": path.resolve(import.meta.dirname, "./src"),
          },
        },
        // tsconfig keeps JSX as-is for Next; component tests need it compiled
        oxc: { jsx: { runtime: "automatic" } },
      },
      {
        test: {
          name: "server",
          environment: "node",
          include: [
            "game/**/__tests__/**/*.test.ts",
            "utils/__tests__/**/*.test.ts",
            "config/__tests__/**/*.test.ts",
            "socket/**/__tests__/**/*.test.ts",
          ],
          setupFiles: ["./game/shared/__tests__/setup.ts"],
        },
      },
    ],
  },
});
