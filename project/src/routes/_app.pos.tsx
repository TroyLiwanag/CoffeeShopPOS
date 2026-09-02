import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  usePos,
  Product,
  CartItem,
  fmt,
  DEFAULT_CATEGORIES,
  isProductAvailable,
} from "@/lib/pos-store";
import { Plus, Minus, Trash2, ShoppingCart, X, Search } from "lucide-react";
import { MenuItemVisual } from "@/components/menu/MenuItemVisual";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { ProcessingOverlay, type ProcessingState } from "@/components/ProcessingOverlay";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/pos")({
  component: PosScreen,
});

/** Snacks & rice meals use a simple add modal (no size / sugar / milk) */
const QUICK_ADD_CATEGORIES = new Set(["Snacks", "Rice Meals"]);

function isQuickAddProduct(p: Product) {
  return QUICK_ADD_CATEGORIES.has(p.category);
}

function buildQuickCartItem(product: Product): CartItem {
  return {
    id: crypto.randomUUID(),
    product,
    qty: 1,
    size: "",
    sugar: "",
    milk: "",
    addons: [],
    notes: "",
    unitPrice: product.price,
  };
}

function CartItemMeta({ item }: { item: CartItem }) {
  const opts = [item.size, item.sugar, item.milk].filter(Boolean);
  if (opts.length === 0 && item.addons.length === 0) return null;
  return (
    <>
      {opts.length > 0 && (
        <div className="text-xs text-muted-foreground mt-0.5">{opts.join(" · ")}</div>
      )}
      {item.addons.length > 0 && (
        <div className="text-xs text-muted-foreground truncate">+ {item.addons.join(", ")}</div>
      )}
    </>
  );
}

const SIZES = [{ name: "Medium", add: 0 }, { name: "Large", add: 20 }];
const SUGAR = ["No sugar", "Less", "Normal", "Extra"];
const MILK = ["Whole", "Oat (+₱10)", "Almond (+₱10)", "None"];
const ADDONS = [
  { name: "Extra shot", price: 20 },
  { name: "Whipped cream", price: 15 },
  { name: "Vanilla syrup", price: 10 },
  { name: "Caramel drizzle", price: 10 },
];

function useLiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function PosScreen() {
  const {
    user,
    cart,
    addToCart,
    removeFromCart,
    updateQty,
    cartSubtotal,
    vatAmount,
    serviceCharge,
    cartTotal,
    settings,
    menuItems,
    menuLoading,
  } = usePos();
  const navigate = useNavigate();
  const [category, setCategory] = useState<string>("Coffee");
  const [search, setSearch] = useState("");
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [floatingCartOpen, setFloatingCartOpen] = useState(false);
  const [cartRemoveId, setCartRemoveId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const fromMenu = [...new Set(menuItems.map((p) => p.category))];
    return [...new Set([...DEFAULT_CATEGORIES, ...fromMenu])];
  }, [menuItems]);

  useEffect(() => {
    if (categories.length && !categories.includes(category)) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  const products = useMemo(() => {
    let list = menuItems;
    if (category) list = list.filter((p) => p.category === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.description?.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  }, [menuItems, category, search]);

  const handleProductClick = (p: Product) => {
    if (!isProductAvailable(p)) return;
    setModalProduct(p);
  };
  const now = useLiveClock();
  const weekday = now.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
  const monthDay = now.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  const time = now.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const dateTimeLine = `${weekday}, ${monthDay} / ${time}`;

  const cartPanel = (
    <>
      <div className="px-4 py-3 md:px-5 md:py-4 border-b flex items-center justify-between shrink-0 glass-bar">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h2 className="font-display text-lg md:text-xl">Current Order</h2>
        </div>
        <span className="text-xs bg-muted px-2.5 py-1 rounded-full font-medium">
          {cart.length} items
        </span>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 md:p-4 space-y-2 min-h-0">
          {cart.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-10 md:py-12">
              Cart is empty. Tap a product to start.
            </div>
          )}
          {cart.map((item) => (
            <div key={item.id} className="glass-card rounded-xl p-3 border animate-fade-up">
              <div className="flex justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.product.name}</div>
                  <CartItemMeta item={item} />
                </div>
                <button
                  type="button"
                  onClick={() => setCartRemoveId(item.id)}
                  className="p-2 -m-1 text-muted-foreground hover:text-destructive touch-manipulation"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateQty(item.id, -1)}
                    className="w-10 h-10 rounded-full bg-muted hover:bg-border flex items-center justify-center touch-manipulation active:scale-95 transition-transform"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.id, 1)}
                    className="w-10 h-10 rounded-full bg-muted hover:bg-border flex items-center justify-center touch-manipulation active:scale-95 transition-transform"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="font-semibold text-sm">{fmt(item.unitPrice * item.qty)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-4 md:p-5 space-y-2 bg-card/95 backdrop-blur-sm shrink-0 safe-bottom">
          <Row label="Subtotal" value={fmt(cartSubtotal)} />
          {settings.vatEnabled && (
            <Row label={`VAT (${settings.vatRate}%) incl.`} value={fmt(vatAmount)} />
          )}
          {settings.serviceEnabled && (
            <Row label={`Service (${settings.serviceRate}%)`} value={fmt(serviceCharge)} />
          )}
          <div className="flex justify-between pt-2 border-t">
            <span className="font-display text-responsive-lg">Total</span>
            <span className="font-display text-responsive-xl text-primary">{fmt(cartTotal)}</span>
          </div>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => navigate({ to: "/payment" })}
            className="btn-primary w-full py-4 min-h-[52px] text-base mt-1"
          >
            Proceed to Pay
          </button>
        </div>
      </div>
    </>
  );

  const floatingCartPanel = (
    <div className="fixed z-30 inset-x-3 sm:inset-x-auto sm:right-4 bottom-20 sm:w-[min(420px,calc(100vw-2rem))] max-h-[72vh] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
      <div className="px-4 py-3 border-b flex items-center justify-between shrink-0 glass-bar">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h2 className="font-display text-lg">Current Order</h2>
        </div>
        <button
          type="button"
          onClick={() => setFloatingCartOpen(false)}
          className="p-2 rounded-lg hover:bg-muted touch-manipulation"
          aria-label="Close current order"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2 min-h-0">
        {cart.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10">
            Cart is empty. Tap a product to start.
          </div>
        )}
        {cart.map((item) => (
          <div key={item.id} className="glass-card rounded-xl p-3 border animate-fade-up">
            <div className="flex justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{item.product.name}</div>
                <CartItemMeta item={item} />
              </div>
              <button
                type="button"
                onClick={() => setCartRemoveId(item.id)}
                className="p-2 -m-1 text-muted-foreground hover:text-destructive touch-manipulation"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateQty(item.id, -1)}
                  className="w-10 h-10 rounded-full bg-muted hover:bg-border flex items-center justify-center touch-manipulation active:scale-95 transition-transform"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                <button
                  type="button"
                  onClick={() => updateQty(item.id, 1)}
                  className="w-10 h-10 rounded-full bg-muted hover:bg-border flex items-center justify-center touch-manipulation active:scale-95 transition-transform"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="font-semibold text-sm">{fmt(item.unitPrice * item.qty)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-4 space-y-2 bg-card/95 backdrop-blur-sm shrink-0">
        <Row label="Subtotal" value={fmt(cartSubtotal)} />
        {settings.vatEnabled && (
          <Row label={`VAT (${settings.vatRate}%) incl.`} value={fmt(vatAmount)} />
        )}
        {settings.serviceEnabled && (
          <Row label={`Service (${settings.serviceRate}%)`} value={fmt(serviceCharge)} />
        )}
        <div className="flex justify-between pt-2 border-t">
          <span className="font-display text-responsive-lg">Total</span>
          <span className="font-display text-responsive-xl text-primary">{fmt(cartTotal)}</span>
        </div>
        <button
          type="button"
          disabled={cart.length === 0}
          onClick={() => navigate({ to: "/payment" })}
          className="btn-primary w-full py-4 min-h-[52px] text-base mt-1"
        >
          Proceed to Pay
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 min-h-0 w-full max-w-[100vw] flex-col overflow-y-auto overscroll-y-contain xl:flex-row xl:overflow-hidden">
      {/* Products */}
      <div className="flex flex-col min-w-0 shrink-0 xl:flex-1 xl:min-h-0 xl:overflow-hidden">
        <header className="px-4 sm:px-6 lg:px-8 py-4 md:py-5 bg-card/90 backdrop-blur-md border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <time
              dateTime={now.toISOString()}
              className="text-xs sm:text-sm tracking-wide text-muted-foreground tabular-nums truncate block"
            >
              {dateTimeLine}
            </time>
            <h1 className="font-display text-responsive-xl mt-0.5 truncate">
              Good day, {user?.fullname?.split(" ")[0] ?? "there"}
            </h1>
          </div>
          <div className="sm:text-right shrink-0">
            <div className="text-xs text-muted-foreground">Station</div>
            <div className="font-medium">Counter #1</div>
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 pt-3 pb-2 shrink-0">
          <div className="relative group mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-accent" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu..."
              className="w-full pl-12 pr-4 py-3 min-h-[48px] rounded-2xl border bg-card shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent/40 focus:shadow-md"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "px-4 py-2.5 min-h-[44px] rounded-full text-sm font-medium whitespace-nowrap",
                  "transition-all duration-200 touch-manipulation active:scale-95",
                  category === c
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card border hover:bg-muted hover:shadow-sm",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-3 md:py-4 xl:flex-1 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain pb-24 xl:pb-4">
          {menuLoading && menuItems.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="product-card skeleton aspect-[3/4] min-h-[180px]" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No menu items found. {search ? "Try a different search." : "Add items in Menu Management."}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
              {products.map((p) => {
                const available = isProductAvailable(p);
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!available}
                    onClick={() => handleProductClick(p)}
                    className={cn(
                      "product-card group text-left touch-manipulation relative",
                      !available && "opacity-60 cursor-not-allowed",
                    )}
                  >
                    <div className="aspect-square rounded-xl overflow-hidden mb-2 md:mb-3 transition-transform duration-200 group-hover:scale-105 group-disabled:hover:scale-100">
                      {p.image || p.icon ? (
                        <MenuItemVisual
                          image={p.image}
                          icon={p.icon}
                          name={p.name}
                          iconClassName="w-10 h-10 sm:w-12 sm:h-12"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-4xl sm:text-5xl"
                          style={{ background: "var(--cream)" }}
                        >
                          {p.emoji}
                        </div>
                      )}
                    </div>
                    {!available && (
                      <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                        Out of Stock
                      </span>
                    )}
                    <div className="font-medium text-foreground text-sm md:text-base line-clamp-2 leading-snug">
                      {p.name}
                    </div>
                    <div className="text-sm text-accent font-semibold mt-1">{fmt(p.price)}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart — side panel on xl+ only */}
      <aside
        className={cn(
          "hidden xl:flex xl:flex-col shrink-0",
          "bg-card border-l w-[min(100%,22rem)] 2xl:w-96",
          "xl:min-h-0 xl:self-stretch",
        )}
      >
        {cartPanel}
      </aside>

      {/* Mobile & tablet — floating cart button + panel */}
      {floatingCartOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 xl:hidden animate-fade-in"
          onClick={() => setFloatingCartOpen(false)}
          aria-hidden
        />
      )}
      {floatingCartOpen && <div className="xl:hidden">{floatingCartPanel}</div>}
      <button
        type="button"
        onClick={() => setFloatingCartOpen((v) => !v)}
        className="inline-flex xl:hidden fixed bottom-5 right-5 z-30 items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-full bg-primary text-primary-foreground shadow-xl touch-manipulation active:scale-95 transition-transform safe-bottom"
        aria-label="Open current order"
      >
        <ShoppingCart className="w-5 h-5 shrink-0" />
        <span className="text-sm font-medium leading-none">{cart.length} items</span>
      </button>

      {modalProduct &&
        (isQuickAddProduct(modalProduct) ? (
          <SimpleAddModal
            product={modalProduct}
            onClose={() => setModalProduct(null)}
            onAdd={addToCart}
          />
        ) : (
          <CustomizeModal
            product={modalProduct}
            onClose={() => setModalProduct(null)}
            onAdd={addToCart}
          />
        ))}

      <ConfirmDeleteModal
        open={cartRemoveId !== null}
        title="Remove from cart"
        detail={cartRemoveId ? cart.find((c) => c.id === cartRemoveId)?.product.name : undefined}
        confirmLabel="Remove"
        onClose={() => setCartRemoveId(null)}
        onConfirm={async () => {
          if (cartRemoveId) removeFromCart(cartRemoveId);
        }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SimpleAddModal({
  product,
  onClose,
  onAdd,
}: {
  product: Product;
  onClose: () => void;
  onAdd: (i: CartItem) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [overlay, setOverlay] = useState<ProcessingState>("idle");

  const submit = async () => {
    if (adding) return;
    setAdding(true);
    setOverlay("processing");
    await new Promise((r) => setTimeout(r, 400));
    onAdd(buildQuickCartItem(product));
    setOverlay("success");
    await new Promise((r) => setTimeout(r, 550));
    onClose();
    setOverlay("idle");
    setAdding(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 modal-backdrop animate-fade-in"
      onClick={onClose}
    >
      <div
        className="modal-panel relative w-full sm:max-w-md flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <ProcessingOverlay
          state={overlay}
          processingLabel="Adding to cart…"
          successLabel="Added to cart!"
        />
        <div className="glass-bar px-4 sm:px-6 py-4 border-b flex items-center justify-between gap-3 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-inner">
              {product.image || product.icon ? (
                <MenuItemVisual
                  image={product.image}
                  icon={product.icon}
                  name={product.name}
                  iconClassName="w-8 h-8"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-3xl"
                  style={{ background: "var(--cream)" }}
                >
                  {product.emoji}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-responsive-lg truncate">{product.name}</h3>
              <div className="text-xs text-muted-foreground capitalize">{product.category}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-3 rounded-xl hover:bg-muted touch-manipulation active:scale-95"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div className="text-center py-2">
            <div className="font-display text-responsive-2xl text-primary">{fmt(product.price)}</div>
            {product.description ? (
              <p className="text-sm text-muted-foreground mt-2">{product.description}</p>
            ) : null}
          </div>
        </div>

        <div className="glass-bar border-t p-4 sm:p-5 flex gap-3 safe-bottom rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 min-h-[52px] rounded-lg border hover:bg-muted touch-manipulation"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={adding}
            className="btn-primary flex-1 py-4 min-h-[52px]"
          >
            {adding ? "Processing…" : "Add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomizeModal({
  product,
  onClose,
  onAdd,
}: {
  product: Product;
  onClose: () => void;
  onAdd: (i: CartItem) => void;
}) {
  const [size, setSize] = useState(SIZES[1].name);
  const [sugar, setSugar] = useState(SUGAR[2]);
  const [milk, setMilk] = useState(MILK[0]);
  const [addons, setAddons] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const sizeAdd = SIZES.find((s) => s.name === size)?.add ?? 0;
  const milkAdd = milk.includes("+₱10") ? 10 : 0;
  const addonsTotal = ADDONS.filter((a) => addons.includes(a.name)).reduce(
    (s, a) => s + a.price,
    0,
  );
  const unitPrice = product.price + sizeAdd + milkAdd + addonsTotal;

  const toggle = (name: string) =>
    setAddons((a) => (a.includes(name) ? a.filter((x) => x !== name) : [...a, name]));

  const [adding, setAdding] = useState(false);
  const [overlay, setOverlay] = useState<ProcessingState>("idle");

  const submit = async () => {
    if (adding) return;
    setAdding(true);
    setOverlay("processing");
    await new Promise((r) => setTimeout(r, 400));
    onAdd({
      id: crypto.randomUUID(),
      product,
      qty: 1,
      size,
      sugar,
      milk,
      addons,
      notes,
      unitPrice,
    });
    setOverlay("success");
    await new Promise((r) => setTimeout(r, 550));
    onClose();
    setOverlay("idle");
    setAdding(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 modal-backdrop animate-fade-in"
      onClick={onClose}
    >
      <div
        className="modal-panel relative w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[90vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <ProcessingOverlay
          state={overlay}
          processingLabel="Adding to cart…"
          successLabel="Added to cart!"
        />
        <div className="sticky top-0 z-10 glass-bar px-4 sm:px-6 py-4 border-b flex items-center justify-between gap-3 rounded-t-2xl sm:rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-inner">
              {product.image || product.icon ? (
                <MenuItemVisual
                  image={product.image}
                  icon={product.icon}
                  name={product.name}
                  iconClassName="w-8 h-8"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-3xl"
                  style={{ background: "var(--cream)" }}
                >
                  {product.emoji}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-responsive-lg truncate">{product.name}</h3>
              <div className="text-sm text-muted-foreground">{fmt(product.price)} base</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-3 rounded-xl hover:bg-muted touch-manipulation active:scale-95"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 overscroll-contain">
          <Section label="Size">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SIZES.map((s) => (
                <Pill key={s.name} active={size === s.name} onClick={() => setSize(s.name)}>
                  {s.name}
                  {s.add ? ` +${fmt(s.add)}` : ""}
                </Pill>
              ))}
            </div>
          </Section>
          <Section label="Sugar">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SUGAR.map((s) => (
                <Pill key={s} active={sugar === s} onClick={() => setSugar(s)}>
                  {s}
                </Pill>
              ))}
            </div>
          </Section>
          <Section label="Milk">
            <div className="grid grid-cols-2 gap-2">
              {MILK.map((m) => (
                <Pill key={m} active={milk === m} onClick={() => setMilk(m)}>
                  {m}
                </Pill>
              ))}
            </div>
          </Section>
          <Section label="Add-ons">
            <div className="space-y-2">
              {ADDONS.map((a) => (
                <label
                  key={a.name}
                  className="flex items-center justify-between p-3 min-h-[52px] rounded-xl border cursor-pointer hover:bg-muted/80 touch-manipulation transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={addons.includes(a.name)}
                      onChange={() => toggle(a.name)}
                      className="w-5 h-5 accent-[var(--caramel)]"
                    />
                    <span className="text-sm">{a.name}</span>
                  </div>
                  <span className="text-sm font-medium">+{fmt(a.price)}</span>
                </label>
              ))}
            </div>
          </Section>
          <Section label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. extra hot, no foam"
              className="w-full px-3 py-3 rounded-xl border bg-background text-base focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Section>
        </div>

        <div className="sticky bottom-0 glass-bar border-t p-4 sm:p-5 flex items-center justify-between gap-3 safe-bottom rounded-b-2xl">
          <div>
            <div className="text-xs text-muted-foreground">Item total</div>
            <div className="font-display text-responsive-xl">{fmt(unitPrice)}</div>
          </div>
          <button type="button" onClick={submit} disabled={adding} className="btn-primary flex-1 py-4 min-h-[52px]">
            {adding ? "Processing…" : "Add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium text-foreground mb-2">{label}</div>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-3 min-h-[44px] rounded-xl text-sm border transition-all duration-200 touch-manipulation active:scale-95",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-background hover:bg-muted hover:border-accent/30",
      )}
    >
      {children}
    </button>
  );
}
