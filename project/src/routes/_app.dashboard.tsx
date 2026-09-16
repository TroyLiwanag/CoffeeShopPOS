import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePos, fmt, getExpirationStatus } from "@/lib/pos-store";
import {
  LayoutDashboard,
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  Tag,
  ArrowRight,
  Package,
  Plus,
  BarChart3,
  Coffee,
  CheckCircle2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { SalesTrendChart } from "@/components/reports/SalesTrendChart";
import api from "@/lib/api";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardScreen,
});

type CategorySummary = {
  category: string;
  totalQty: number;
  totalSales: number;
  topSeller: string;
};

function DashboardScreen() {
  const { user, orders, ingredients, menuItems } = usePos();
  const navigate = useNavigate();

  const [categoriesSummary, setCategoriesSummary] = useState<CategorySummary[]>([]);
  const [reportData, setReportData] = useState<{
    totalSales: number;
    totalOrders: number;
    byDay: Array<{ day: string; label?: string; fullLabel?: string; sales: number; orders: number }>;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    api.get("/reports/summary", { params: { range: "Daily" } })
      .then(({ data }) => {
        if (mounted) setReportData(data);
      })
      .catch(() => {});

    api.get("/reports/by-category", { params: { range: "All-Time" } })
      .then(({ data }) => {
        if (mounted && data?.categories) {
          setCategoriesSummary(
            data.categories.map((c: any) => ({
              category: c.category,
              totalQty: c.totalQty,
              totalSales: c.totalSales,
              topSeller: c.topSeller,
            })),
          );
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const validOrders = orders.filter((o) => o.orderStatus !== "voided" && o.orderStatus !== "cancelled");
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOrders = validOrders.filter((o) => (o.createdAt || "").startsWith(todayStr));
  const todaySalesTotal = todayOrders.reduce((sum, o) => sum + o.total, 0);

  const lowStockItems = ingredients.filter((i) => (i.stock / (i.min || 1)) * 100 <= 30);
  const expiredItems = ingredients.filter((i) => getExpirationStatus(i.batchNo)?.type === "expired");

  const chartData = (reportData?.byDay || []).map((b) => ({
    label: b.label || b.day,
    fullLabel: b.fullLabel || b.day,
    revenue: Number(b.sales) || 0,
    orders: Number(b.orders) || 0,
  }));

  return (
    <PageContainer wide className="pb-10">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-responsive-3xl text-foreground">
              Welcome back, {user?.fullname || "Staff"}! 👋
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-accent/20 text-accent border border-accent/30 capitalize">
              {user?.role || "Staff"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Café Corazon Smart Dashboard & Station Performance Overview
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/pos" })}
            className="btn-primary px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-md text-sm font-semibold"
          >
            <Coffee className="w-4 h-4" /> Open POS Terminal
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass-card rounded-2xl border p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Today's Sales
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              ₱
            </div>
          </div>
          <div className="font-display text-2xl font-bold text-foreground">
            {fmt(todaySalesTotal)}
          </div>
          <p className="text-xs text-muted-foreground">
            {todayOrders.length} valid completed orders today
          </p>
        </div>

        <div className="glass-card rounded-2xl border p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Orders Processed
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <ShoppingBag className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="font-display text-2xl font-bold text-foreground">
            {validOrders.length}
          </div>
          <p className="text-xs text-muted-foreground">Total successful order history</p>
        </div>

        <div className="glass-card rounded-2xl border p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Low Stock Items
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="font-display text-2xl font-bold text-foreground">
            {lowStockItems.length}
          </div>
          <p className="text-xs text-muted-foreground">
            {expiredItems.length > 0 ? `${expiredItems.length} expired batches` : "Items near reorder level"}
          </p>
        </div>

        <div className="glass-card rounded-2xl border p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Menu Items
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Package className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="font-display text-2xl font-bold text-foreground">
            {menuItems.length}
          </div>
          <p className="text-xs text-muted-foreground">Available products & drinks</p>
        </div>
      </div>

      {/* Main Grid — Sales Trend & Top Selling Categories Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left: Sales Trend Chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl border p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              <h2 className="font-display text-xl">Today's Sales Trend</h2>
            </div>
            <Link to="/reports" className="text-xs text-accent font-semibold hover:underline flex items-center gap-1">
              Full Analytics <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <SalesTrendChart data={chartData} />
        </div>

        {/* Right: REVISION 11 — Top Selling Categories Summary Card */}
        <div className="glass-card rounded-2xl border p-5 sm:p-6 space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-accent" />
              <h2 className="font-display text-lg">Top Selling Categories</h2>
            </div>
            <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-bold">Summary</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-1">
            {categoriesSummary.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Loading category analytics…</p>
            ) : (
              categoriesSummary.slice(0, 5).map((cat, idx) => (
                <div
                  key={cat.category}
                  className="p-3 rounded-xl border bg-card/60 flex items-center justify-between text-sm"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-foreground flex items-center gap-1.5 truncate">
                      <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-[11px] font-extrabold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate">{cat.category}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      Top: <strong className="text-foreground font-medium">{cat.topSeller}</strong>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-accent">{cat.totalQty} sold</div>
                    <div className="text-[11px] text-muted-foreground">{fmt(cat.totalSales)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t text-right">
            <Link to="/reports" className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1">
              View Detailed Category Report <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts & Inventory Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Stock Alerts */}
        <div className="glass-card rounded-2xl border p-5 space-y-3">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="font-display text-lg">Inventory Alerts</h2>
            </div>
            <Link to="/inventory" className="text-xs text-accent font-semibold hover:underline">
              Manage Inventory
            </Link>
          </div>

          {lowStockItems.length === 0 && expiredItems.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> All inventory stocks are in good condition!
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockItems.slice(0, 4).map((i) => (
                <div key={i.id} className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/20 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-foreground">{i.name}</span> ({i.category})
                    <div className="text-muted-foreground">Min reorder level: {i.min} {i.unit}</div>
                  </div>
                  <span className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold font-mono">
                    {i.stock} {i.unit} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Station Shortcuts */}
        <div className="glass-card rounded-2xl border p-5 space-y-3">
          <div className="border-b pb-3">
            <h2 className="font-display text-lg">Quick Station Shortcuts</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/pos"
              className="p-4 rounded-xl border bg-card hover:bg-muted/80 transition-all flex flex-col gap-2 group active:scale-95"
            >
              <Coffee className="w-6 h-6 text-accent group-hover:scale-110 transition-transform" />
              <span className="font-bold text-sm text-foreground">POS Terminal</span>
              <span className="text-xs text-muted-foreground">Take cashier orders</span>
            </Link>

            <Link
              to="/orders"
              className="p-4 rounded-xl border bg-card hover:bg-muted/80 transition-all flex flex-col gap-2 group active:scale-95"
            >
              <ShoppingBag className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-sm text-foreground">Orders & Void</span>
              <span className="text-xs text-muted-foreground">Transaction records</span>
            </Link>

            <Link
              to="/inventory"
              className="p-4 rounded-xl border bg-card hover:bg-muted/80 transition-all flex flex-col gap-2 group active:scale-95"
            >
              <Package className="w-6 h-6 text-purple-500 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-sm text-foreground">Batch Inventory</span>
              <span className="text-xs text-muted-foreground">Stocks & Expirations</span>
            </Link>

            <Link
              to="/promos"
              className="p-4 rounded-xl border bg-card hover:bg-muted/80 transition-all flex flex-col gap-2 group active:scale-95"
            >
              <Tag className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-sm text-foreground">Store Promos</span>
              <span className="text-xs text-muted-foreground">Discounts & Coupons</span>
            </Link>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
