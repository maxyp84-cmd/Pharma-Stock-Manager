# MediStock — Pharmacy Management System

Full-stack production-ready pharmacy management system for retail pharmacies in Ghana. Built in the pnpm monorepo with React + Vite frontend and Express + Drizzle backend.

## Artifacts
- `artifacts/pharmacy` — React + Vite frontend (path `/`)
- `artifacts/api-server` — Express API (path `/api`)

## Stack
- Frontend: React, Vite, wouter, TanStack Query, Tailwind, shadcn/ui, recharts, sonner, lucide-react
- Backend: Express 5, Drizzle ORM, PostgreSQL (Replit DB), zod validation, custom cookie session auth (scrypt)
- API contract: `lib/api-spec/openapi.yaml` → orval-generated client + zod schemas

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

## Database
Schema in `lib/db/src/schema/pharmacy.ts`. Push: `pnpm --filter @workspace/db run push`.

Tables: `branches`, `users`, `sessions`, `categories`, `suppliers`, `products`, `stock_movements`, `sales`, `sale_items`.
