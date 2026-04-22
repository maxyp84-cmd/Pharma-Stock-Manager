import { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useListBranches,
  useGetMe,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Trash2, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const roleVariants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  admin: "destructive",
  manager: "default",
  cashier: "secondary",
};

const empty = {
  username: "",
  password: "",
  fullName: "",
  role: "cashier" as "cashier" | "manager" | "admin",
  branchId: "",
};

export default function UsersPage() {
  const { data: me } = useGetMe();

  if (me?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center space-y-3">
            <ShieldAlert className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-xl font-semibold">Access denied</h2>
            <p className="text-muted-foreground text-sm">
              You need administrator privileges to manage staff accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AdminUsers />;
}

function AdminUsers() {
  const { data: users } = useListUsers();
  const { data: branches } = useListBranches();
  const queryClient = useQueryClient();
  const createM = useCreateUser();
  const updateM = useUpdateUser();
  const deleteM = useDeleteUser();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const submit = async () => {
    try {
      await createM.mutateAsync({
        data: {
          username: form.username,
          password: form.password,
          fullName: form.fullName,
          role: form.role,
          branchId: form.branchId ? Number(form.branchId) : undefined,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setOpen(false);
      setForm(empty);
      toast.success("User created");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const toggleActive = async (u: any) => {
    try {
      await updateM.mutateAsync({ id: u.id, data: { active: !u.active } });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    try {
      await deleteM.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff</h1>
          <p className="text-muted-foreground">{users?.length ?? 0} accounts</p>
        </div>
        <Button onClick={() => { setForm(empty); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u: any) => {
                const branch = branches?.find((b: any) => b.id === u.branchId);
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-sm">{u.username}</TableCell>
                    <TableCell className="font-medium">{u.fullName}</TableCell>
                    <TableCell>
                      <Badge variant={roleVariants[u.role] ?? "outline"}>
                        {u.role === "admin" && <ShieldCheck className="h-3 w-3 mr-1 inline" />}
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{branch?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={u.active ? "default" : "outline"}>
                        {u.active ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => toggleActive(u)}>
                          {u.active ? "Disable" : "Enable"}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(u.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Staff Account</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
            <div><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div><Label>Full Name</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!form.username || !form.password || !form.fullName}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
