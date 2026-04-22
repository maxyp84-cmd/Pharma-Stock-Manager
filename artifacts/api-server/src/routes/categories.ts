import { Router, type IRouter } from "express";
import { CreateCategoryBody } from "@workspace/api-zod";
import { db, categories } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/categories", requireAuth(), async (_req, res) => {
  const rows = await db.select().from(categories);
  res.json(rows);
});

router.post(
  "/categories",
  requireAuth(["admin", "manager"]),
  async (req, res) => {
    const parsed = CreateCategoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [c] = await db.insert(categories).values({ name: parsed.data.name }).returning();
    res.json(c);
  },
);

router.delete(
  "/categories/:id",
  requireAuth(["admin", "manager"]),
  async (req, res) => {
    const id = Number(req.params.id);
    await db.delete(categories).where(eq(categories.id, id));
    res.json({ ok: true });
  },
);

export default router;
