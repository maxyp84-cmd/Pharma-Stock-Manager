# MediStock — Pharmacy Management System

Full-stack production-ready pharmacy management system for retail pharmacies in Ghana. Built in the pnpm monorepo with React + Vite frontend and Express + Drizzle backend.

## Artifacts
- `artifacts/pharmacy` — React + Vite frontend (path `/`)
- `artifacts/api-server` — Express API (path `/api`)

## Stack
- Frontend: React, Vite, wouter, TanStack Query, Tailwind, shadcn/ui, recharts, sonner, lucide-react
- Backend: Express 5, Drizzle ORM, PostgreSQL (Replit DB), zod validation, custom cookie session auth (scrypt)
- API contract: `lib/api-spec/openapi.yaml` → orval-generated client + zod schemas

## Installable PWA (Desktop + Mobile)
MediStock ships as an installable Progressive Web App. After visiting the published URL in Chrome/Edge, the **Install App** button in the top bar (or the browser's address-bar install icon) installs it as a standalone desktop application — its own window, dock/taskbar icon, and full offline capability. On Android it installs to the home screen; on iOS users use Safari → Share → Add to Home Screen.

PWA stack:
- `vite-plugin-pwa` with `generateSW` strategy (Workbox)
- Web app manifest at `manifest.webmanifest` (theme `#1F7368`, standalone display)
- Icons: 192/512 PNG + maskable 512 + 180 apple-touch
- Service worker precaches the app shell (HTML/CSS/JS/fonts) and uses **NetworkFirst** for `/api/products`, `/api/categories`, `/api/suppliers`, `/api/branches`, `/api/dashboard` so cached data is shown when offline
- `InstallButton` component listens for `beforeinstallprompt` and shows "Installed" once the app is in standalone mode
- Posted sales already queue to localStorage when offline and drain on `online` event

## Features
- Cookie-based role auth (`cashier` / `manager` / `admin`); session table in Postgres
- Dashboard with KPIs, sales trend chart, top products, low-stock & expiring alerts
- POS with barcode scanning (Enter key auto-submit), cart, discount/tax, multi-payment
- Receipt dialog with Thermal (80mm) + A4 tabs and `window.print()` (CSS hidden via `@media print`)
- Product CRUD with category, supplier, branch, expiry tracking, stock levels
- Inventory: stock movements log + adjust dialog (IN/OUT/ADJUST/SALE)
- Suppliers, Categories, Branches, Users (admin only) CRUD
- Sales history with date filter and reprint
- Offline mode: failed sales queued in localStorage and drained on `online` event
- Ghana Cedis formatted via `formatGHS` (`₵1,234.50`)
- Apothecary teal palette (`--primary: 175 60% 30%`)

## Demo Credentials
Run seed once:
```bash
pnpm dlx tsx@latest artifacts/api-server/src/seed.ts
```
Then log in with:
- `admin / admin123`
- `manager / manager123`
- `cashier / cashier123`

## Desktop App (Electron + SQLite)
`artifacts/desktop/` is a standalone Electron app that runs 100% offline — no internet required.

### Architecture
- **Main process** (`src/main.ts`): Electron window + tray + menus. Forks the server process.
- **Server process** (`src/server-entry.ts`): Forked with `--experimental-sqlite`. Runs Express + `node:sqlite`.
- **SQLite layer** (`src/db.ts`): Uses built-in `node:sqlite` (Node.js 22.5+). No native compilation needed.
- **Auth** (`src/auth.ts`): scrypt passwords + session tokens stored in SQLite.
- **Server** (`src/server.ts`): All REST endpoints (auth, products, sales, dashboard, reports).
- **Seed** (`src/seed.ts`): Auto-seeds demo data on first run.

### Why `node:sqlite`?
Avoids native compilation (`node-gyp`/Python) required by `better-sqlite3`. The `--experimental-sqlite` flag is passed automatically via `fork()` in the Electron main process.

### Build & Package
```bash
cd artifacts/desktop
node build.mjs          # Build frontend + bundle Electron files with esbuild
electron-builder --win  # Package as NSIS installer (Windows)
electron-builder --mac  # Package as DMG (macOS)
electron-builder --linux # Package as AppImage + deb
```

### Demo users (auto-seeded on first run)
- `admin / admin123` — full access
- `manager / manager123` — inventory & reporting
- `cashier / cashier123` — POS only

## Database
Schema in `lib/db/src/schema/pharmacy.ts`. Push: `pnpm --filter @workspace/db run push`.

Tables: `branches`, `users`, `sessions`, `categories`, `suppliers`, `products`, `stock_movements`, `sales`, `sale_items`.
