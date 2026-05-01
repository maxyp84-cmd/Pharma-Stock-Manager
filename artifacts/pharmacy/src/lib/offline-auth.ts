const APP_SALT = "medistock-gh-2025";
const CREDENTIALS_KEY = "medistock_offline_credentials";
const ACTIVE_USER_KEY = "medistock_offline_user";

export interface OfflineProfile {
  id: number;
  username: string;
  fullName: string;
  role: string;
  branchId: number | null;
  branchName: string | null;
}

interface StoredEntry {
  hash: string;
  profile: OfflineProfile;
}

async function deriveHash(username: string, password: string): Promise<string> {
  const raw = `${APP_SALT}:${username.toLowerCase()}:${password}`;
  const encoded = new TextEncoder().encode(raw);
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function readStore(): Record<string, StoredEntry> {
  try {
    return JSON.parse(localStorage.getItem(CREDENTIALS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export async function cacheCredentials(
  username: string,
  password: string,
  profile: OfflineProfile,
): Promise<void> {
  const hash = await deriveHash(username, password);
  const store = readStore();
  store[username.toLowerCase()] = { hash, profile };
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(store));
}

export async function offlineLogin(
  username: string,
  password: string,
): Promise<OfflineProfile | null> {
  const store = readStore();
  const entry = store[username.toLowerCase()];
  if (!entry) return null;
  const hash = await deriveHash(username, password);
  if (hash !== entry.hash) return null;
  return entry.profile;
}

export function setActiveOfflineUser(profile: OfflineProfile): void {
  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(profile));
}

export function getActiveOfflineUser(): OfflineProfile | null {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_KEY);
    return raw ? (JSON.parse(raw) as OfflineProfile) : null;
  } catch {
    return null;
  }
}

export function clearActiveOfflineUser(): void {
  localStorage.removeItem(ACTIVE_USER_KEY);
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) return true;
  const anyErr = err as any;
  if (anyErr?.code === "ECONNREFUSED" || anyErr?.status === 0) return true;
  return !navigator.onLine;
}
