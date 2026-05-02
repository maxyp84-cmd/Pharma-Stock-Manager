const QUEUE_KEY = "pending-sales";
const PRODUCTS_KEY = "cached-products";
const SALES_KEY = "cached-sales";
const MOVEMENTS_KEY = "cached-stock-movements";
const LOW_STOCK_KEY = "cached-low-stock";
const EXPIRING_KEY = "cached-expiring";

export interface OfflineSalePayload {
  items: { productId: number; quantity: number; unitPrice: number }[];
  discount: number;
  tax: number;
  paymentMethod: string;
  amountPaid: number;
  customerName?: string | null;
}

// ── Pending sale queue ────────────────────────────────────────

export function getOfflineSales(): OfflineSalePayload[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueSaleOffline(sale: OfflineSalePayload) {
  const current = getOfflineSales();
  current.push(sale);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(current));
}

export function clearOfflineSales() {
  localStorage.removeItem(QUEUE_KEY);
}

export async function drainOfflineQueue(): Promise<number> {
  const sales = getOfflineSales();
  if (sales.length === 0) return 0;
  const remaining: OfflineSalePayload[] = [];
  let success = 0;
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  for (const sale of sales) {
    try {
      const res = await fetch(`${base}/api/sales`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sale),
      });
      if (!res.ok) throw new Error(String(res.status));
      success++;
    } catch {
      remaining.push(sale);
    }
  }
  if (remaining.length) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  } else {
    clearOfflineSales();
  }
  return success;
}

// ── Generic localStorage cache helpers ───────────────────────

function saveCache<T>(key: string, data: T[]) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota */ }
}

function loadCache<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

// ── Products ──────────────────────────────────────────────────

export function cacheProducts(products: unknown[]) {
  saveCache(PRODUCTS_KEY, products);
}

export function getCachedProducts<T = unknown>(): T[] {
  return loadCache<T>(PRODUCTS_KEY);
}

// ── Sales ─────────────────────────────────────────────────────

export function cacheSales(sales: unknown[]) {
  saveCache(SALES_KEY, sales);
}

export function getCachedSales<T = unknown>(): T[] {
  return loadCache<T>(SALES_KEY);
}

// ── Stock movements ───────────────────────────────────────────

export function cacheStockMovements(movements: unknown[]) {
  saveCache(MOVEMENTS_KEY, movements);
}

export function getCachedStockMovements<T = unknown>(): T[] {
  return loadCache<T>(MOVEMENTS_KEY);
}

// ── Low stock ─────────────────────────────────────────────────

export function cacheLowStock(products: unknown[]) {
  saveCache(LOW_STOCK_KEY, products);
}

export function getCachedLowStock<T = unknown>(): T[] {
  return loadCache<T>(LOW_STOCK_KEY);
}

// ── Expiring ──────────────────────────────────────────────────

export function cacheExpiring(products: unknown[]) {
  saveCache(EXPIRING_KEY, products);
}

export function getCachedExpiring<T = unknown>(): T[] {
  return loadCache<T>(EXPIRING_KEY);
}
