import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, RefreshCw, TrendingUp, ShoppingBag, Users, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatGHS } from "@/lib/currency";

const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

interface ClosingReport {
  date: string;
  branchName: string | null;
  reportGeneratedAt: string;
  generatedBy: string;
  totals: {
    transactions: number;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    profit: number;
    amountCollected: number;
  };
  paymentBreakdown: { method: string; count: number; total: number; collected: number }[];
  cashierBreakdown: { cashierName: string; transactions: number; total: number; profit: number }[];
  topItems: { productName: string; qty: number; revenue: number; profit: number }[];
}

async function fetchClosingReport(date: string): Promise<ClosingReport> {
  const res = await fetch(`${BASE}/api/reports/closing?date=${date}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ClosingReport>;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function methodLabel(m: string) {
  return { cash: "Cash", momo: "Mobile Money (MoMo)", card: "Card/POS", credit: "Credit" }[m] ?? m;
}

export default function ClosingReportPage() {
  const [date, setDate] = useState(todayStr);
  const [submitted, setSubmitted] = useState(todayStr);
  const printRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["closing-report", submitted],
    queryFn: () => fetchClosingReport(submitted),
  });

  const handlePrint = () => {
    const style = document.createElement("style");
    style.id = "__print_cr";
    style.innerHTML = `
      @media print {
        body > *:not(#cr-print-root) { display: none !important; }
        #cr-print-root { display: block !important; position: static !important; }
        .no-print { display: none !important; }
        @page { margin: 18mm; size: A4; }
      }
    `;
    document.head.appendChild(style);
    const root = document.getElementById("cr-print-root");
    if (root) root.style.display = "block";
    window.print();
    document.head.removeChild(style);
  };

  const margin = data?.totals ? data.totals.amountCollected - data.totals.total : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Controls */}
      <div className="no-print flex items-end gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1 font-medium">Report Date</p>
          <Input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        <Button onClick={() => setSubmitted(date)} disabled={isLoading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Generate Report
        </Button>
        {data && (
          <Button variant="outline" onClick={handlePrint} className="gap-2 ml-auto">
            <Printer className="h-4 w-4" />
            Print / Export PDF
          </Button>
        )}
      </div>

      {error && (
        <p className="text-destructive text-sm">Failed to load report: {String(error)}</p>
      )}

      {data && (
        <div id="cr-print-root" ref={printRef} className="space-y-6">
          {/* ── Header ── */}
          <div className="border rounded-xl p-6 bg-white print:border-0 print:p-0">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-primary">MediStock</h1>
                <p className="text-muted-foreground">{data.branchName ?? "All Branches"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  End-of-Day Closing Report
                </p>
                <p className="text-lg font-bold">
                  {new Date(data.date + "T00:00:00").toLocaleDateString("en-GH", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Generated at {fmtTime(data.reportGeneratedAt)} by {data.generatedBy}
                </p>
              </div>
            </div>
          </div>

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={<ShoppingBag className="h-5 w-5" />}
              label="Transactions"
              value={String(data.totals.transactions)}
            />
            <KpiCard
              icon={<Banknote className="h-5 w-5" />}
              label="Total Sales"
              value={formatGHS(data.totals.total)}
              sub={data.totals.discount > 0 ? `Discount: ${formatGHS(data.totals.discount)}` : undefined}
            />
            <KpiCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Gross Profit"
              value={formatGHS(data.totals.profit)}
              sub={`Margin: ${data.totals.total > 0 ? ((data.totals.profit / data.totals.total) * 100).toFixed(1) : 0}%`}
            />
            <KpiCard
              icon={<Banknote className="h-5 w-5" />}
              label="Cash in Drawer"
              value={formatGHS(data.totals.amountCollected)}
              sub={margin !== 0 ? `${margin > 0 ? "Surplus" : "Shortfall"}: ${formatGHS(Math.abs(margin))}` : "Balanced"}
              highlight={margin < 0}
            />
          </div>

          {/* ── Payment Breakdown ── */}
          <SectionCard title="Payment Method Breakdown">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 font-medium text-center">Transactions</th>
                  <th className="pb-2 font-medium text-right">Sales Value</th>
                  <th className="pb-2 font-medium text-right">Amount Received</th>
                </tr>
              </thead>
              <tbody>
                {data.paymentBreakdown.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No sales recorded</td></tr>
                )}
                {data.paymentBreakdown.map((r) => (
                  <tr key={r.method} className="border-b last:border-0">
                    <td className="py-2 font-medium">{methodLabel(r.method)}</td>
                    <td className="py-2 text-center">{r.count}</td>
                    <td className="py-2 text-right">{formatGHS(r.total)}</td>
                    <td className="py-2 text-right">{formatGHS(r.collected)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold border-t-2">
                  <td className="pt-2">Total</td>
                  <td className="pt-2 text-center">{data.totals.transactions}</td>
                  <td className="pt-2 text-right">{formatGHS(data.totals.total)}</td>
                  <td className="pt-2 text-right">{formatGHS(data.totals.amountCollected)}</td>
                </tr>
              </tfoot>
            </table>
          </SectionCard>

          {/* ── Cashier Performance ── */}
          {data.cashierBreakdown.length > 0 && (
            <SectionCard title="Cashier Performance">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-medium">Cashier</th>
                    <th className="pb-2 font-medium text-center">Transactions</th>
                    <th className="pb-2 font-medium text-right">Total Sales</th>
                    <th className="pb-2 font-medium text-right">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cashierBreakdown.map((r) => (
                    <tr key={r.cashierName} className="border-b last:border-0">
                      <td className="py-2">{r.cashierName}</td>
                      <td className="py-2 text-center">{r.transactions}</td>
                      <td className="py-2 text-right">{formatGHS(r.total)}</td>
                      <td className="py-2 text-right">{formatGHS(r.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          )}

          {/* ── Top Items ── */}
          {data.topItems.length > 0 && (
            <SectionCard title="Top 10 Items Sold">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">Product</th>
                    <th className="pb-2 font-medium text-center">Qty Sold</th>
                    <th className="pb-2 font-medium text-right">Revenue</th>
                    <th className="pb-2 font-medium text-right">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topItems.map((r, i) => (
                    <tr key={r.productName} className="border-b last:border-0">
                      <td className="py-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 font-medium">{r.productName}</td>
                      <td className="py-2 text-center">{r.qty}</td>
                      <td className="py-2 text-right">{formatGHS(r.revenue)}</td>
                      <td className="py-2 text-right">{formatGHS(r.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          )}

          {/* ── Cash Reconciliation ── */}
          <SectionCard title="Cash Reconciliation">
            <div className="space-y-2 text-sm">
              <RecRow label="Total Sales Value" value={formatGHS(data.totals.total)} />
              <RecRow label="Discounts Given" value={`- ${formatGHS(data.totals.discount)}`} />
              <RecRow label="VAT / Tax Collected" value={formatGHS(data.totals.tax)} />
              <RecRow label="Amount Received from Customers" value={formatGHS(data.totals.amountCollected)} bold />
              <div className="border-t my-2" />
              <RecRow
                label={margin >= 0 ? "Cash Surplus" : "Cash Shortfall"}
                value={formatGHS(Math.abs(margin))}
                highlight={margin < 0}
                bold
              />
            </div>
            <div className="mt-8 pt-6 border-t grid grid-cols-2 gap-8 text-sm print:mt-16">
              <div>
                <p className="text-muted-foreground mb-8">Manager Signature</p>
                <div className="border-b border-gray-400 w-48" />
              </div>
              <div>
                <p className="text-muted-foreground mb-8">Cashier Signature</p>
                <div className="border-b border-gray-400 w-48" />
              </div>
            </div>
          </SectionCard>

          <p className="text-xs text-center text-muted-foreground print:mt-4">
            MediStock Pharmacy Management System — Confidential — {data.branchName}
          </p>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 bg-white ${highlight ? "border-red-300 bg-red-50" : ""}`}>
      <div className={`flex items-center gap-2 mb-2 ${highlight ? "text-red-600" : "text-primary"}`}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className={`text-xl font-bold ${highlight ? "text-red-700" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function RecRow({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""} ${highlight ? "text-red-600" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
