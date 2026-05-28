import { useState, useEffect } from "react";
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
import { Plus, Trash2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useOnline } from "@/hooks/useOnline";
import { cacheCategories, getCachedCategories } from "@/lib/offline-queue";

export default function CategoriesPage() {
  const isOnline = useOnline();
  const { data: liveCategories } = useListCategories();
  const queryClient = useQueryClient();
  const createM = useCreateCategory();
  const deleteM = useDeleteCategory();
  const [name, setName] = useState("");

  useEffect(() => {
    if (isOnline && liveCategories?.length) cacheCategories(liveCategories);
  }, [isOnline, liveCategories]);

  const categories = liveCategories ?? (isOnline ? [] : getCachedCategories<any>());

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
      {!isOnline && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>You are offline — showing cached categories. Changes are disabled until reconnected.</span>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold">Categories</h1>
        <p className="text-muted-foreground">
          Organize your products
          {!isOnline && <span className="ml-2 text-amber-600">(cached)</span>}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Add new category</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Pain Relief"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && isOnline && add()}
              disabled={!isOnline}
            />
            <Button onClick={add} disabled={!name.trim() || createM.isPending || !isOnline}>
              <Plus className="h-4 w-4 mr-2" />Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All categories ({categories?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {categories?.map((c: any) => (
              <li key={c.id} className="flex justify-between items-center py-3">
                <span className="font-medium">{c.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(c.id)}
                  disabled={!isOnline}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
            {!categories?.length && (
              <li className="text-muted-foreground text-center py-6">
                {isOnline ? "No categories yet" : "No cached categories available"}
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
