import { useState, useEffect } from "react";
import {
  useListStockMovements,
  useListLowStockProducts,
  useListExpiringProducts,
  useListProducts,
  useCreateStockMovement,
  getListStockMovementsQueryKey,
  getListProductsQueryKey,
  getListLowStockProductsQueryKey,
  getListExpiringProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Clock,
  Plus,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { useOnline } from "@/hooks/useOnline";
import {
  cacheStockMovements,
  getCachedStockMovements,
  cacheLowStock,
  getCachedLowStock,
  cacheExpiring,
  getCachedExpiring,
  cacheProducts,
  getCachedProducts,
} from "@/lib/offline-queue";

const typeColors: Record<
  string,
  "default" | "destructive" | "secondary" | "outline"
> = {
  IN: "default",
  OUT: "destructive",
  ADJUST: "secondary",
  SALE: "outline",
};

export default function InventoryPage() {
  const isOnline = useOnline();

  const { data: liveMovements } = useListStockMovements();
  const { data: liveLowStock } = useListLowStockProducts();
  const { data: liveExpiring } = useListExpiringProducts();
  const { data: liveProducts } = useListProducts({});

  const queryClient = useQueryClient();
  const createMove = useCreateStockMovement();

  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [quantity, setQuantity] = useState("0");
  const [note, setNote] = useState("");

  // Cache fresh data to localStorage whenever we're online
  useEffect(() => {
    if (!isOnline) return;
    if (liveMovements && liveMovements.length > 0) cacheStockMovements(liveMovements);
    if (liveLowStock) cacheLowStock(liveLowStock);
    if (liveExpiring) cacheExpiring(liveExpiring);
    if (liveProducts && liveProducts.length > 0) cacheProducts(liveProducts);
  }, [isOnline, liveMovements, liveLowStock, liveExpiring, liveProducts]);

  // Resolve displayed data: live when online, cache when offline
  const movements: any[] = isOnline && liveMovements
    ? liveMovements
    : getCachedStockMovements<any>();

  const lowStock: any[] = isOnline && liveLowStock
    ? liveLowStock
    : getCachedLowStock<any>();

  const expiring: any[] = isOnline && liveExpiring
    ? liveExpiring
    : getCachedExpiring<any>();

  const products: any[] = isOnline && liveProducts
    ? liveProducts
    : getCachedProducts<any>();

  const submit = async () => {
    if (!productId) return;
    try {
      await createMove.mutateAsync({
        data: {
          productId: Number(productId),
          type,
          quantity: Number(quantity),
          note: note || undefined,
        },
      });
      toast.success("Stock updated");
      queryClient.invalidateQueries({ queryKey: getListStockMovementsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListLowStockProductsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListExpiringProductsQueryKey() });
      setOpen(false);
      setProductId("");
      setQuantity("0");
      setNote("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">Stock movements and alerts</p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          disabled={!isOnline}
          title={!isOnline ? "Connect to the internet to adjust stock" : undefined}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adjust Stock
        </Button>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            You are offline. Showing the last cached inventory data. Stock adjustments
            are disabled until you reconnect.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Low Stock ({lowStock.length})
              {!isOnline && <Badge variant="outline" className="ml-auto text-xs">Cached</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 max-h-64 overflow-auto">
              {lowStock.map((p: any) => (
                <li
                  key={p.id}
                  className="flex justify-between text-sm border-b pb-2 last:border-0"
                >
                  <span className="truncate pr-2">{p.name}</span>
                  <span className="font-semibold text-destructive">
                    {p.stockQty} / {p.reorderLevel}
                  </span>
                </li>
              ))}
              {!lowStock.length && (
                <li className="text-muted-foreground text-sm">
                  {isOnline ? "All stock healthy" : "No cached data"}
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-accent" />
              Expiring Soon ({expiring.length})
              {!isOnline && <Badge variant="outline" className="ml-auto text-xs">Cached</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 max-h-64 overflow-auto">
              {expiring.map((p: any) => (
                <li
                  key={p.id}
                  className="flex justify-between text-sm border-b pb-2 last:border-0"
                >
                  <span className="truncate pr-2">{p.name}</span>
                  <span className="text-accent font-mono text-xs">{p.expiryDate}</span>
                </li>
              ))}
              {!expiring.length && (
                <li className="text-muted-foreground text-sm">
                  {isOnline ? "Nothing expiring within 60 days" : "No cached data"}
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Stock Movements
            {!isOnline && <Badge variant="outline" className="text-xs">Cached</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(m.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">{m.productName}</TableCell>
                  <TableCell>
                    <Badge variant={typeColors[m.type] ?? "outline"}>
                      {m.type === "IN" && <ArrowDown className="h-3 w-3 mr-1 inline" />}
                      {m.type === "OUT" && <ArrowUp className="h-3 w-3 inline mr-1" />}
                      {m.type === "ADJUST" && <RefreshCw className="h-3 w-3 mr-1 inline" />}
                      {m.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{m.quantity}</TableCell>
                  <TableCell className="text-sm">{m.note || "—"}</TableCell>
                  <TableCell className="text-sm">{m.userName || "—"}</TableCell>
                </TableRow>
              ))}
              {!movements.length && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    {isOnline ? "No movements recorded" : "No cached movements available"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} (stock: {p.stockQty})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Stock In (add)</SelectItem>
                  <SelectItem value="OUT">Stock Out (remove)</SelectItem>
                  <SelectItem value="ADJUST">Adjust (set absolute)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label>Note</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. delivery from supplier"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={submit}
              disabled={!productId || createMove.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
