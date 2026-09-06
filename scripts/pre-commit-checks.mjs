#!/usr/bin/env node
/**
 * Pre-commit selectivo: corre solo los checks vinculados a los archivos staged.
 *
 * - Unit tests: `vitest related` usa el grafo de imports para correr solo
 *   los tests que dependen (transitivamente) de los archivos cambiados.
 * - E2E: se mapea por dominio (scrabble / boggle / compartido) ya que
 *   Playwright no puede trazar dependencias del server en ejecución.
 * - Build: solo si cambió código de la app (no tests, no docs).
 * - Si cambia configuración global (package.json, tsconfig, etc.) corre todo.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const stagedFiles = execFileSync(
  "git",
  ["diff", "--cached", "--name-only", "--diff-filter=ACMRD"],
  { encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean);

if (stagedFiles.length === 0) {
  console.log("No staged files, skipping checks.");
  process.exit(0);
}

// --- Clasificación de archivos ---

const isGlobalConfig = (f) =>
  /^(package\.json|pnpm-lock\.yaml|tsconfig.*\.json|vitest\.config\.ts|next\.config\.ts|postcss\.config\.mjs|eslint\.config\.mjs|server\.ts)$/.test(
    f,
  ) || f.startsWith(".husky/") || f.startsWith("scripts/");

const isDoc = (f) =>
  /\.(md|txt)$/.test(f) || f.startsWith("docs/") || f === "scoreboard.json";

const isCode = (f) => /\.(ts|tsx|js|jsx|mjs|cjs|json)$/.test(f) && !isDoc(f);

const isUnitTestFile = (f) => /__tests__\//.test(f);
const isE2eFile = (f) => f.startsWith("e2e/");

const domainOf = (f) => {
  if (/(^|\/|[.-])scrabble/i.test(f)) return "scrabble";
  if (/(^|\/|[.-])boggle/i.test(f)) return "boggle";
  return "shared";
};

const codeFiles = stagedFiles.filter(isCode);
const globalConfigChanged = stagedFiles.some(isGlobalConfig);
const appCodeFiles = codeFiles.filter(
  (f) => !isUnitTestFile(f) && !isE2eFile(f),
);

// --- Decidir qué correr ---

// Unit: archivos que vitest puede rastrear (código y tests, no e2e)
const vitestRelatedFiles = codeFiles.filter(
  (f) => !isE2eFile(f) && /\.(ts|tsx)$/.test(f) && existsSync(f),
);
const runAllUnit = globalConfigChanged;
const runUnit = runAllUnit || vitestRelatedFiles.length > 0;

// E2E: dominios afectados por código de la app o archivos e2e
let e2eFilters = new Set();
let runAllE2e = globalConfigChanged;
const changedSpecs = [];

for (const f of stagedFiles.filter(isE2eFile)) {
  if (/\.spec\.ts$/.test(f) && existsSync(f)) changedSpecs.push(f);
  else runAllE2e = true; // helpers / fixtures / config de e2e afectan todo
}
for (const f of appCodeFiles) {
  const d = domainOf(f);
  if (d === "shared") runAllE2e = true;
  else e2eFilters.add(`e2e/tests/${d}-`);
}

// Build: solo si cambió código de la app o config global
const runBuild = globalConfigChanged || appCodeFiles.length > 0;

// --- Ejecución ---

const run = (label, cmd, args) => {
  console.log(`\n[pre-commit] ${label}: ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, { stdio: "inherit" });
  if (res.status !== 0) process.exit(res.status ?? 1);
};

if (runAllUnit) {
  run("Unit tests (todos, cambió config global)", "pnpm", ["test:run"]);
} else if (runUnit) {
  run("Unit tests (relacionados)", "pnpm", [
    "vitest",
    "related",
    "--run",
    ...vitestRelatedFiles,
  ]);
} else {
  console.log("[pre-commit] Unit tests: sin cambios relacionados, se saltean.");
}

if (runAllE2e) {
  run("E2E tests (todos)", "pnpm", ["test:e2e"]);
} else {
  const targets = [...new Set([...e2eFilters, ...changedSpecs])];
  if (targets.length > 0) {
    run("E2E tests (dominios afectados)", "pnpm", [
      "test:e2e",
      "--pass-with-no-tests",
      ...targets,
    ]);
  } else {
    console.log("[pre-commit] E2E tests: sin cambios relacionados, se saltean.");
  }
}

if (runBuild) {
  run("Build", "pnpm", ["build"]);
} else {
  console.log("[pre-commit] Build: sin cambios de código de app, se saltea.");
}

console.log("\nAll checks passed!");
