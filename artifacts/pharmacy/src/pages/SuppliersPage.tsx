import { useState } from "react";
import {
  useListSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  getListSuppliersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const empty = { name: "", contactName: "", phone: "", email: "", address: "" };

export default function SuppliersPage() {
  const { data: suppliers } = useListSuppliers();
  const queryClient = useQueryClient();
  const createM = useCreateSupplier();
  const updateM = useUpdateSupplier();
  const deleteM = useDeleteSupplier();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);

  const submit = async () => {
    try {
      if (editId) {
        await updateM.mutateAsync({ id: editId, data: form });
        toast.success("Supplier updated");
      } else {
        await createM.mutateAsync({ data: form });
        toast.success("Supplier added");
      }
      queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
      setOpen(false);
      setForm(empty);
      setEditId(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this supplier?")) return;
    try {
      await deleteM.mutateAsync({ id });
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground">{suppliers?.length ?? 0} active suppliers</p>
        </div>
        <Button onClick={() => { setEditId(null); setForm(empty); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Add Supplier
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers?.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.contactName || "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{s.phone || "—"}</TableCell>
                  <TableCell className="text-sm">{s.email || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.address || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditId(s.id);
                        setForm({
                          name: s.name ?? "",
                          contactName: s.contactName ?? "",
                          phone: s.phone ?? "",
                          email: s.email ?? "",
                          address: s.address ?? "",
                        });
                        setOpen(true);
                      }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!suppliers?.length && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No suppliers</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Contact Name</Label><Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!form.name}>{editId ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
