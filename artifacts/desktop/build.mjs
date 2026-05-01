/**
 * Build script for MediStock desktop app.
 * 1. Builds the pharmacy React frontend (BASE_PATH=/)
 * 2. Copies it to artifacts/desktop/frontend-dist
 * 3. Compiles Electron main + preload + server-entry with esbuild
 *
 * NOTE: server-entry.js is spawned as a child process with --experimental-sqlite
 *       so it can use the built-in node:sqlite module without native compilation.
 */

import { execSync } from "child_process";
import { cpSync, rmSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");
const desktopDir = __dirname;

// ── 1. Build the React frontend ───────────────────────────────
console.log("Building pharmacy frontend…");
execSync("pnpm --filter @workspace/pharmacy exec vite build", {
  cwd: root,
  env: { ...process.env, PORT: "3000", BASE_PATH: "/" },
  stdio: "inherit",
});

// ── 2. Copy frontend output to desktop/frontend-dist ──────────
const frontendSrc = resolve(root, "artifacts/pharmacy/dist/public");
const frontendDest = resolve(desktopDir, "frontend-dist");
rmSync(frontendDest, { recursive: true, force: true });
cpSync(frontendSrc, frontendDest, { recursive: true });
console.log("Frontend copied →", frontendDest);

// ── 3. Compile Electron main + preload (no SQLite needed) ─────
rmSync(resolve(desktopDir, "dist"), { recursive: true, force: true });
mkdirSync(resolve(desktopDir, "dist"), { recursive: true });

await build({
  entryPoints: {
    main: resolve(desktopDir, "src/main.ts"),
    preload: resolve(desktopDir, "src/preload.ts"),
  },
  outdir: resolve(desktopDir, "dist"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  external: ["electron"],
  define: { "import.meta.dirname": "__dirname" },
  sourcemap: "inline",
});

// ── 4. Compile server-entry (spawned with --experimental-sqlite)
//       All SQLite + Express logic lives here.
await build({
  entryPoints: {
    "server-entry": resolve(desktopDir, "src/server-entry.ts"),
  },
  outdir: resolve(desktopDir, "dist"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  // node:sqlite is built-in; electron is not needed in the child process
  external: ["electron"],
  define: { "import.meta.dirname": "__dirname" },
  sourcemap: "inline",
});

console.log("\nBuild complete ✔  dist/ contains main.js, preload.js, server-entry.js");
console.log("Run `electron-builder --win nsis` (or --mac/--linux) to package.\n");
