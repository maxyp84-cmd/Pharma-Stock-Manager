import { useState, useMemo, useEffect } from "react";
import { useListSales } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt as ReceiptIcon, WifiOff, Clock } from "lucide-react";
import { formatGHS } from "@/lib/currency";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { useOnline } from "@/hooks/useOnline";
import {
  cacheSales,
  getCachedSales,
  getOfflineSales,
} from "@/lib/offline-queue";

export default function SalesPage() {
  const isOnline = useOnline();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const params: { from?: string; to?: string } = {};
  if (from) params.from = new Date(from).toISOString();
  if (to) {
    const t = new Date(to);
    t.setHours(23, 59, 59, 999);
    params.to = t.toISOString();
  }

  const { data: liveSales } = useListSales(params);
  const [selected, setSelected] = useState<any>(null);

  // Cache fetched sales to localStorage whenever we get fresh data
  useEffect(() => {
    if (liveSales && liveSales.length > 0 && isOnline) {
      cacheSales(liveSales);
    }
  }, [liveSales, isOnline]);

  // Determine data source: live when online, localStorage when offline
  const sales: any[] = useMemo(() => {
    if (isOnline && liveSales) return liveSales;
    const cached = getCachedSales<any>();
    if (!from && !to) return cached;
    return cached.filter((s: any) => {
      const created = new Date(s.createdAt).getTime();
      const afterFrom = from ? created >= new Date(from).getTime() : true;
      const beforeTo = to ? created <= new Date(to + "T23:59:59").getTime() : true;
      return afterFrom && beforeTo;
    });
  }, [isOnline, liveSales, from, to]);

  // Pending offline sales (queued but not yet synced)
  const pendingSales = useMemo(() => getOfflineSales(), []);

  const totals = useMemo(() => {
    const count = sales.length + (isOnline ? 0 : pendingSales.length);
    const revenue = sales.reduce((s: number, x: any) => s + Number(x.total), 0);
    const profit = sales.reduce((s: number, x: any) => s + Number(x.profit), 0);
    return { count, revenue, profit };
  }, [sales, pendingSales, isOnline]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales History</h1>
        <p className="text-muted-foreground">Browse, filter, and reprint receipts</p>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            You are offline. Showing the last cached sales data.
            {pendingSales.length > 0 && (
              <strong className="ml-1">
                {pendingSales.length} sale{pendingSales.length > 1 ? "s" : ""} pending sync.
              </strong>
            )}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Transactions</p>
          <p className="text-3xl font-bold mt-1">{totals.count}</p>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Revenue</p>
          <p className="text-3xl font-bold mt-1">{formatGHS(totals.revenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Profit</p>
          <p className="text-3xl font-bold mt-1 text-primary">{formatGHS(totals.profit)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-6 flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </CardContent></Card>
      </div>

      {/* Pending (unsynced) sales shown when offline */}
      {!isOnline && pendingSales.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-0">
            <div className="px-4 py-3 flex items-center gap-2 border-b border-amber-200">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">
                Pending Sales (not yet synced)
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Items</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingSales.map((s, i) => {
                  const subtotal = s.items.reduce(
                    (sum: number, it: any) => sum + it.quantity * it.unitPrice,
                    0,
                  );
                  const total = Math.max(0, subtotal - (s.discount ?? 0) + (s.tax ?? 0));
                  return (
                    <TableRow key={i} className="bg-amber-50/40">
                      <TableCell className="text-sm">{s.items.length} item{s.items.length !== 1 ? "s" : ""}</TableCell>
                      <TableCell><Badge variant="outline">{s.paymentMethod}</Badge></TableCell>
                      <TableCell className="text-right">{formatGHS(subtotal)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatGHS(total)}</TableCell>
                      <TableCell>
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">
                          Awaiting sync
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Main sales table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales?.map((s: any) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelected(s)}
                >
                  <TableCell className="font-mono text-sm">{s.receiptNumber}</TableCell>
                  <TableCell className="text-sm">{new Date(s.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{s.cashierName || "—"}</TableCell>
                  <TableCell className="text-right">{s.items?.length ?? 0}</TableCell>
                  <TableCell className="text-right font-semibold">{formatGHS(s.total)}</TableCell>
                  <TableCell><Badge variant="outline">{s.paymentMethod}</Badge></TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setSelected(s); }}
                    >
                      <ReceiptIcon className="h-4 w-4 mr-1" />View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!sales?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {isOnline ? "No sales yet" : "No cached sales available"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ReceiptDialog
        sale={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}
