import { useState } from "react";
import {
  useListCategories,
  useCreateCategory,
  useDeleteCategory,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function CategoriesPage() {
  const { data: categories } = useListCategories();
  const queryClient = useQueryClient();
  const createM = useCreateCategory();
  const deleteM = useDeleteCategory();
  const [name, setName] = useState("");

  const add = async () => {
    if (!name.trim()) return;
    try {
      await createM.mutateAsync({ data: { name: name.trim() } });
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      setName("");
      toast.success("Category added");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this category?")) return;
    try {
      await deleteM.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Categories</h1>
        <p className="text-muted-foreground">Organize your products</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Add new category</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Pain Relief"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <Button onClick={add} disabled={!name.trim() || createM.isPending}>
              <Plus className="h-4 w-4 mr-2" />Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">All categories ({categories?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y">
            {categories?.map((c: any) => (
              <li key={c.id} className="flex justify-between items-center py-3">
                <span className="font-medium">{c.name}</span>
                <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
            {!categories?.length && <li className="text-muted-foreground text-center py-6">No categories yet</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
