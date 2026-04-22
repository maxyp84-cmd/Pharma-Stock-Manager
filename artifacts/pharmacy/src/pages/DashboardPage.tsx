import { useGetDashboardSummary, useGetSalesTrend, useGetTopProducts, useListLowStockProducts, useListExpiringProducts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGHS } from "@/lib/currency";

export default function DashboardPage() {
  const { data: summary } = useGetDashboardSummary();
  const { data: trend } = useGetSalesTrend();
  const { data: topProducts } = useGetTopProducts();
  const { data: lowStock } = useListLowStockProducts();
  const { data: expiring } = useListExpiringProducts();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-6"><h3 className="text-sm text-gray-500">Sales Today</h3><p className="text-2xl font-bold">{formatGHS(summary.salesToday)}</p></CardContent></Card>
          <Card><CardContent className="p-6"><h3 className="text-sm text-gray-500">Sales Week</h3><p className="text-2xl font-bold">{formatGHS(summary.salesWeek)}</p></CardContent></Card>
          <Card><CardContent className="p-6"><h3 className="text-sm text-gray-500">Sales Month</h3><p className="text-2xl font-bold">{formatGHS(summary.salesMonth)}</p></CardContent></Card>
          <Card><CardContent className="p-6"><h3 className="text-sm text-gray-500">Profit Month</h3><p className="text-2xl font-bold">{formatGHS(summary.profitMonth)}</p></CardContent></Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Low Stock Alerts ({lowStock?.length || 0})</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {lowStock?.slice(0, 5).map((p: any) => (
                <li key={p.id} className="flex justify-between border-b pb-2"><span>{p.name}</span> <span className="text-red-600 font-bold">{p.stockQty} left</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Expiring Soon ({expiring?.length || 0})</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {expiring?.slice(0, 5).map((p: any) => (
                <li key={p.id} className="flex justify-between border-b pb-2"><span>{p.name}</span> <span className="text-orange-600">{p.expiryDate}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
