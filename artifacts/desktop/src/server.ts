import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getDb } from "./db";
import {
  hashPassword, verifyPassword, createSessionSync,
  deleteSessionSync, requireAuth,
} from "./auth";
import { seedIfEmpty } from "./seed";

/** Cast unknown to a SQLite-acceptable value (node:sqlite SQLInputValue). */
type S = string | number | bigint | null | Uint8Array;
const v = (x: unknown): S => (x === undefined ? null : (x as S));

export function createApp(frontendPath: string) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.static(frontendPath));

  // ── Health ────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => res.json({ ok: true, mode: "desktop-sqlite" }));

  // ── Auth ─────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) { res.status(400).json({ error: "Missing credentials" }); return; }
    const db = getDb();
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND active = 1").get(username.toLowerCase()) as Record<string, unknown> | null;
    if (!user) { res.status(401).json({ error: "Invalid credentials" }); return; }
    const ok = await verifyPassword(password, user.password_hash as string);
    if (!ok) { res.status(401).json({ error: "Invalid credentials" }); return; }
    const sid = createSessionSync(user.id as number);
    res.cookie("pharm_session", sid, { httpOnly: true, sameSite: "lax", maxAge: 30 * 24 * 3600 * 1000 });
    const branch = user.branch_id ? db.prepare("SELECT name FROM branches WHERE id = ?").get(v(user.branch_id)) as { name: string } | null : null;
    res.json({ id: user.id, username: user.username, fullName: user.full_name, role: user.role, branchId: user.branch_id, branchName: branch?.name ?? null });
  });

  app.post("/api/auth/logout", (req, res) => {
    const sid = req.cookies?.pharm_session;
    if (sid) deleteSessionSync(sid);
    res.clearCookie("pharm_session");
    res.json({ ok: true });
  });

  app.get("/api/auth/me", requireAuth(), (req, res) => {
    const db = getDb();
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.auth!.userId) as Record<string, unknown> | null;
    if (!user) { res.status(401).json({ error: "Not found" }); return; }
    const branch = user.branch_id ? db.prepare("SELECT name FROM branches WHERE id = ?").get(v(user.branch_id)) as { name: string } | null : null;
    res.json({ id: user.id, username: user.username, fullName: user.full_name, role: user.role, branchId: user.branch_id, branchName: branch?.name ?? null });
  });

  // ── Users ─────────────────────────────────────────────────────
  app.get("/api/users", requireAuth(["admin"]), (_req, res) => {
    const db = getDb();
    const rows = db.prepare("SELECT id, username, full_name, role, branch_id, active, created_at FROM users ORDER BY full_name").all() as object[];
    res.json(rows);
  });

  app.post("/api/users", requireAuth(["admin"]), async (req, res) => {
    const { username, password, fullName, role, branchId } = req.body;
    const db = getDb();
    const hash = await hashPassword(password);
    const result = db.prepare("INSERT INTO users (username, password_hash, full_name, role, branch_id) VALUES (?,?,?,?,?) RETURNING id, username, full_name, role, branch_id, active, created_at").get(username.toLowerCase(), hash, fullName, role, branchId ?? null);
    res.json(result);
  });

  app.put("/api/users/:id", requireAuth(["admin"]), async (req, res) => {
    const db = getDb();
    const id = Number(req.params.id);
    const { fullName, role, branchId, active, password } = req.body;
    if (password) {
      const hash = await hashPassword(password);
      db.prepare("UPDATE users SET full_name=?, role=?, branch_id=?, active=?, password_hash=? WHERE id=?").run(fullName, role, branchId, active ? 1 : 0, hash, id);
    } else {
      db.prepare("UPDATE users SET full_name=?, role=?, branch_id=?, active=? WHERE id=?").run(fullName, role, branchId, active ? 1 : 0, id);
    }
    const u = db.prepare("SELECT id, username, full_name, role, branch_id, active, created_at FROM users WHERE id=?").get(id);
    if (!u) { res.status(404).json({ error: "Not found" }); return; }
    res.json(u);
  });

  app.delete("/api/users/:id", requireAuth(["admin"]), (req, res) => {
    getDb().prepare("DELETE FROM users WHERE id=?").run(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Branches ──────────────────────────────────────────────────
  app.get("/api/branches", requireAuth(), (_req, res) => {
    res.json(getDb().prepare("SELECT * FROM branches ORDER BY name").all());
  });
  app.post("/api/branches", requireAuth(["admin"]), (req, res) => {
    const { name, address, phone } = req.body;
    const r = getDb().prepare("INSERT INTO branches (name, address, phone) VALUES (?,?,?) RETURNING *").get(name, address ?? null, phone ?? null);
    res.json(r);
  });
  app.put("/api/branches/:id", requireAuth(["admin"]), (req, res) => {
    const { name, address, phone } = req.body;
    getDb().prepare("UPDATE branches SET name=?, address=?, phone=? WHERE id=?").run(name, address ?? null, phone ?? null, Number(req.params.id));
    res.json(getDb().prepare("SELECT * FROM branches WHERE id=?").get(Number(req.params.id)));
  });
  app.delete("/api/branches/:id", requireAuth(["admin"]), (req, res) => {
    getDb().prepare("DELETE FROM branches WHERE id=?").run(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Categories ────────────────────────────────────────────────
  app.get("/api/categories", requireAuth(), (_req, res) => {
    res.json(getDb().prepare("SELECT * FROM categories ORDER BY name").all());
  });
  app.post("/api/categories", requireAuth(["admin", "manager"]), (req, res) => {
    const r = getDb().prepare("INSERT INTO categories (name) VALUES (?) RETURNING *").get(req.body.name);
    res.json(r);
  });
  app.put("/api/categories/:id", requireAuth(["admin", "manager"]), (req, res) => {
    getDb().prepare("UPDATE categories SET name=? WHERE id=?").run(req.body.name, Number(req.params.id));
    res.json(getDb().prepare("SELECT * FROM categories WHERE id=?").get(Number(req.params.id)));
  });
  app.delete("/api/categories/:id", requireAuth(["admin", "manager"]), (req, res) => {
    getDb().prepare("DELETE FROM categories WHERE id=?").run(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Suppliers ─────────────────────────────────────────────────
  app.get("/api/suppliers", requireAuth(), (_req, res) => {
    res.json(getDb().prepare("SELECT * FROM suppliers ORDER BY name").all());
  });
  app.post("/api/suppliers", requireAuth(["admin", "manager"]), (req, res) => {
    const { name, contactName, phone, email, address } = req.body;
    const r = getDb().prepare("INSERT INTO suppliers (name, contact_name, phone, email, address) VALUES (?,?,?,?,?) RETURNING *").get(name, contactName ?? null, phone ?? null, email ?? null, address ?? null);
    res.json(r);
  });
  app.put("/api/suppliers/:id", requireAuth(["admin", "manager"]), (req, res) => {
    const { name, contactName, phone, email, address } = req.body;
    getDb().prepare("UPDATE suppliers SET name=?, contact_name=?, phone=?, email=?, address=? WHERE id=?").run(name, contactName ?? null, phone ?? null, email ?? null, address ?? null, Number(req.params.id));
    res.json(getDb().prepare("SELECT * FROM suppliers WHERE id=?").get(Number(req.params.id)));
  });
  app.delete("/api/suppliers/:id", requireAuth(["admin", "manager"]), (req, res) => {
    getDb().prepare("DELETE FROM suppliers WHERE id=?").run(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Products ──────────────────────────────────────────────────
  const productSql = `
    SELECT p.*, c.name AS category_name, s.name AS supplier_name, b.name AS branch_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN branches b ON p.branch_id = b.id
  `;
  function mapProd(p: Record<string, unknown>) {
    return { id: p.id, name: p.name, barcode: p.barcode, sku: p.sku, categoryId: p.category_id, categoryName: p.category_name, supplierId: p.supplier_id, supplierName: p.supplier_name, branchId: p.branch_id, branchName: p.branch_name, unit: p.unit, costPrice: p.cost_price, sellPrice: p.sell_price, stockQty: p.stock_qty, reorderLevel: p.reorder_level, expiryDate: p.expiry_date, batchNumber: p.batch_number, description: p.description, createdAt: p.created_at, updatedAt: p.updated_at };
  }

  app.get("/api/products", requireAuth(), (_req, res) => {
    res.json((getDb().prepare(productSql + " ORDER BY p.name").all() as Record<string, unknown>[]).map(mapProd));
  });
  app.get("/api/products/low-stock", requireAuth(), (_req, res) => {
    res.json((getDb().prepare(productSql + " WHERE p.stock_qty <= p.reorder_level ORDER BY p.name").all() as Record<string, unknown>[]).map(mapProd));
  });
  app.get("/api/products/expiring", requireAuth(), (_req, res) => {
    const today = new Date().toISOString().slice(0,10);
    const cutoff = new Date(Date.now() + 60*24*3600*1000).toISOString().slice(0,10);
    res.json((getDb().prepare(productSql + " WHERE p.expiry_date IS NOT NULL AND p.expiry_date >= ? AND p.expiry_date <= ? ORDER BY p.expiry_date").all(today, cutoff) as Record<string, unknown>[]).map(mapProd));
  });
  app.get("/api/products/:id", requireAuth(), (req, res) => {
    const r = getDb().prepare(productSql + " WHERE p.id = ?").get(Number(req.params.id)) as Record<string, unknown> | null;
    if (!r) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mapProd(r));
  });
  app.post("/api/products", requireAuth(["admin", "manager"]), (req, res) => {
    const { name, barcode, sku, categoryId, supplierId, branchId, unit, costPrice, sellPrice, stockQty, reorderLevel, expiryDate, batchNumber, description } = req.body;
    const result = getDb().prepare("INSERT INTO products (name,barcode,sku,category_id,supplier_id,branch_id,unit,cost_price,sell_price,stock_qty,reorder_level,expiry_date,batch_number,description) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id").get(name, barcode ?? null, sku ?? null, categoryId ?? null, supplierId ?? null, branchId ?? null, unit ?? null, costPrice ?? 0, sellPrice ?? 0, stockQty ?? 0, reorderLevel ?? 10, expiryDate ?? null, batchNumber ?? null, description ?? null) as { id: number };
    const r = getDb().prepare(productSql + " WHERE p.id=?").get(result.id) as Record<string, unknown>;
    res.json(mapProd(r));
  });
  app.put("/api/products/:id", requireAuth(["admin", "manager"]), (req, res) => {
    const id = Number(req.params.id);
    const { name, barcode, sku, categoryId, supplierId, branchId, unit, costPrice, sellPrice, stockQty, reorderLevel, expiryDate, batchNumber, description } = req.body;
    getDb().prepare("UPDATE products SET name=?,barcode=?,sku=?,category_id=?,supplier_id=?,branch_id=?,unit=?,cost_price=?,sell_price=?,stock_qty=?,reorder_level=?,expiry_date=?,batch_number=?,description=?,updated_at=datetime('now') WHERE id=?").run(name, barcode ?? null, sku ?? null, categoryId ?? null, supplierId ?? null, branchId ?? null, unit ?? null, costPrice ?? 0, sellPrice ?? 0, stockQty ?? 0, reorderLevel ?? 10, expiryDate ?? null, batchNumber ?? null, description ?? null, id);
    const r = getDb().prepare(productSql + " WHERE p.id=?").get(id) as Record<string, unknown> | null;
    if (!r) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mapProd(r));
  });
  app.delete("/api/products/:id", requireAuth(["admin", "manager"]), (req, res) => {
    getDb().prepare("DELETE FROM products WHERE id=?").run(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Stock Movements ───────────────────────────────────────────
  app.get("/api/stock-movements", requireAuth(), (req, res) => {
    const pid = req.query.productId ? Number(req.query.productId) : null;
    const rows = pid
      ? getDb().prepare("SELECT sm.*, u.full_name AS user_name FROM stock_movements sm LEFT JOIN users u ON sm.user_id=u.id WHERE sm.product_id=? ORDER BY sm.created_at DESC LIMIT 200").all(pid)
      : getDb().prepare("SELECT sm.*, u.full_name AS user_name FROM stock_movements sm LEFT JOIN users u ON sm.user_id=u.id ORDER BY sm.created_at DESC LIMIT 200").all();
    res.json(rows);
  });
  app.post("/api/stock-movements", requireAuth(["admin", "manager"]), (req, res) => {
    const { productId, type, quantity, note } = req.body;
    const db = getDb();
    const p = db.prepare("SELECT id FROM products WHERE id=?").get(productId);
    if (!p) { res.status(400).json({ error: "Product not found" }); return; }
    const delta = type === "OUT" ? -Math.abs(quantity) : Math.abs(quantity);
    db.prepare("UPDATE products SET stock_qty = stock_qty + ?, updated_at=datetime('now') WHERE id=?").run(delta, productId);
    const sm = db.prepare("INSERT INTO stock_movements (product_id, type, quantity, note, user_id) VALUES (?,?,?,?,?) RETURNING *").get(productId, type, Math.abs(quantity), note ?? null, req.auth!.userId);
    res.json(sm);
  });

  // ── Sales ─────────────────────────────────────────────────────
  app.get("/api/sales", requireAuth(), (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const from = typeof req.query.from === "string" ? req.query.from : null;
    const to = typeof req.query.to === "string" ? req.query.to : null;
    const db = getDb();
    let q = "SELECT s.*, u.full_name AS cashier_name, b.name AS branch_name FROM sales s LEFT JOIN users u ON s.cashier_id=u.id LEFT JOIN branches b ON s.branch_id=b.id WHERE 1=1";
    const params: unknown[] = [];
    if (from) { q += " AND s.created_at >= ?"; params.push(from); }
    if (to) { q += " AND s.created_at <= ?"; params.push(to); }
    q += " ORDER BY s.created_at DESC LIMIT ?";
    params.push(limit);
    const salesRows = db.prepare(q).all(...params.map(v)) as Record<string, unknown>[];
    const ids = salesRows.map((r) => r.id as number);
    const items = ids.length ? db.prepare(`SELECT * FROM sale_items WHERE sale_id IN (${ids.map(() => "?").join(",")}) ORDER BY id`).all(...ids) as Record<string, unknown>[] : [];
    const grouped = new Map<number, Record<string, unknown>[]>();
    for (const it of items) { const a = grouped.get(it.sale_id as number) ?? []; a.push(it); grouped.set(it.sale_id as number, a); }
    res.json(salesRows.map((r) => ({ id: r.id, receiptNumber: r.receipt_number, subtotal: r.subtotal, discount: r.discount, tax: r.tax, total: r.total, profit: r.profit, paymentMethod: r.payment_method, amountPaid: r.amount_paid, change: r.change, cashierId: r.cashier_id, cashierName: r.cashier_name, branchId: r.branch_id, branchName: r.branch_name, customerName: r.customer_name, createdAt: r.created_at, items: (grouped.get(r.id as number) ?? []).map((it) => ({ id: it.id, productId: it.product_id, productName: it.product_name, quantity: it.quantity, unitPrice: it.unit_price, costPrice: it.cost_price, lineTotal: it.line_total })) })));
  });

  app.post("/api/sales", requireAuth(), (req, res) => {
    const { items, discount = 0, tax = 0, paymentMethod, amountPaid, customerName } = req.body;
    if (!items?.length) { res.status(400).json({ error: "No items" }); return; }
    const db = getDb();
    const pids = [...new Set(items.map((i: Record<string, unknown>) => i.productId))] as number[];
    const productRows = db.prepare(`SELECT * FROM products WHERE id IN (${pids.map(() => "?").join(",")})`).all(...pids) as Record<string, unknown>[];
    const pmap = new Map(productRows.map((p) => [p.id as number, p]));
    let subtotal = 0, costTotal = 0;
    const lineRows: Record<string, unknown>[] = [];
    for (const item of items) {
      const p = pmap.get(item.productId as number);
      if (!p) { res.status(400).json({ error: `Product ${item.productId} not found` }); return; }
      const lineTotal = (item.quantity as number) * (item.unitPrice as number);
      subtotal += lineTotal;
      costTotal += (p.cost_price as number) * (item.quantity as number);
      lineRows.push({ productId: p.id, productName: p.name, quantity: item.quantity, unitPrice: item.unitPrice, costPrice: p.cost_price, lineTotal });
    }
    const total = Math.max(0, subtotal - discount + tax);
    const profit = total - costTotal - tax;
    const change = Math.max(0, amountPaid - total);
    const d = new Date();
    const receiptNumber = `RCP-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const sale = db.prepare("INSERT INTO sales (receipt_number,subtotal,discount,tax,total,profit,payment_method,amount_paid,change,cashier_id,branch_id,customer_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *").get(receiptNumber, subtotal, discount, tax, total, profit, paymentMethod, amountPaid, change, req.auth!.userId, req.auth!.branchId, customerName ?? null) as Record<string, unknown>;
    const insertedItems = [];
    for (const l of lineRows) {
      const it = db.prepare("INSERT INTO sale_items (sale_id,product_id,product_name,quantity,unit_price,cost_price,line_total) VALUES (?,?,?,?,?,?,?) RETURNING *").get(v(sale.id), v(l.productId), v(l.productName), v(l.quantity), v(l.unitPrice), v(l.costPrice), v(l.lineTotal)) as Record<string, unknown>;
      insertedItems.push({ id: it.id, productId: it.product_id, productName: it.product_name, quantity: it.quantity, unitPrice: it.unit_price, costPrice: it.cost_price, lineTotal: it.line_total });
      db.prepare("UPDATE products SET stock_qty=stock_qty-?,updated_at=datetime('now') WHERE id=?").run(v(l.quantity), v(l.productId));
      db.prepare("INSERT INTO stock_movements (product_id,type,quantity,note,user_id) VALUES (?,?,?,?,?)").run(v(l.productId), "SALE", v(l.quantity), `Receipt ${receiptNumber}`, req.auth!.userId);
    }
    const branch = req.auth!.branchId ? db.prepare("SELECT name FROM branches WHERE id=?").get(req.auth!.branchId) as { name: string } | null : null;
    res.json({ id: sale.id, receiptNumber: sale.receipt_number, subtotal: sale.subtotal, discount: sale.discount, tax: sale.tax, total: sale.total, profit: sale.profit, paymentMethod: sale.payment_method, amountPaid: sale.amount_paid, change: sale.change, cashierId: sale.cashier_id, cashierName: req.auth!.fullName, branchId: sale.branch_id, branchName: branch?.name ?? null, customerName: sale.customer_name, createdAt: sale.created_at, items: insertedItems });
  });

  // ── Dashboard ─────────────────────────────────────────────────
  // SQLite stores datetime('now') as "YYYY-MM-DD HH:MM:SS" (space, not T).
  // We must compare using the same format.
  function sqliteTs(d: Date) { return d.toISOString().replace("T", " ").replace("Z", "").split(".")[0]; }

  app.get("/api/dashboard/summary", requireAuth(), (_req, res) => {
    const db = getDb();
    const startToday = new Date(); startToday.setHours(0,0,0,0);
    const startWeek = new Date(); startWeek.setDate(startWeek.getDate()-7); startWeek.setHours(0,0,0,0);
    const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0,0,0,0);
    const sum = (from: Date) => db.prepare("SELECT COALESCE(SUM(total),0) AS t, COALESCE(SUM(profit),0) AS p, COUNT(*) AS c FROM sales WHERE created_at >= ?").get(sqliteTs(from)) as { t: number; p: number; c: number };
    const today = sum(startToday), week = sum(startWeek), month = sum(startMonth);
    const pc = db.prepare("SELECT COUNT(*) AS c FROM products").get() as { c: number };
    const ls = db.prepare("SELECT COUNT(*) AS c FROM products WHERE stock_qty <= reorder_level").get() as { c: number };
    const cutoff = new Date(Date.now()+60*24*3600*1000).toISOString().slice(0,10);
    const todayStr = new Date().toISOString().slice(0,10);
    const exp = db.prepare("SELECT COUNT(*) AS c FROM products WHERE expiry_date IS NOT NULL AND expiry_date >= ? AND expiry_date <= ?").get(todayStr, cutoff) as { c: number };
    const sv = db.prepare("SELECT COALESCE(SUM(stock_qty*cost_price),0) AS v FROM products").get() as { v: number };
    res.json({ salesToday: today.t, salesWeek: week.t, salesMonth: month.t, profitToday: today.p, profitMonth: month.p, transactionsToday: today.c, productCount: pc.c, lowStockCount: ls.c, expiringSoonCount: exp.c, totalStockValue: sv.v });
  });

  app.get("/api/dashboard/sales-trend", requireAuth(), (req, res) => {
    const db = getDb();
    const days = req.query.days ? Number(req.query.days) : 14;
    const from = new Date(); from.setDate(from.getDate()-days+1); from.setHours(0,0,0,0);
    const rows = db.prepare("SELECT strftime('%Y-%m-%d',created_at) AS date, COALESCE(SUM(total),0) AS sales, COALESCE(SUM(profit),0) AS profit FROM sales WHERE created_at >= ? GROUP BY strftime('%Y-%m-%d',created_at) ORDER BY date").all(sqliteTs(from)) as { date: string; sales: number; profit: number }[];
    const map = new Map(rows.map((r) => [r.date, r]));
    const out = [];
    for (let i = 0; i < days; i++) { const d = new Date(from); d.setDate(d.getDate()+i); const key = d.toISOString().slice(0,10); const r = map.get(key); out.push({ date: key, sales: r?.sales ?? 0, profit: r?.profit ?? 0 }); }
    res.json(out);
  });

  app.get("/api/dashboard/top-products", requireAuth(), (req, res) => {
    const db = getDb();
    const limit = req.query.limit ? Number(req.query.limit) : 5;
    res.json(db.prepare("SELECT product_id AS productId, product_name AS productName, SUM(quantity) AS quantitySold, SUM(line_total) AS revenue FROM sale_items GROUP BY product_id, product_name ORDER BY SUM(quantity) DESC LIMIT ?").all(limit));
  });

  // ── Closing Report ────────────────────────────────────────────
  app.get("/api/reports/closing", requireAuth(), (req, res) => {
    const db = getDb();
    const dateParam = typeof req.query.date === "string" ? req.query.date : new Date().toISOString().slice(0,10);
    const start = `${dateParam} 00:00:00`, end = `${dateParam} 23:59:59`;
    const tot = db.prepare("SELECT COUNT(*) AS transactions, COALESCE(SUM(subtotal),0) AS subtotal, COALESCE(SUM(discount),0) AS discount, COALESCE(SUM(tax),0) AS tax, COALESCE(SUM(total),0) AS total, COALESCE(SUM(profit),0) AS profit, COALESCE(SUM(amount_paid),0) AS amount_paid FROM sales WHERE created_at BETWEEN ? AND ?").get(start, end) as Record<string, number>;
    const pay = db.prepare("SELECT payment_method AS method, COUNT(*) AS count, COALESCE(SUM(total),0) AS total, COALESCE(SUM(amount_paid),0) AS collected FROM sales WHERE created_at BETWEEN ? AND ? GROUP BY payment_method ORDER BY SUM(total) DESC").all(start, end);
    const cashiers = db.prepare("SELECT u.full_name AS cashierName, COUNT(*) AS transactions, COALESCE(SUM(s.total),0) AS total, COALESCE(SUM(s.profit),0) AS profit FROM sales s LEFT JOIN users u ON s.cashier_id=u.id WHERE s.created_at BETWEEN ? AND ? GROUP BY s.cashier_id ORDER BY SUM(s.total) DESC").all(start, end);
    const items = db.prepare("SELECT si.product_name AS productName, SUM(si.quantity) AS qty, SUM(si.line_total) AS revenue, SUM((si.unit_price-si.cost_price)*si.quantity) AS profit FROM sale_items si JOIN sales s ON si.sale_id=s.id WHERE s.created_at BETWEEN ? AND ? GROUP BY si.product_name ORDER BY SUM(si.quantity) DESC LIMIT 10").all(start, end);
    const branch = req.auth!.branchId ? db.prepare("SELECT name FROM branches WHERE id=?").get(req.auth!.branchId) as { name: string } | null : null;
    res.json({ date: dateParam, branchName: branch?.name ?? null, reportGeneratedAt: new Date().toISOString(), generatedBy: req.auth!.fullName, totals: { transactions: tot.transactions, subtotal: tot.subtotal, discount: tot.discount, tax: tot.tax, total: tot.total, profit: tot.profit, amountCollected: tot.amount_paid }, paymentBreakdown: pay, cashierBreakdown: cashiers, topItems: items });
  });

  // ── SPA fallback ──────────────────────────────────────────────
  app.get("/{*splat}", (_req, res) => {
    const idx = path.join(frontendPath, "index.html");
    if (fs.existsSync(idx)) res.sendFile(idx);
    else res.status(200).send(`<html><body style="font-family:sans-serif;padding:40px"><h2>MediStock Desktop</h2><p>Frontend not built yet. The server is running at port shown above.</p><p>Run <code>npm run build</code> to bundle the frontend.</p></body></html>`);
  });

  return app;
}

export async function startServer(frontendPath: string, port = 3000): Promise<number> {
  await seedIfEmpty();
  const app = createApp(frontendPath);
  return new Promise<number>((resolve, reject) => {
    const server = app.listen(port, "127.0.0.1", () => resolve(port));
    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        startServer(frontendPath, port + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}
