import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Coffee } from "lucide-react";
import { PermissionGate } from "@/components/PermissionGate";
import { PageContainer } from "@/components/layout/PageContainer";
import { MenuFormModal } from "@/components/menu/MenuFormModal";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { MenuItemVisual } from "@/components/menu/MenuItemVisual";
import {
  fetchMenuItems,
  fetchMenuCategories,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  type MenuItem,
  type MenuFormData,
} from "@/lib/menu-api";
import { usePos, fmt, DEFAULT_CATEGORIES } from "@/lib/pos-store";
import { cn } from "@/lib/utils";
import { withActionFeedback } from "@/lib/action-feedback";

export const Route = createFileRoute("/_app/menu")({
  component: MenuManagementScreen,
});

function MenuManagementScreen() {
  const { refreshMenu } = usePos();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [menu, cats] = await Promise.all([
        fetchMenuItems({
          search: search || undefined,
          category: category === "all" ? undefined : category,
        }),
        fetchMenuCategories(),
      ]);
      setItems(menu);
      setCategories(cats);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const stats = useMemo(
    () => ({
      total: items.length,
      available: items.filter((i) => i.status === "available" && i.stock > 0).length,
      out: items.filter((i) => i.stock <= 0 || i.status === "unavailable").length,
    }),
    [items],
  );

  const handleSave = async (
    form: MenuFormData,
    imageFile: File | null,
    removeImage: boolean,
  ) => {
    await withActionFeedback(
      async () => {
        if (editing) {
          await updateMenuItem(editing.id, { ...form, removeImage }, imageFile);
        } else {
          await createMenuItem(form, imageFile);
        }
        await load();
        await refreshMenu();
      },
      {
        loading: editing ? "Updating product…" : "Creating product…",
        success: editing ? "Product updated!" : "Product created!",
        error: "Could not save product.",
      },
    );
  };

  const confirmDeleteMenuItem = async () => {
    if (!deleteTarget) return;
    await withActionFeedback(
      async () => {
        await deleteMenuItem(deleteTarget.id);
        await load();
        await refreshMenu();
      },
      {
        loading: "Deleting menu item…",
        success: "Menu item deleted.",
        error: "Could not delete menu item.",
      },
    );
  };
  const filterTabs = ["all", ...new Set([...categories, ...DEFAULT_CATEGORIES])];

  return (
    <PermissionGate path="/menu">
      <PageContainer wide>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <Coffee className="w-7 h-7 text-accent shrink-0" />
            <div>
              <h1 className="font-display text-responsive-3xl">Product Management</h1>
              <p className="text-sm text-muted-foreground">
                {stats.total} items · {stats.available} available · {stats.out} unavailable
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="btn-primary shrink-0"
          >
            <Plus className="w-4 h-4" /> Add product
          </button>
        </div>

        <div className="relative mb-4 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-accent" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-12 pr-4 py-3.5 min-h-[48px] rounded-2xl border bg-card shadow-sm text-base transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent/40 focus:shadow-md"
          />
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-thin pb-1">
          {filterTabs.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "px-4 py-2.5 min-h-[44px] rounded-full text-sm font-medium whitespace-nowrap touch-manipulation transition-all active:scale-95",
                category === c
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card border hover:bg-muted",
              )}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border p-4 skeleton h-48" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="glass-card rounded-2xl border p-12 text-center text-muted-foreground">
            No products found. Add your first product to get started.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {items.map((item) => {
              const out = item.stock <= 0 || item.status === "unavailable";
              return (
                <div
                  key={item.id}
                  className={cn(
                    "glass-card rounded-2xl border overflow-hidden hover-card flex flex-col",
                    out && "opacity-75",
                  )}
                >
                  <div className="aspect-square relative overflow-hidden">
                    <MenuItemVisual
                      image={item.image}
                      icon={item.icon}
                      name={item.name}
                      className="rounded-none"
                    />
                    {out && (
                      <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-1 rounded-full bg-destructive text-destructive-foreground">
                        {item.stock <= 0 ? "Out of Stock" : "Unavailable"}
                      </span>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <div className="text-xs text-muted-foreground">{item.category}</div>
                    <div className="font-medium text-sm line-clamp-2 mt-0.5">{item.name}</div>
                    <div className="text-accent font-semibold mt-1">{fmt(item.price)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Stock: {item.stock}</div>
                    <div className="flex gap-2 mt-3 pt-2 border-t">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(item);
                          setModalOpen(true);
                        }}
                        className="flex-1 py-2 min-h-[40px] rounded-lg border text-sm hover:bg-muted flex items-center justify-center gap-1 touch-manipulation"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="p-2 min-h-[40px] min-w-[40px] rounded-lg border text-muted-foreground hover:text-destructive hover:border-destructive/30 touch-manipulation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <ConfirmDeleteModal
          open={deleteTarget !== null}
          title="Delete product"
          detail={deleteTarget?.name}
          confirmLabel="Delete"
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteMenuItem}
        />

        <MenuFormModal
          open={modalOpen}
          item={editing}
          categories={categories}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      </PageContainer>
    </PermissionGate>
  );
}
