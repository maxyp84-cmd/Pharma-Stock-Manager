import { Router, type IRouter } from "express";
import { LoginBody } from "@workspace/api-zod";
import { db, users, branches } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  createSession,
  destroySession,
  loadAuth,
  setSessionCookie,
  clearSessionCookie,
  verifyPassword,
} from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.username, parsed.data.username));
  if (!u || !u.active || !verifyPassword(parsed.data.password, u.passwordHash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const sid = await createSession(u.id);
  setSessionCookie(res, sid);
  let branchName: string | null = null;
  if (u.branchId) {
    const [b] = await db.select().from(branches).where(eq(branches.id, u.branchId));
    branchName = b?.name ?? null;
  }
  res.json({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    branchId: u.branchId,
    branchName,
  });
});

router.post("/auth/logout", async (req, res) => {
  const sid = (req as { cookies?: Record<string, string> }).cookies?.[
    "pharm_session"
  ];
  if (sid) await destroySession(sid);
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/auth/me", async (req, res) => {
  const auth = await loadAuth(req);
  if (!auth) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  let branchName: string | null = null;
  if (auth.branchId) {
    const [b] = await db
      .select()
      .from(branches)
      .where(eq(branches.id, auth.branchId));
    branchName = b?.name ?? null;
  }
  res.json({
    id: auth.userId,
    username: auth.username,
    fullName: auth.fullName,
    role: auth.role,
    branchId: auth.branchId,
    branchName,
  });
});

export default router;
