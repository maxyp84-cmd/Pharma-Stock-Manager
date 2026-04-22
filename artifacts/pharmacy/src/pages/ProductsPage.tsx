import { useState } from "react";
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useListCategories,
  useListSuppliers,
  useListBranches,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { formatGHS } from "@/lib/currency";
import { toast } from "sonner";
import { useGetMe } from "@workspace/api-client-react";

interface ProductForm {
  name: string;
  barcode: string;
  sku: string;
  categoryId: string;
  supplierId: string;
  branchId: string;
  unit: string;
  costPrice: string;
  sellPrice: string;
  stockQty: string;
  reorderLevel: string;
  expiryDate: string;
  batchNumber: string;
  description: string;
}

const empty: ProductForm = {
  name: "",
  barcode: "",
  sku: "",
  categoryId: "",
  supplierId: "",
  branchId: "",
  unit: "pack",
  costPrice: "0",
  sellPrice: "0",
  stockQty: "0",
  reorderLevel: "10",
  expiryDate: "",
  batchNumber: "",
  description: "",
};

function expiryStatus(date: string | null | undefined) {
  if (!date) return null;
  const now = new Date();
  const exp = new Date(date);
  const days = Math.floor((exp.getTime() - now.getTime()) / 86400000);
  if (days < 0) return { label: "Expired", variant: "destructive" as const };
  if (days <= 60) return { label: `${days}d left`, variant: "secondary" as const };
  return null;
}

export default function ProductsPage() {
  const { data: me } = useGetMe();
  const canEdit = me?.role === "admin" || me?.role === "manager";
  const [search, setSearch] = useState("");
  const { data: products } = useListProducts({ search: search || undefined });
  const { data: categories } = useListCategories();
  const { data: suppliers } = useListSuppliers();
  const { data: branches } = useListBranches();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(empty);

  const createM = useCreateProduct();
  const updateM = useUpdateProduct();
  const deleteM = useDeleteProduct();

  const openNew = () => {
    setEditId(null);
    setForm({ ...empty, branchId: me?.branchId ? String(me.branchId) : "" });
    setOpen(true);
  };

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      name: p.name ?? "",
      barcode: p.barcode ?? "",
      sku: p.sku ?? "",
      categoryId: p.categoryId ? String(p.categoryId) : "",
      supplierId: p.supplierId ? String(p.supplierId) : "",
      branchId: p.branchId ? String(p.branchId) : "",
      unit: p.unit ?? "pack",
      costPrice: String(p.costPrice ?? 0),
      sellPrice: String(p.sellPrice ?? 0),
      stockQty: String(p.stockQty ?? 0),
      reorderLevel: String(p.reorderLevel ?? 10),
      expiryDate: p.expiryDate ?? "",
      batchNumber: p.batchNumber ?? "",
      description: p.description ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    const payload = {
      name: form.name,
      barcode: form.barcode || undefined,
      sku: form.sku || undefined,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      supplierId: form.supplierId ? Number(form.supplierId) : undefined,
      branchId: form.branchId ? Number(form.branchId) : undefined,
      unit: form.unit || undefined,
      costPrice: Number(form.costPrice),
      sellPrice: Number(form.sellPrice),
      stockQty: Number(form.stockQty),
      reorderLevel: Number(form.reorderLevel),
      expiryDate: form.expiryDate || undefined,
      batchNumber: form.batchNumber || undefined,
      description: form.description || undefined,
    };
    try {
      if (editId) {
        await updateM.mutateAsync({ id: editId, data: payload });
        toast.success("Product updated");
      } else {
        await createM.mutateAsync({ data: payload });
        toast.success("Product added");
      }
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteM.mutateAsync({ id });
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            {products?.length ?? 0} products in inventory
          </p>
        </div>
        {canEdit && (
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, barcode or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Expiry</TableHead>
                {canEdit && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((p: any) => {
                const low = p.stockQty <= p.reorderLevel;
                const exp = expiryStatus(p.expiryDate);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs">{p.barcode || "—"}</TableCell>
                    <TableCell>{p.categoryName || "—"}</TableCell>
                    <TableCell>{p.supplierName || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {low && <Badge variant="destructive">Low</Badge>}
                        <span>{p.stockQty}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatGHS(p.sellPrice)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{p.expiryDate || "—"}</span>
                        {exp && <Badge variant={exp.variant}>{exp.label}</Badge>}
                      </div>
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {!products?.length && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground py-8">
                    No products found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Barcode</Label>
              <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            </div>
            <div>
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {categories?.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supplier</Label>
              <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {suppliers?.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={form.branchId} onValueChange={(v) => setForm({ ...form, branchId: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {branches?.map((b: any) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div>
              <Label>Cost Price (₵)</Label>
              <Input type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
            </div>
            <div>
              <Label>Sell Price (₵)</Label>
              <Input type="number" step="0.01" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} />
            </div>
            <div>
              <Label>Stock Quantity</Label>
              <Input type="number" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} />
            </div>
            <div>
              <Label>Reorder Level</Label>
              <Input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
            <div>
              <Label>Batch Number</Label>
              <Input value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!form.name || createM.isPending || updateM.isPending}>
              {editId ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
