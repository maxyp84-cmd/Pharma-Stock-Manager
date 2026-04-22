import { Router, type IRouter } from "express";
import { CreateStockMovementBody } from "@workspace/api-zod";
import { db, stockMovements, products, users } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/stock/movements", requireAuth(), async (req, res) => {
  const productId = req.query.productId ? Number(req.query.productId) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 200;
  const rows = await db
    .select({
      m: stockMovements,
      productName: products.name,
      userName: users.fullName,
    })
    .from(stockMovements)
    .leftJoin(products, eq(stockMovements.productId, products.id))
    .leftJoin(users, eq(stockMovements.userId, users.id))
    .where(productId ? eq(stockMovements.productId, productId) : undefined)
    .orderBy(desc(stockMovements.createdAt))
    .limit(limit);
  res.json(
    rows.map((r) => ({
      id: r.m.id,
      productId: r.m.productId,
      productName: r.productName ?? "Unknown",
      type: r.m.type,
      quantity: r.m.quantity,
      note: r.m.note,
      userId: r.m.userId,
      userName: r.userName,
      createdAt: r.m.createdAt.toISOString(),
    })),
  );
});

router.post(
  "/stock/movements",
  requireAuth(["admin", "manager"]),
  async (req, res) => {
    const parsed = CreateStockMovementBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const d = parsed.data;
    const [m] = await db
      .insert(stockMovements)
      .values({
        productId: d.productId,
        type: d.type,
        quantity: d.quantity,
        note: d.note ?? null,
        userId: req.auth!.userId,
      })
      .returning();
    // Update product stock
    let delta = 0;
    if (d.type === "IN") delta = d.quantity;
    else if (d.type === "OUT") delta = -d.quantity;
    else if (d.type === "ADJUST") {
      // ADJUST sets to value
      await db
        .update(products)
        .set({ stockQty: d.quantity, updatedAt: new Date() })
        .where(eq(products.id, d.productId));
      delta = 0;
    }
    if (delta !== 0) {
      await db
        .update(products)
        .set({
          stockQty: sql`${products.stockQty} + ${delta}`,
          updatedAt: new Date(),
        })
        .where(eq(products.id, d.productId));
    }
    const [p] = await db.select().from(products).where(eq(products.id, d.productId));
    res.json({
      id: m.id,
      productId: m.productId,
      productName: p?.name ?? "",
      type: m.type,
      quantity: m.quantity,
      note: m.note,
      userId: m.userId,
      userName: req.auth!.fullName,
      createdAt: m.createdAt.toISOString(),
    });
  },
);

export default router;
