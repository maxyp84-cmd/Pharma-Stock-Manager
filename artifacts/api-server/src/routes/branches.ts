import { Router, type IRouter } from "express";
import { CreateBranchBody } from "@workspace/api-zod";
import { db, branches } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/branches", requireAuth(), async (_req, res) => {
  const rows = await db.select().from(branches);
  res.json(rows);
});

router.post("/branches", requireAuth(["admin", "manager"]), async (req, res) => {
  const parsed = CreateBranchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [b] = await db.insert(branches).values(parsed.data).returning();
  res.json(b);
});

router.patch(
  "/branches/:id",
  requireAuth(["admin", "manager"]),
  async (req, res) => {
    const id = Number(req.params.id);
    const parsed = CreateBranchBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [b] = await db
      .update(branches)
      .set(parsed.data)
      .where(eq(branches.id, id))
      .returning();
    if (!b) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(b);
  },
);

router.delete("/branches/:id", requireAuth(["admin"]), async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(branches).where(eq(branches.id, id));
  res.json({ ok: true });
});

export default router;
