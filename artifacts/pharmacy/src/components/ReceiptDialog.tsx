import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatGHS } from "@/lib/currency";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function ReceiptDialog({ sale, open, onOpenChange }: { sale: any, open: boolean, onOpenChange: (o: boolean) => void }) {
  if (!sale) return null;

  const ReceiptContent = ({ isA4 }: { isA4: boolean }) => (
    <div className={`p-8 bg-white text-black ${isA4 ? 'max-w-2xl mx-auto' : 'w-[300px] mx-auto text-sm'}`} id="print-receipt">
      <div className="text-center mb-4">
        <h2 className="font-bold text-xl">MediStock Pharmacy</h2>
        <p>{sale.branchName || 'Main Branch'}</p>
        <p>Receipt #{sale.receiptNumber}</p>
        <p>{new Date(sale.createdAt || Date.now()).toLocaleString()}</p>
        <p>Cashier: {sale.cashierName || 'Unknown'}</p>
      </div>
      <div className="border-t border-b py-2 mb-4">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item: any, i: number) => (
              <tr key={i}>
                <td>{item.productName}</td>
                <td>{item.quantity}</td>
                <td>{formatGHS(item.unitPrice)}</td>
                <td className="text-right">{formatGHS(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-1 mb-4">
        <div className="flex justify-between"><span>Subtotal:</span> <span>{formatGHS(sale.subtotal)}</span></div>
        <div className="flex justify-between"><span>Discount:</span> <span>{formatGHS(sale.discount)}</span></div>
        <div className="flex justify-between"><span>Tax:</span> <span>{formatGHS(sale.tax)}</span></div>
        <div className="flex justify-between font-bold text-lg border-t pt-1 mt-1"><span>Total:</span> <span>{formatGHS(sale.total)}</span></div>
      </div>
      <div className="space-y-1 border-t pt-2">
        <div className="flex justify-between"><span>Payment ({sale.paymentMethod}):</span> <span>{formatGHS(sale.amountPaid)}</span></div>
        <div className="flex justify-between"><span>Change:</span> <span>{formatGHS(sale.change)}</span></div>
      </div>
      <div className="text-center mt-8 pt-4 border-t text-sm">
        <p>Thank you. Get well soon.</p>
        <svg viewBox="0 0 100 20" className="w-full mt-2 h-8">
          <rect width="10" height="20" x="0" />
          <rect width="5" height="20" x="15" />
          <rect width="15" height="20" x="25" />
          <rect width="10" height="20" x="45" />
          <rect width="5" height="20" x="60" />
          <rect width="20" height="20" x="70" />
        </svg>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <Tabs defaultValue="thermal">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="thermal">Thermal (80mm)</TabsTrigger>
              <TabsTrigger value="a4">A4</TabsTrigger>
            </TabsList>
            <button onClick={() => window.print()} className="px-4 py-2 bg-primary text-white rounded">Print</button>
          </div>
          <TabsContent value="thermal"><ReceiptContent isA4={false} /></TabsContent>
          <TabsContent value="a4"><ReceiptContent isA4={true} /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
