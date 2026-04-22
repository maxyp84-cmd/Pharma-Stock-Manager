import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  date,
  index,
} from "drizzle-orm/pg-core";

export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(), // 'admin' | 'manager' | 'cashier'
  branchId: integer("branch_id"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    barcode: text("barcode"),
    sku: text("sku"),
    categoryId: integer("category_id"),
    supplierId: integer("supplier_id"),
    branchId: integer("branch_id"),
    unit: text("unit"),
    costPrice: numeric("cost_price", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    sellPrice: numeric("sell_price", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    stockQty: integer("stock_qty").notNull().default(0),
    reorderLevel: integer("reorder_level").notNull().default(10),
    expiryDate: date("expiry_date"),
    batchNumber: text("batch_number"),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    barcodeIdx: index("products_barcode_idx").on(t.barcode),
  }),
);

export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  type: text("type").notNull(), // 'IN' | 'OUT' | 'ADJUST' | 'SALE'
  quantity: integer("quantity").notNull(),
  note: text("note"),
  userId: integer("user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  receiptNumber: text("receipt_number").notNull().unique(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  profit: numeric("profit", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  paymentMethod: text("payment_method").notNull(),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull(),
  change: numeric("change", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  cashierId: integer("cashier_id"),
  branchId: integer("branch_id"),
  customerName: text("customer_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
});
