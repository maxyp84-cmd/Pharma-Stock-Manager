import { Router, type IRouter } from "express";
import { db, sales, saleItems, users, branches } from "@workspace/db";
import { and, gte, lt, eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/reports/closing", requireAuth(), async (req, res) => {
  const dateParam =
    typeof req.query.date === "string" ? req.query.date : null;

  // Determine the day window in local time (Africa/Accra = UTC+0)
  const day = dateParam ? new Date(dateParam) : new Date();
  const start = new Date(day);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const cond = and(gte(sales.createdAt, start), lt(sales.createdAt, end));

  // ── Overall totals ─────────────────────────────────────────────
  const [totRow] = await db
    .select({
      transactions: sql<string>`COUNT(*)`,
      subtotal: sql<string>`COALESCE(SUM(${sales.subtotal}), 0)`,
      discount: sql<string>`COALESCE(SUM(${sales.discount}), 0)`,
      tax: sql<string>`COALESCE(SUM(${sales.tax}), 0)`,
      total: sql<string>`COALESCE(SUM(${sales.total}), 0)`,
      profit: sql<string>`COALESCE(SUM(${sales.profit}), 0)`,
      amountPaid: sql<string>`COALESCE(SUM(${sales.amountPaid}), 0)`,
    })
    .from(sales)
    .where(cond);

  // ── Payment method breakdown ────────────────────────────────────
  const payRows = await db
    .select({
      method: sales.paymentMethod,
      count: sql<string>`COUNT(*)`,
      total: sql<string>`COALESCE(SUM(${sales.total}), 0)`,
      collected: sql<string>`COALESCE(SUM(${sales.amountPaid}), 0)`,
    })
    .from(sales)
    .where(cond)
    .groupBy(sales.paymentMethod)
    .orderBy(sql`SUM(${sales.total}) DESC`);

  // ── Cashier breakdown ──────────────────────────────────────────
  const cashierRows = await db
    .select({
      cashierId: sales.cashierId,
      cashierName: users.fullName,
      transactions: sql<string>`COUNT(*)`,
      total: sql<string>`COALESCE(SUM(${sales.total}), 0)`,
      profit: sql<string>`COALESCE(SUM(${sales.profit}), 0)`,
    })
    .from(sales)
    .leftJoin(users, eq(sales.cashierId, users.id))
    .where(cond)
    .groupBy(sales.cashierId, users.fullName)
    .orderBy(sql`SUM(${sales.total}) DESC`);

  // ── Top items sold ─────────────────────────────────────────────
  const itemRows = await db
    .select({
      productName: saleItems.productName,
      qty: sql<string>`SUM(${saleItems.quantity})`,
      revenue: sql<string>`SUM(${saleItems.lineTotal})`,
      profit: sql<string>`SUM((${saleItems.unitPrice} - ${saleItems.costPrice}) * ${saleItems.quantity})`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(cond)
    .groupBy(saleItems.productName)
    .orderBy(sql`SUM(${saleItems.quantity}) DESC`)
    .limit(10);

  // ── Branch name ────────────────────────────────────────────────
  let branchName: string | null = null;
  if (req.auth!.branchId) {
    const [b] = await db
      .select()
      .from(branches)
      .where(eq(branches.id, req.auth!.branchId));
    branchName = b?.name ?? null;
  }

  res.json({
    date: start.toISOString().slice(0, 10),
    branchName,
    reportGeneratedAt: new Date().toISOString(),
    generatedBy: req.auth!.fullName,
    totals: {
      transactions: Number(totRow.transactions),
      subtotal: Number(totRow.subtotal),
      discount: Number(totRow.discount),
      tax: Number(totRow.tax),
      total: Number(totRow.total),
      profit: Number(totRow.profit),
      amountCollected: Number(totRow.amountPaid),
    },
    paymentBreakdown: payRows.map((r) => ({
      method: r.method,
      count: Number(r.count),
      total: Number(r.total),
      collected: Number(r.collected),
    })),
    cashierBreakdown: cashierRows.map((r) => ({
      cashierName: r.cashierName ?? "Unknown",
      transactions: Number(r.transactions),
      total: Number(r.total),
      profit: Number(r.profit),
    })),
    topItems: itemRows.map((r) => ({
      productName: r.productName,
      qty: Number(r.qty),
      revenue: Number(r.revenue),
      profit: Number(r.profit),
    })),
  });
});

export default router;
