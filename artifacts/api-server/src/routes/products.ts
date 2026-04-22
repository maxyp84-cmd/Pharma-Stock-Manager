import { Router, type IRouter } from "express";
import { CreateProductBody, UpdateProductBody } from "@workspace/api-zod";
import {
  db,
  products,
  categories,
  suppliers,
  stockMovements,
} from "@workspace/db";
import { and, eq, lte, sql, gte, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function toProduct(
  p: typeof products.$inferSelect,
  categoryName: string | null,
  supplierName: string | null,
) {
  return {
    id: p.id,
    name: p.name,
    barcode: p.barcode,
    sku: p.sku,
    categoryId: p.categoryId,
    categoryName,
    supplierId: p.supplierId,
    supplierName,
    branchId: p.branchId,
    unit: p.unit,
    costPrice: Number(p.costPrice),
    sellPrice: Number(p.sellPrice),
    stockQty: p.stockQty,
    reorderLevel: p.reorderLevel,
    expiryDate: p.expiryDate,
    batchNumber: p.batchNumber,
    description: p.description,
  };
}

async function listWithJoins(filters: {
  search?: string;
  barcode?: string;
  branchId?: number;
}) {
  const conds = [];
  if (filters.barcode) conds.push(eq(products.barcode, filters.barcode));
  if (filters.branchId) conds.push(eq(products.branchId, filters.branchId));
  if (filters.search) {
    const s = `%${filters.search}%`;
    conds.push(sql`(${products.name} ILIKE ${s} OR ${products.barcode} ILIKE ${s} OR ${products.sku} ILIKE ${s})`);
  }
  const rows = await db
    .select({
      p: products,
      categoryName: categories.name,
      supplierName: suppliers.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(products.name));
  return rows.map((r) => toProduct(r.p, r.categoryName, r.supplierName));
}

router.get("/products", requireAuth(), async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const barcode = typeof req.query.barcode === "string" ? req.query.barcode : undefined;
  const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
  const list = await listWithJoins({ search, barcode, branchId });
  res.json(list);
});

router.get("/products/expiring", requireAuth(), async (req, res) => {
  const days = req.query.days ? Number(req.query.days) : 60;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const rows = await db
    .select({
      p: products,
      categoryName: categories.name,
      supplierName: suppliers.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(
      and(
        sql`${products.expiryDate} IS NOT NULL`,
        lte(products.expiryDate, cutoffStr),
      ),
    )
    .orderBy(asc(products.expiryDate));
  res.json(rows.map((r) => toProduct(r.p, r.categoryName, r.supplierName)));
});

router.get("/products/low-stock", requireAuth(), async (_req, res) => {
  const rows = await db
    .select({
      p: products,
      categoryName: categories.name,
      supplierName: suppliers.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(sql`${products.stockQty} <= ${products.reorderLevel}`)
    .orderBy(asc(products.stockQty));
  res.json(rows.map((r) => toProduct(r.p, r.categoryName, r.supplierName)));
});

router.get("/products/:id", requireAuth(), async (req, res) => {
  const id = Number(req.params.id);
  const [r] = await db
    .select({
      p: products,
      categoryName: categories.name,
      supplierName: suppliers.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(eq(products.id, id));
  if (!r) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(toProduct(r.p, r.categoryName, r.supplierName));
});

router.post("/products", requireAuth(["admin", "manager"]), async (req, res) => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const d = parsed.data;
  const [p] = await db
    .insert(products)
    .values({
      name: d.name,
      barcode: d.barcode ?? null,
      sku: d.sku ?? null,
      categoryId: d.categoryId ?? null,
      supplierId: d.supplierId ?? null,
      branchId: d.branchId ?? null,
      unit: d.unit ?? null,
      costPrice: String(d.costPrice),
      sellPrice: String(d.sellPrice),
      stockQty: d.stockQty,
      reorderLevel: d.reorderLevel,
      expiryDate: d.expiryDate ?? null,
      batchNumber: d.batchNumber ?? null,
      description: d.description ?? null,
    })
    .returning();
  if (d.stockQty > 0 && req.auth) {
    await db.insert(stockMovements).values({
      productId: p.id,
      type: "IN",
      quantity: d.stockQty,
      note: "Initial stock",
      userId: req.auth.userId,
    });
  }
  res.json(toProduct(p, null, null));
});

router.patch(
  "/products/:id",
  requireAuth(["admin", "manager"]),
  async (req, res) => {
    const id = Number(req.params.id);
    const parsed = UpdateProductBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const d = parsed.data;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (d.name !== undefined) updates.name = d.name;
    if (d.barcode !== undefined) updates.barcode = d.barcode;
    if (d.sku !== undefined) updates.sku = d.sku;
    if (d.categoryId !== undefined) updates.categoryId = d.categoryId;
    if (d.supplierId !== undefined) updates.supplierId = d.supplierId;
    if (d.branchId !== undefined) updates.branchId = d.branchId;
    if (d.unit !== undefined) updates.unit = d.unit;
    if (d.costPrice !== undefined) updates.costPrice = String(d.costPrice);
    if (d.sellPrice !== undefined) updates.sellPrice = String(d.sellPrice);
    if (d.stockQty !== undefined) updates.stockQty = d.stockQty;
    if (d.reorderLevel !== undefined) updates.reorderLevel = d.reorderLevel;
    if (d.expiryDate !== undefined) updates.expiryDate = d.expiryDate;
    if (d.batchNumber !== undefined) updates.batchNumber = d.batchNumber;
    if (d.description !== undefined) updates.description = d.description;
    const [p] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    if (!p) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(toProduct(p, null, null));
  },
);

router.delete(
  "/products/:id",
  requireAuth(["admin", "manager"]),
  async (req, res) => {
    const id = Number(req.params.id);
    await db.delete(products).where(eq(products.id, id));
    res.json({ ok: true });
  },
);

export { gte };
export default router;
