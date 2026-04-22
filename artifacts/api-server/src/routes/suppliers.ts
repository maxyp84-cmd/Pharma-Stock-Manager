import { Router, type IRouter } from "express";
import { CreateSupplierBody } from "@workspace/api-zod";
import { db, suppliers } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/suppliers", requireAuth(), async (_req, res) => {
  const rows = await db.select().from(suppliers);
  res.json(rows);
});

router.post(
  "/suppliers",
  requireAuth(["admin", "manager"]),
  async (req, res) => {
    const parsed = CreateSupplierBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [s] = await db.insert(suppliers).values(parsed.data).returning();
    res.json(s);
  },
);

router.patch(
  "/suppliers/:id",
  requireAuth(["admin", "manager"]),
  async (req, res) => {
    const id = Number(req.params.id);
    const parsed = CreateSupplierBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [s] = await db
      .update(suppliers)
      .set(parsed.data)
      .where(eq(suppliers.id, id))
      .returning();
    if (!s) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(s);
  },
);

router.delete(
  "/suppliers/:id",
  requireAuth(["admin", "manager"]),
  async (req, res) => {
    const id = Number(req.params.id);
    await db.delete(suppliers).where(eq(suppliers.id, id));
    res.json({ ok: true });
  },
);

export default router;
