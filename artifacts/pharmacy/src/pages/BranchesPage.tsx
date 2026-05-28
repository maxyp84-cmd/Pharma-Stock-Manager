import { useState, useEffect } from "react";
import {
  useListBranches,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
  getListBranchesQueryKey,
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
import { Plus, Pencil, Trash2, Store, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useOnline } from "@/hooks/useOnline";
import { cacheBranches, getCachedBranches } from "@/lib/offline-queue";

const empty = { name: "", address: "", phone: "" };

export default function BranchesPage() {
  const isOnline = useOnline();
  const { data: liveBranches } = useListBranches();
  const queryClient = useQueryClient();
  const createM = useCreateBranch();
  const updateM = useUpdateBranch();
  const deleteM = useDeleteBranch();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (isOnline && liveBranches?.length) cacheBranches(liveBranches);
  }, [isOnline, liveBranches]);

  const branches = liveBranches ?? (isOnline ? [] : getCachedBranches<any>());

  const submit = async () => {
    try {
      if (editId) {
        await updateM.mutateAsync({ id: editId, data: form });
        toast.success("Branch updated");
      } else {
        await createM.mutateAsync({ data: form });
        toast.success("Branch added");
      }
      queryClient.invalidateQueries({ queryKey: getListBranchesQueryKey() });
      setOpen(false);
      setForm(empty);
      setEditId(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this branch?")) return;
    try {
      await deleteM.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListBranchesQueryKey() });
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <div className="space-y-6">
      {!isOnline && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>You are offline — showing cached branch data. Changes are disabled until reconnected.</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Branches</h1>
          <p className="text-muted-foreground">
            {branches?.length ?? 0} pharmacy locations
            {!isOnline && <span className="ml-2 text-amber-600">(cached)</span>}
          </p>
        </div>
        <Button
          onClick={() => { setEditId(null); setForm(empty); setOpen(true); }}
          disabled={!isOnline}
        >
          <Plus className="h-4 w-4 mr-2" />Add Branch
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches?.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-primary" />
                      {b.name}
                    </div>
                  </TableCell>
                  <TableCell>{b.address || "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{b.phone || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!isOnline}
                        onClick={() => {
                          setEditId(b.id);
                          setForm({ name: b.name ?? "", address: b.address ?? "", phone: b.phone ?? "" });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={!isOnline} onClick={() => remove(b.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!branches?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    {isOnline ? "No branches" : "No cached branches available"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Branch" : "Add Branch"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
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
