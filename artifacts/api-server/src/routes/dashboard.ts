import { Router, type IRouter } from "express";
import { db, sales, saleItems, products } from "@workspace/db";
import { gte, sql, desc, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth(), async (_req, res) => {
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startWeek = new Date(now);
  startWeek.setDate(startWeek.getDate() - 7);
  startWeek.setHours(0, 0, 0, 0);
  const startMonth = new Date(now);
  startMonth.setDate(1);
  startMonth.setHours(0, 0, 0, 0);

  async function sumRange(from: Date) {
    const [r] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${sales.total}), 0)`,
        profit: sql<string>`COALESCE(SUM(${sales.profit}), 0)`,
        count: sql<string>`COUNT(*)`,
      })
      .from(sales)
      .where(gte(sales.createdAt, from));
    return {
      total: Number(r.total),
      profit: Number(r.profit),
      count: Number(r.count),
    };
  }

  const today = await sumRange(startToday);
  const week = await sumRange(startWeek);
  const month = await sumRange(startMonth);

  const [pc] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(products);
  const [ls] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(products)
    .where(sql`${products.stockQty} <= ${products.reorderLevel}`);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 60);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const [exp] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(products)
    .where(
      sql`${products.expiryDate} IS NOT NULL AND ${products.expiryDate} <= ${cutoffStr}`,
    );
  const [stockVal] = await db
    .select({
      v: sql<string>`COALESCE(SUM(${products.stockQty} * ${products.costPrice}), 0)`,
    })
    .from(products);

  res.json({
    salesToday: today.total,
    salesWeek: week.total,
    salesMonth: month.total,
    profitToday: today.profit,
    profitMonth: month.profit,
    transactionsToday: today.count,
    productCount: Number(pc.count),
    lowStockCount: Number(ls.count),
    expiringSoonCount: Number(exp.count),
    totalStockValue: Number(stockVal.v),
  });
});

router.get("/dashboard/sales-trend", requireAuth(), async (req, res) => {
  const days = req.query.days ? Number(req.query.days) : 14;
  const from = new Date();
  from.setDate(from.getDate() - days + 1);
  from.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      date: sql<string>`TO_CHAR(${sales.createdAt}, 'YYYY-MM-DD')`,
      sales: sql<string>`COALESCE(SUM(${sales.total}), 0)`,
      profit: sql<string>`COALESCE(SUM(${sales.profit}), 0)`,
    })
    .from(sales)
    .where(gte(sales.createdAt, from))
    .groupBy(sql`TO_CHAR(${sales.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`TO_CHAR(${sales.createdAt}, 'YYYY-MM-DD')`);

  const map = new Map(rows.map((r) => [r.date, r]));
  const out: { date: string; sales: number; profit: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const r = map.get(key);
    out.push({
      date: key,
      sales: r ? Number(r.sales) : 0,
      profit: r ? Number(r.profit) : 0,
    });
  }
  res.json(out);
});

router.get("/dashboard/top-products", requireAuth(), async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const rows = await db
    .select({
      productId: saleItems.productId,
      productName: saleItems.productName,
      quantitySold: sql<string>`SUM(${saleItems.quantity})`,
      revenue: sql<string>`SUM(${saleItems.lineTotal})`,
    })
    .from(saleItems)
    .groupBy(saleItems.productId, saleItems.productName)
    .orderBy(desc(sql`SUM(${saleItems.quantity})`))
    .limit(limit);
  res.json(
    rows.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      quantitySold: Number(r.quantitySold),
      revenue: Number(r.revenue),
    })),
  );
});

// keep `eq` referenced (used elsewhere in tree)
void eq;

export default router;
