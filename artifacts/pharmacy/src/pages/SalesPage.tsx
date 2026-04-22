import { useState, useMemo } from "react";
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
import { Receipt as ReceiptIcon } from "lucide-react";
import { formatGHS } from "@/lib/currency";
import { ReceiptDialog } from "@/components/ReceiptDialog";

export default function SalesPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const params: { from?: string; to?: string } = {};
  if (from) params.from = new Date(from).toISOString();
  if (to) {
    const t = new Date(to);
    t.setHours(23, 59, 59, 999);
    params.to = t.toISOString();
  }
  const { data: sales } = useListSales(params);
  const [selected, setSelected] = useState<any>(null);

  const totals = useMemo(() => {
    if (!sales) return { count: 0, revenue: 0, profit: 0 };
    return {
      count: sales.length,
      revenue: sales.reduce((s: number, x: any) => s + Number(x.total), 0),
      profit: sales.reduce((s: number, x: any) => s + Number(x.profit), 0),
    };
  }, [sales]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales History</h1>
        <p className="text-muted-foreground">Browse, filter, and reprint receipts</p>
      </div>

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
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(s)}>
                  <TableCell className="font-mono text-sm">{s.receiptNumber}</TableCell>
                  <TableCell className="text-sm">{new Date(s.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{s.cashierName || "—"}</TableCell>
                  <TableCell className="text-right">{s.items.length}</TableCell>
                  <TableCell className="text-right font-semibold">{formatGHS(s.total)}</TableCell>
                  <TableCell><Badge variant="outline">{s.paymentMethod}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelected(s); }}>
                      <ReceiptIcon className="h-4 w-4 mr-1" />View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!sales?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No sales yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ReceiptDialog sale={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
