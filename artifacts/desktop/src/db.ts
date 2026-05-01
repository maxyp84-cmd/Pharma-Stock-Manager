/**
 * Database layer using Node.js built-in `node:sqlite` (available since Node.js 22.5).
 * No native compilation needed — ships with Node.js and Electron.
 */
import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

let _db: DatabaseSync | null = null;

export function getDbPath(): string {
  // MEDISTOCK_DB_DIR is set by server-entry.ts (from Electron's app.getPath("userData"))
  const dir = process.env.MEDISTOCK_DB_DIR ?? path.join(process.cwd(), ".medistock-data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "medistock.db");
}

export function initDb(dbPath: string): DatabaseSync {
  _db = new DatabaseSync(dbPath);
  _db.exec("PRAGMA journal_mode = WAL");
  _db.exec("PRAGMA foreign_keys = ON");
  runMigrations(_db);
  return _db;
}

export function getDb(): DatabaseSync {
  if (!_db) throw new Error("DB not initialized — call initDb first");
  return _db;
}

export function closeDb() {
  _db?.close();
  _db = null;
}

function runMigrations(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','manager','cashier')),
      branch_id INTEGER REFERENCES branches(id),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_name TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      barcode TEXT,
      sku TEXT,
      category_id INTEGER REFERENCES categories(id),
      supplier_id INTEGER REFERENCES suppliers(id),
      branch_id INTEGER REFERENCES branches(id),
      unit TEXT,
      cost_price REAL NOT NULL DEFAULT 0,
      sell_price REAL NOT NULL DEFAULT 0,
      stock_qty INTEGER NOT NULL DEFAULT 0,
      reorder_level INTEGER NOT NULL DEFAULT 10,
      expiry_date TEXT,
      batch_number TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS products_barcode_idx ON products(barcode);

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      type TEXT NOT NULL CHECK(type IN ('IN','OUT','ADJUST','SALE')),
      quantity INTEGER NOT NULL,
      note TEXT,
      user_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT NOT NULL UNIQUE,
      subtotal REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      profit REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL,
      amount_paid REAL NOT NULL,
      change REAL NOT NULL DEFAULT 0,
      cashier_id INTEGER REFERENCES users(id),
      branch_id INTEGER REFERENCES branches(id),
      customer_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      cost_price REAL NOT NULL,
      line_total REAL NOT NULL
    );
  `);
}
