const QUEUE_KEY = "pending-sales";
const PRODUCTS_KEY = "cached-products";

export interface OfflineSalePayload {
  items: { productId: number; quantity: number; unitPrice: number }[];
  discount: number;
  tax: number;
  paymentMethod: string;
  amountPaid: number;
  customerName?: string | null;
}

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

export function cacheProducts(products: unknown[]) {
  try {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  } catch {
    /* ignore */
  }
}

export function getCachedProducts<T = unknown>(): T[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}
