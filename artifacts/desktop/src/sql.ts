/**
 * Thin typed wrappers around node:sqlite prepared statements.
 * These helpers cast `unknown` values to the accepted SQLInputValue union
 * so callers can pass values from `Record<string, unknown>` safely.
 */
import type { StatementSync } from "node:sqlite";

export type SqlVal = string | number | bigint | null | Uint8Array;

/** Safely cast an unknown value to a SQLite-acceptable scalar. */
export function sv(x: unknown): SqlVal {
  if (x === undefined) return null;
  return x as SqlVal;
}

/** Helper to call .get() with spread unknown values. */
export function stmtGet<T = Record<string, unknown>>(
  stmt: StatementSync,
  ...args: unknown[]
): T | null {
  return (stmt.get(...(args.map(sv) as SqlVal[])) as T) ?? null;
}

/** Helper to call .run() with spread unknown values. */
export function stmtRun(stmt: StatementSync, ...args: unknown[]): void {
  stmt.run(...(args.map(sv) as SqlVal[]));
}

/** Helper to call .all() with spread unknown values. */
export function stmtAll<T = Record<string, unknown>>(
  stmt: StatementSync,
  ...args: unknown[]
): T[] {
  return stmt.all(...(args.map(sv) as SqlVal[])) as T[];
}
