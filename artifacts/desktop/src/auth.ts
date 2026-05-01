import crypto from "crypto";
import { getDb } from "./db";
import type { Request, Response, NextFunction } from "express";

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(`${salt}:${derived.toString("hex")}`);
    });
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(derived.toString("hex") === key);
    });
  });
}

export function createSessionSync(userId: number): string {
  const db = getDb();
  const id = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(id, userId, expiresAt);
  return id;
}

export function getSessionUserSync(sessionId: string): Record<string, unknown> | null {
  const db = getDb();
  const now = new Date().toISOString();
  const row = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.role, u.branch_id, u.active
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > ?
  `).get(sessionId, now) as Record<string, unknown> | null;
  return row;
}

export function deleteSessionSync(sessionId: string) {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: number; role: string; branchId: number | null; fullName: string };
    }
  }
}

export function requireAuth(roles?: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const sid = req.cookies?.pharm_session as string | undefined;
    if (!sid) { res.status(401).json({ error: "Unauthorized" }); return; }
    const user = getSessionUserSync(sid);
    if (!user || !user.active) { res.status(401).json({ error: "Unauthorized" }); return; }
    if (roles && !roles.includes(user.role as string)) { res.status(403).json({ error: "Forbidden" }); return; }
    req.auth = {
      userId: user.id as number,
      role: user.role as string,
      branchId: (user.branch_id as number | null) ?? null,
      fullName: user.full_name as string,
    };
    next();
  };
}
