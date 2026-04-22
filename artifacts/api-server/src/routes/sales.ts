import { Router, type IRouter } from "express";
import { CreateSaleBody } from "@workspace/api-zod";
import {
  db,
  sales,
  saleItems,
  products,
  stockMovements,
  branches,
  users,
} from "@workspace/db";
import { desc, eq, gte, lte, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function generateReceiptNumber(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RCP-${stamp}-${rand}`;
}

router.get("/sales", requireAuth(), async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const from = typeof req.query.from === "string" ? new Date(req.query.from) : null;
  const to = typeof req.query.to === "string" ? new Date(req.query.to) : null;
  const conds = [];
  if (from && !Number.isNaN(from.getTime())) conds.push(gte(sales.createdAt, from));
  if (to && !Number.isNaN(to.getTime())) conds.push(lte(sales.createdAt, to));
  const rows = await db
    .select({
      s: sales,
      cashierName: users.fullName,
      branchName: branches.name,
    })
    .from(sales)
    .leftJoin(users, eq(sales.cashierId, users.id))
    .leftJoin(branches, eq(sales.branchId, branches.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(sales.createdAt))
    .limit(limit);

  const ids = rows.map((r) => r.s.id);
  const items = ids.length
    ? await db
        .select()
        .from(saleItems)
        .where(sql`${saleItems.saleId} IN ${ids}`)
    : [];
  const grouped = new Map<number, typeof items>();
  for (const it of items) {
    const arr = grouped.get(it.saleId) ?? [];
    arr.push(it);
    grouped.set(it.saleId, arr);
  }

  res.json(
    rows.map((r) => ({
      id: r.s.id,
      receiptNumber: r.s.receiptNumber,
      subtotal: Number(r.s.subtotal),
      discount: Number(r.s.discount),
      tax: Number(r.s.tax),
      total: Number(r.s.total),
      profit: Number(r.s.profit),
      paymentMethod: r.s.paymentMethod,
      amountPaid: Number(r.s.amountPaid),
      change: Number(r.s.change),
      cashierId: r.s.cashierId,
      cashierName: r.cashierName,
      branchId: r.s.branchId,
      branchName: r.branchName,
      customerName: r.s.customerName,
      createdAt: r.s.createdAt.toISOString(),
      items: (grouped.get(r.s.id) ?? []).map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        costPrice: Number(it.costPrice),
        lineTotal: Number(it.lineTotal),
      })),
    })),
  );
});

router.get("/sales/:id", requireAuth(), async (req, res) => {
  const id = Number(req.params.id);
  const [r] = await db
    .select({
      s: sales,
      cashierName: users.fullName,
      branchName: branches.name,
    })
    .from(sales)
    .leftJoin(users, eq(sales.cashierId, users.id))
    .leftJoin(branches, eq(sales.branchId, branches.id))
    .where(eq(sales.id, id));
  if (!r) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id));
  res.json({
    id: r.s.id,
    receiptNumber: r.s.receiptNumber,
    subtotal: Number(r.s.subtotal),
    discount: Number(r.s.discount),
    tax: Number(r.s.tax),
    total: Number(r.s.total),
    profit: Number(r.s.profit),
    paymentMethod: r.s.paymentMethod,
    amountPaid: Number(r.s.amountPaid),
    change: Number(r.s.change),
    cashierId: r.s.cashierId,
    cashierName: r.cashierName,
    branchId: r.s.branchId,
    branchName: r.branchName,
    customerName: r.s.customerName,
    createdAt: r.s.createdAt.toISOString(),
    items: items.map((it) => ({
      id: it.id,
      productId: it.productId,
      productName: it.productName,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      costPrice: Number(it.costPrice),
      lineTotal: Number(it.lineTotal),
    })),
  });
});

router.post("/sales", requireAuth(), async (req, res) => {
  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const d = parsed.data;
  if (!d.items.length) {
    res.status(400).json({ error: "No items" });
    return;
  }

  // Fetch product details for each line
  const productIds = [...new Set(d.items.map((i) => i.productId))];
  const productRows = productIds.length
    ? await db
        .select()
        .from(products)
        .where(sql`${products.id} IN ${productIds}`)
    : [];
  const productMap = new Map(productRows.map((p) => [p.id, p]));

  let subtotal = 0;
  let costTotal = 0;
  const lineRows: Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    lineTotal: number;
  }> = [];
  for (const item of d.items) {
    const p = productMap.get(item.productId);
    if (!p) {
      res.status(400).json({ error: `Product ${item.productId} not found` });
      return;
    }
    const lineTotal = item.quantity * item.unitPrice;
    const cost = Number(p.costPrice);
    subtotal += lineTotal;
    costTotal += cost * item.quantity;
    lineRows.push({
      productId: p.id,
      productName: p.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      costPrice: cost,
      lineTotal,
    });
  }
  const total = Math.max(0, subtotal - d.discount + d.tax);
  const profit = total - costTotal - d.tax;
  const change = Math.max(0, d.amountPaid - total);
  const receiptNumber = generateReceiptNumber();

  const [sale] = await db
    .insert(sales)
    .values({
      receiptNumber,
      subtotal: subtotal.toFixed(2),
      discount: d.discount.toFixed(2),
      tax: d.tax.toFixed(2),
      total: total.toFixed(2),
      profit: profit.toFixed(2),
      paymentMethod: d.paymentMethod,
      amountPaid: d.amountPaid.toFixed(2),
      change: change.toFixed(2),
      cashierId: req.auth!.userId,
      branchId: req.auth!.branchId,
      customerName: d.customerName ?? null,
    })
    .returning();

  const insertedItems = await db
    .insert(saleItems)
    .values(
      lineRows.map((l) => ({
        saleId: sale.id,
        productId: l.productId,
        productName: l.productName,
        quantity: l.quantity,
        unitPrice: l.unitPrice.toFixed(2),
        costPrice: l.costPrice.toFixed(2),
        lineTotal: l.lineTotal.toFixed(2),
      })),
    )
    .returning();

  // Decrement stock + record stock movements
  for (const l of lineRows) {
    await db
      .update(products)
      .set({
        stockQty: sql`${products.stockQty} - ${l.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, l.productId));
    await db.insert(stockMovements).values({
      productId: l.productId,
      type: "SALE",
      quantity: l.quantity,
      note: `Receipt ${receiptNumber}`,
      userId: req.auth!.userId,
    });
  }

  let branchName: string | null = null;
  if (req.auth!.branchId) {
    const [b] = await db
      .select()
      .from(branches)
      .where(eq(branches.id, req.auth!.branchId));
    branchName = b?.name ?? null;
  }

  res.json({
    id: sale.id,
    receiptNumber: sale.receiptNumber,
    subtotal: Number(sale.subtotal),
    discount: Number(sale.discount),
    tax: Number(sale.tax),
    total: Number(sale.total),
    profit: Number(sale.profit),
    paymentMethod: sale.paymentMethod,
    amountPaid: Number(sale.amountPaid),
    change: Number(sale.change),
    cashierId: sale.cashierId,
    cashierName: req.auth!.fullName,
    branchId: sale.branchId,
    branchName,
    customerName: sale.customerName,
    createdAt: sale.createdAt.toISOString(),
    items: insertedItems.map((it) => ({
      id: it.id,
      productId: it.productId,
      productName: it.productName,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      costPrice: Number(it.costPrice),
      lineTotal: Number(it.lineTotal),
    })),
  });
});

export default router;
