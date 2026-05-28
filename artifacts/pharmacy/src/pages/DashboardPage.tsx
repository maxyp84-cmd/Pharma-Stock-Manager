import { useEffect } from "react";
import {
  useGetDashboardSummary,
  useGetSalesTrend,
  useGetTopProducts,
  useListLowStockProducts,
  useListExpiringProducts,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatGHS } from "@/lib/currency";
import { WifiOff, TrendingUp, TrendingDown } from "lucide-react";
import { useOnline } from "@/hooks/useOnline";
import {
  cacheDashboardSummary,
  getCachedDashboardSummary,
  cacheSalesTrend,
  getCachedSalesTrend,
  cacheTopProducts,
  getCachedTopProducts,
  cacheLowStock,
  getCachedLowStock,
  cacheExpiring,
  getCachedExpiring,
} from "@/lib/offline-queue";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const isOnline = useOnline();

  const { data: liveSummary } = useGetDashboardSummary();
  const { data: liveTrend } = useGetSalesTrend();
  const { data: liveTopProducts } = useGetTopProducts();
  const { data: liveLowStock } = useListLowStockProducts();
  const { data: liveExpiring } = useListExpiringProducts();

  // Cache everything when online
  useEffect(() => {
    if (isOnline && liveSummary) cacheDashboardSummary(liveSummary);
  }, [isOnline, liveSummary]);
  useEffect(() => {
    if (isOnline && liveTrend?.length) cacheSalesTrend(liveTrend);
  }, [isOnline, liveTrend]);
  useEffect(() => {
    if (isOnline && liveTopProducts?.length) cacheTopProducts(liveTopProducts);
  }, [isOnline, liveTopProducts]);
  useEffect(() => {
    if (isOnline && liveLowStock?.length) cacheLowStock(liveLowStock);
  }, [isOnline, liveLowStock]);
  useEffect(() => {
    if (isOnline && liveExpiring?.length) cacheExpiring(liveExpiring);
  }, [isOnline, liveExpiring]);

  // Fall back to cache when offline
  const summary = liveSummary ?? (isOnline ? null : getCachedDashboardSummary<any>());
  const trend = liveTrend ?? (isOnline ? [] : getCachedSalesTrend<any>());
  const topProducts = liveTopProducts ?? (isOnline ? [] : getCachedTopProducts<any>());
  const lowStock = liveLowStock ?? (isOnline ? [] : getCachedLowStock<any>());
  const expiring = liveExpiring ?? (isOnline ? [] : getCachedExpiring<any>());

  const kpis = [
    { label: "Sales Today", value: formatGHS(summary?.salesToday ?? 0), sub: `${summary?.transactionsToday ?? 0} transactions` },
    { label: "Sales This Week", value: formatGHS(summary?.salesWeek ?? 0) },
    { label: "Sales This Month", value: formatGHS(summary?.salesMonth ?? 0) },
    { label: "Profit This Month", value: formatGHS(summary?.profitMonth ?? 0), highlight: true },
    { label: "Total Stock Value", value: formatGHS(summary?.totalStockValue ?? 0) },
    { label: "Products", value: String(summary?.productCount ?? 0) },
    { label: "Low Stock", value: String(summary?.lowStockCount ?? 0), alert: (summary?.lowStockCount ?? 0) > 0 },
    { label: "Expiring Soon", value: String(summary?.expiringSoonCount ?? 0), alert: (summary?.expiringSoonCount ?? 0) > 0 },
  ];

  return (
    <div className="space-y-6">
      {!isOnline && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>You are offline — showing cached dashboard data. Numbers reflect the last time you were connected.</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {!isOnline && <Badge variant="outline" className="text-amber-600 border-amber-300">Cached</Badge>}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className={k.highlight ? "border-primary/40 bg-primary/5" : ""}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.alert ? "text-destructive" : ""}`}>{k.value}</p>
              {k.sub && <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales trend chart */}
      {trend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Sales Trend (last 30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(175,60%,30%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(175,60%,30%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₵${(v / 1000).toFixed(0)}k`} width={48} />
                <Tooltip formatter={(v: any) => formatGHS(v)} labelFormatter={(l) => `Date: ${l}`} />
                <Area type="monotone" dataKey="sales" stroke="hsl(175,60%,30%)" fill="url(#salesGrad)" strokeWidth={2} name="Sales" />
                <Area type="monotone" dataKey="profit" stroke="hsl(175,60%,50%)" fill="none" strokeWidth={1.5} strokeDasharray="4 2" name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top products */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />Top Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {topProducts.slice(0, 6).map((p: any, i: number) => (
                <li key={p.productId} className="flex items-center justify-between gap-2 text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground text-xs w-4 shrink-0">{i + 1}</span>
                    <span className="truncate font-medium">{p.productName}</span>
                  </div>
                  <span className="text-primary font-semibold shrink-0">{formatGHS(p.revenue)}</span>
                </li>
              ))}
              {!topProducts.length && <li className="text-muted-foreground text-sm text-center py-4">No data</li>}
            </ul>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 grid grid-cols-1 gap-6">
          {/* Low stock */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Low Stock Alerts
                {lowStock.length > 0 && <Badge variant="destructive">{lowStock.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {lowStock.slice(0, 5).map((p: any) => (
                  <li key={p.id} className="flex justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                    <span>{p.name}</span>
                    <span className="text-destructive font-bold">{p.stockQty} left</span>
                  </li>
                ))}
                {!lowStock.length && <li className="text-muted-foreground text-sm text-center py-2">All stock levels healthy</li>}
              </ul>
            </CardContent>
          </Card>

          {/* Expiring */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Expiring Soon
                {expiring.length > 0 && <Badge variant="secondary">{expiring.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {expiring.slice(0, 5).map((p: any) => (
                  <li key={p.id} className="flex justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                    <span>{p.name}</span>
                    <span className="text-orange-600 font-medium">{p.expiryDate}</span>
                  </li>
                ))}
                {!expiring.length && <li className="text-muted-foreground text-sm text-center py-2">No products expiring soon</li>}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
