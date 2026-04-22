import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { db, sessions, users } from "@workspace/db";
import { eq } from "drizzle-orm";

const SESSION_COOKIE = "pharm_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(test, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function createSession(userId: number): Promise<string> {
  const id = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id, userId, expiresAt });
  return id;
}

export async function destroySession(id: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, id));
}

export interface AuthContext {
  userId: number;
  username: string;
  fullName: string;
  role: string;
  branchId: number | null;
}

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthContext;
  }
}

export async function loadAuth(req: Request): Promise<AuthContext | null> {
  const sid = (req as Request & { cookies?: Record<string, string> }).cookies?.[
    SESSION_COOKIE
  ];
  if (!sid) return null;
  const [s] = await db.select().from(sessions).where(eq(sessions.id, sid));
  if (!s) return null;
  if (s.expiresAt.getTime() < Date.now()) {
    await destroySession(sid);
    return null;
  }
  const [u] = await db.select().from(users).where(eq(users.id, s.userId));
  if (!u || !u.active) return null;
  return {
    userId: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    branchId: u.branchId,
  };
}

export function setSessionCookie(res: Response, sid: string): void {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function requireAuth(roles?: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auth = await loadAuth(req);
    if (!auth) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (roles && !roles.includes(auth.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    req.auth = auth;
    next();
  };
}
