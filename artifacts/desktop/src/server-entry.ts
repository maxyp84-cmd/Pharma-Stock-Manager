/**
 * Entry point for the Express + SQLite server.
 * This file is spawned as a child process by Electron's main process
 * using `--experimental-sqlite` so node:sqlite is available.
 */
import path from "path";
import fs from "fs";
import net from "net";
import { initDb } from "./db";
import { startServer } from "./server";

const DB_DIR = process.env.MEDISTOCK_DB_DIR ?? path.join(process.cwd(), ".medistock-data");
const FRONTEND = process.env.MEDISTOCK_FRONTEND ?? path.join(__dirname, "..", "frontend-dev");
const PREFERRED_PORT = Number(process.env.MEDISTOCK_PORT ?? 3000);

fs.mkdirSync(DB_DIR, { recursive: true });
const dbPath = path.join(DB_DIR, "medistock.db");

function findFreePort(start: number): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(findFreePort(start + 1)));
    server.listen(start, "127.0.0.1", () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
  });
}

async function main() {
  initDb(dbPath);
  console.log(`[server-entry] DB: ${dbPath}`);
  const port = await findFreePort(PREFERRED_PORT);
  await startServer(FRONTEND, port);
  console.log(`[server-entry] Express listening on 127.0.0.1:${port}`);
  if (process.send) {
    process.send({ type: "ready", port });
  }
}

main().catch((err) => {
  console.error("[server-entry] Fatal:", err);
  if (process.send) process.send({ type: "error", error: String(err) });
  process.exit(1);
});
