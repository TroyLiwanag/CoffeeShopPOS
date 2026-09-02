import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Upload, ImageIcon } from "lucide-react";
import type { MenuFormData, MenuItem } from "@/lib/menu-api";
import { menuImageUrl } from "@/lib/menu-api";
import { MENU_ICON_OPTIONS, MenuIconDisplay, getIconForCategory } from "@/lib/menu-icons";
import { cn } from "@/lib/utils";
import { ProcessingOverlay, type ProcessingState } from "@/components/ProcessingOverlay";

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

const DEFAULT_CATEGORIES = [
  "Coffee",
  "Tea",
  "Non-Coffee",
  "Iced Blended",
  "Snacks",
  "Rice Meals",
  "Pastry",
];

type Props = {
  open: boolean;
  item?: MenuItem | null;
  categories: string[];
  onClose: () => void;
  onSave: (form: MenuFormData, imageFile: File | null, removeImage: boolean) => Promise<void>;
};

const blank: MenuFormData = {
  name: "",
  category: "Coffee",
  description: "",
  price: 0,
  icon: "coffee",
  stock: 0,
  status: "available",
};

export function MenuFormModal({ open, item, categories, onClose, onSave }: Props) {
  const [form, setForm] = useState<MenuFormData>(blank);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [overlay, setOverlay] = useState<ProcessingState>("idle");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...categories])];

  useEffect(() => {
    if (!open) return;
    if (item) {
      const cat = item.category || "Coffee";
      setForm({
        name: item.name,
        category: cat,
        description: item.description || "",
        price: item.price,
        icon: getIconForCategory(cat),
        stock: item.stock,
        status: item.status,
      });
      setPreview(menuImageUrl(item.image));
      setRemoveImage(false);
    } else {
      const defaultCat = "Coffee";
      setForm({
        ...blank,
        category: defaultCat,
        icon: getIconForCategory(defaultCat),
      });
      setPreview(null);
      setRemoveImage(false);
    }
    setImageFile(null);
    setOverlay("idle");
  }, [open, item]);

  const pickFile = (file: File | null) => {
    if (!file) return;
    if (!/\.(png|jpe?g|webp)$/i.test(file.name)) {
      alert("Only PNG, JPG, and WEBP images are allowed.");
      return;
    }
    setImageFile(file);
    setRemoveImage(false);
    setPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    pickFile(file || null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category || form.price < 0) return;
    setOverlay("processing");
    try {
      await onSave(form, imageFile, removeImage);
      setOverlay("success");
      await pause(750);
      onClose();
      setOverlay("idle");
    } catch {
      setOverlay("error");
      await pause(1800);
      setOverlay("idle");
    }
  };

  const saving = overlay === "processing";

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-4 modal-backdrop animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-form-modal-title"
    >
      <form
        className="modal-panel relative w-full sm:max-w-lg max-h-[92dvh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <ProcessingOverlay
          state={overlay}
          processingLabel={item ? "Saving changes…" : "Adding product…"}
          successLabel={item ? "Changes saved!" : "Product added!"}
        />
        <div className="sticky top-0 glass-bar px-4 sm:px-6 py-4 border-b flex items-center justify-between rounded-t-2xl">
          <h2 id="product-form-modal-title" className="font-display text-responsive-lg">
            {item ? "Edit product" : "Add product"}
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
          <div>
            <label className="text-sm font-medium">Product name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-lg border bg-background"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Category *</label>
              <select
                value={form.category}
                onChange={(e) => {
                  const selectedCategory = e.target.value;
                  setForm((f) => ({
                    ...f,
                    category: selectedCategory,
                    icon: getIconForCategory(selectedCategory),
                  }));
                }}
                className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-lg border bg-background"
              >
                {allCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Price (₱) *</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.price || ""}
                onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))}
                className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-lg border bg-background"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border bg-background"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Stock</label>
              <input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) || 0 }))}
                className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-lg border bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as MenuFormData["status"],
                  }))
                }
                className="mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-lg border bg-background"
              >
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Icon (when no image)</label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {MENU_ICON_OPTIONS.map((opt) => {
                const isSelected = form.icon === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={true}
                    aria-disabled="true"
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-xl border min-h-[64px] transition-all cursor-not-allowed opacity-40 select-none",
                      isSelected &&
                        "border-primary bg-primary/10 shadow-sm scale-105 opacity-100 ring-2 ring-primary/40 font-bold text-primary",
                    )}
                  >
                    <MenuIconDisplay iconId={opt.id} className="w-6 h-6" />
                    <span className="text-[10px] text-muted-foreground">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Image upload</label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
                dragOver ? "border-accent bg-accent/5" : "border-border hover:border-accent/50",
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] || null)}
              />
              {preview ? (
                <div className="space-y-3">
                  <img
                    src={preview}
                    alt="Preview"
                    className="mx-auto max-h-32 rounded-lg object-cover"
                  />
                  <div className="flex justify-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        inputRef.current?.click();
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg border hover:bg-muted"
                    >
                      Change image
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                        setPreview(null);
                        setRemoveImage(true);
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg border text-destructive hover:bg-destructive/10"
                    >
                      Remove image
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-60" />
                  <p className="text-sm">Drag & drop or click to upload</p>
                  <p className="text-xs mt-1">PNG, JPG, WEBP — max 5MB</p>
                </div>
              )}
            </div>
            {!preview && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" /> Selected icon will show on POS if no image
              </p>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 glass-bar border-t p-4 sm:p-5 flex gap-3 safe-bottom rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 min-h-[48px] rounded-lg border hover:bg-muted"
          >
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 py-3 min-h-[48px]">
            {saving ? "Processing…" : item ? "Save changes" : "Add item"}
          </button>
        </div>
      </form>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}
