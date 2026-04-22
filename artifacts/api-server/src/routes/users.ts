import { Router, type IRouter } from "express";
import { CreateUserBody, UpdateUserBody } from "@workspace/api-zod";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, hashPassword } from "../lib/auth";

const router: IRouter = Router();

router.get("/users", requireAuth(["admin"]), async (_req, res) => {
  const rows = await db.select().from(users);
  res.json(
    rows.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      branchId: u.branchId,
      active: u.active,
      createdAt: u.createdAt.toISOString(),
    })),
  );
});

router.post("/users", requireAuth(["admin"]), async (req, res) => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [u] = await db
    .insert(users)
    .values({
      username: parsed.data.username,
      passwordHash: hashPassword(parsed.data.password),
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      branchId: parsed.data.branchId ?? null,
    })
    .returning();
  res.json({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    branchId: u.branchId,
    active: u.active,
    createdAt: u.createdAt.toISOString(),
  });
});

router.patch("/users/:id", requireAuth(["admin"]), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.fullName !== undefined) updates.fullName = parsed.data.fullName;
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;
  if (parsed.data.branchId !== undefined) updates.branchId = parsed.data.branchId;
  if (parsed.data.active !== undefined) updates.active = parsed.data.active;
  if (parsed.data.password) updates.passwordHash = hashPassword(parsed.data.password);
  const [u] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
  if (!u) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    branchId: u.branchId,
    active: u.active,
    createdAt: u.createdAt.toISOString(),
  });
});

router.delete("/users/:id", requireAuth(["admin"]), async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(users).where(eq(users.id, id));
  res.json({ ok: true });
});

export default router;
