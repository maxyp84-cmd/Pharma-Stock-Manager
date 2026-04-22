import { useState } from "react";
import { useListProducts, useCreateSale, getListProductsQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatGHS } from "@/lib/currency";
import { toast } from "sonner";
import { queueSaleOffline } from "@/lib/offline-queue";
import { ReceiptDialog } from "@/components/ReceiptDialog";

export default function POSPage() {
  const [search, setSearch] = useState("");
  const { data: products } = useListProducts({ search });
  const [cart, setCart] = useState<any[]>([]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amountPaid, setAmountPaid] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [completedSale, setCompletedSale] = useState<any>(null);

  const createSale = useCreateSale();

  const handleScan = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const match = products?.find(p => p.barcode === search || p.name.toLowerCase().includes(search.toLowerCase()));
      if (match) {
        addToCart(match);
        setSearch("");
      }
    }
  };

  const addToCart = (product: any) => {
    setCart(prev => {
      const ex = prev.find(p => p.productId === product.id);
      if (ex) return prev.map(p => p.productId === product.id ? { ...p, quantity: p.quantity + 1, lineTotal: (p.quantity + 1) * p.unitPrice } : p);
      return [...prev, { productId: product.id, productName: product.name, quantity: 1, unitPrice: product.sellPrice, lineTotal: product.sellPrice }];
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const total = subtotal - discount + tax;
  const change = Math.max(0, amountPaid - total);

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    const payload = {
      items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      discount, tax, paymentMethod, amountPaid, customerName
    };
    try {
      const result = await createSale.mutateAsync({ data: payload });
      setCompletedSale(result);
      setCart([]);
      setAmountPaid(0);
      setDiscount(0);
      setTax(0);
      setCustomerName("");
    } catch (e: any) {
      if (!navigator.onLine) {
        queueSaleOffline({ ...payload, id: Date.now(), receiptNumber: 'OFFLINE-' + Date.now(), createdAt: new Date().toISOString() });
        toast.success("Saved offline");
        setCart([]);
      } else {
        toast.error("Sale failed: " + e.message);
      }
    }
  };

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 flex flex-col bg-white p-4 rounded-lg shadow">
        <Input 
          placeholder="Scan barcode or search..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          onKeyDown={handleScan}
          className="mb-4"
        />
        <div className="grid grid-cols-3 gap-4 overflow-auto">
          {products?.map(p => (
            <div key={p.id} onClick={() => addToCart(p)} className="border p-4 rounded cursor-pointer hover:border-primary">
              <h4 className="font-bold truncate">{p.name}</h4>
              <p>{formatGHS(p.sellPrice)}</p>
              <p className="text-xs text-gray-500">Stock: {p.stockQty}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="w-[400px] flex flex-col bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Current Sale</h2>
        <div className="flex-1 overflow-auto space-y-2 border-b mb-4 pb-4">
          {cart.map(item => (
            <div key={item.productId} className="flex justify-between items-center text-sm">
              <div className="flex-1 truncate pr-2">{item.productName}</div>
              <div className="w-16">x{item.quantity}</div>
              <div className="w-20 text-right">{formatGHS(item.lineTotal)}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatGHS(subtotal)}</span></div>
          <div className="flex justify-between items-center"><span>Discount (₵)</span><Input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="w-24 h-8 text-right"/></div>
          <div className="flex justify-between items-center"><span>Tax (₵)</span><Input type="number" value={tax} onChange={e => setTax(Number(e.target.value))} className="w-24 h-8 text-right"/></div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Total</span><span>{formatGHS(total)}</span></div>
          <div className="flex justify-between items-center mt-4">
            <span>Method</span>
            <select className="border rounded px-2 py-1" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option>Cash</option><option>Mobile Money</option><option>Card</option>
            </select>
          </div>
          <div className="flex justify-between items-center"><span>Paid (₵)</span><Input type="number" value={amountPaid || ''} onChange={e => setAmountPaid(Number(e.target.value))} className="w-24 h-8 text-right"/></div>
          <div className="flex justify-between font-bold"><span>Change</span><span>{formatGHS(change)}</span></div>
        </div>
        <Button className="w-full mt-6" size="lg" onClick={handleSubmit} disabled={cart.length === 0 || createSale.isPending}>Complete Sale</Button>
      </div>

      <ReceiptDialog sale={completedSale} open={!!completedSale} onOpenChange={o => !o && setCompletedSale(null)} />
    </div>
  );
}
