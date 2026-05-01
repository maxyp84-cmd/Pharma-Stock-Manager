/**
 * Type definitions for MediStock desktop database rows.
 * The schema is defined and created in db.ts using raw SQL (node:sqlite).
 */

export type Role = "admin" | "manager" | "cashier";
export type StockMovementType = "IN" | "OUT" | "ADJUST" | "SALE";

export interface Branch {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  role: Role;
  branch_id: number | null;
  active: number;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  barcode: string | null;
  sku: string | null;
  category_id: number | null;
  supplier_id: number | null;
  branch_id: number | null;
  unit: string | null;
  cost_price: number;
  sell_price: number;
  stock_qty: number;
  reorder_level: number;
  expiry_date: string | null;
  batch_number: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: number;
  receipt_number: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  profit: number;
  payment_method: string;
  amount_paid: number;
  change: number;
  cashier_id: number | null;
  branch_id: number | null;
  customer_name: string | null;
  created_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  line_total: number;
}

export interface StockMovement {
  id: number;
  product_id: number;
  type: StockMovementType;
  quantity: number;
  note: string | null;
  user_id: number | null;
  created_at: string;
}
