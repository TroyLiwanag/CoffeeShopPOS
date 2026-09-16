import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { usePos, fmt } from "@/lib/pos-store";
import { Download, TrendingUp, ShoppingBag, DollarSign, Lock } from "lucide-react";
import { PermissionGate } from "@/components/PermissionGate";
import { hasPermission } from "@/lib/permissions";
import api from "@/lib/api";
import { PageContainer } from "@/components/layout/PageContainer";
import { withActionFeedbackSafe } from "@/lib/action-feedback";
import { SalesTrendChart } from "@/components/reports/SalesTrendChart";
import { ConfirmActionModal } from "@/components/ConfirmActionModal";

type TrendBucket = {
  dayKey: string;
  label: string;
  fullLabel: string;
  value: number;
  orders: number;
};

/** Parse API day field (YYYY-MM-DD or ISO datetime from MySQL). */
function parseReportDay(day: unknown): Date | null {
  if (day == null || day === "") return null;
  if (day instanceof Date && !Number.isNaN(day.getTime())) return day;
  const s = String(day).trim();
  const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    const y = Number(dateOnly[1]);
    const m = Number(dateOnly[2]);
    const d = Number(dateOnly[3]);
    const local = new Date(y, m - 1, d, 12, 0, 0, 0);
    return Number.isNaN(local.getTime()) ? null : local;
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatReportDayLabels(date: Date) {
  return {
    label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    fullLabel: date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  };
}

export const Route = createFileRoute("/_app/reports")({
  component: ReportsScreen,
});

type Range = "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly" | "All-Time";

function ReportsScreen() {
  const { user } = usePos();
  const [range, setRange] = useState<Range>("Daily");
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const canExport = user && hasPermission(user.permissions, user.role, "canExportReports");
  const [summary, setSummary] = useState<{
    totalSales: number;
    totalOrders: number;
    vatTotal: number;
    discountTotal: number;
    byDay: Array<{ day: string; label?: string; fullLabel?: string; sales: number; orders: number }>;
    topProducts: Array<{ name: string; qty: number; revenue: number }>;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .get("/reports/summary", { params: { range } })
      .then(({ data }) => {
        if (!mounted) return;
        setSummary(data);
      })
      .catch(() => {
        if (!mounted) return;
        setSummary({ totalSales: 0, totalOrders: 0, vatTotal: 0, discountTotal: 0, byDay: [], topProducts: [] });
      });
    return () => {
      mounted = false;
    };
  }, [range]);

  const { total, count, avg, buckets, chartData, top, vatTotal, discountTotal } = useMemo(() => {
    const byDay = summary?.byDay ?? [];
    const safeBars: TrendBucket[] = byDay.map((d) => ({
      dayKey: d.day,
      label: d.label || d.day,
      fullLabel: d.fullLabel || d.label || d.day,
      value: Number(d.sales) || 0,
      orders: Number(d.orders) || 0,
    }));

    const totalSales = Number(summary?.totalSales || 0);
    const totalOrders = Number(summary?.totalOrders || 0);
    const chartData = safeBars.map((b) => ({
      label: b.label,
      fullLabel: b.fullLabel,
      revenue: b.value,
      orders: b.orders,
    }));

    return {
      total: totalSales,
      count: totalOrders,
      avg: totalOrders > 0 ? totalSales / totalOrders : 0,
      buckets: safeBars,
      chartData,
      top: (summary?.topProducts ?? []).slice(0, 7).map((p) => ({
        ...p,
        qty: Number(p.qty) || 0,
        revenue: Number(p.revenue) || 0,
      })),
      vatTotal: Number(summary?.vatTotal || 0),
      discountTotal: Number(summary?.discountTotal || 0),
    };
  }, [summary]);

  const getGraphSubtitle = () => {
    switch (range) {
      case "Daily":
        return "Hourly sales for today — tap a bar for details";
      case "Weekly":
        return "Weekly sales breakdown (1 bar per week, Monday to Sunday) — tap a bar for details";
      case "Monthly":
        return "Monthly sales for the current year (Jan to Dec) — tap a bar for details";
      case "Quarterly":
        return "Monthly sales for the last 90 days — tap a bar for details";
      case "Yearly":
        return "Yearly sales breakdown (2024, 2025, 2026…) — tap a bar for details";
      case "All-Time":
        return "All-time yearly sales breakdown — tap a bar for details";
      default:
        return "Sales breakdown — tap a bar for details";
    }
  };

  const exportCsv = () => {
    if (!canExport) { alert("Only authorized personnel can export reports."); return; }
    void withActionFeedbackSafe(async () => {
    const rows = [
      ["Range", range],
      ["Total Revenue", total.toFixed(2)],
      ["Orders", String(count)],
      ["Average Ticket", avg.toFixed(2)],
      ["VAT Collected", vatTotal.toFixed(2)],
      ["Discounts Granted", discountTotal.toFixed(2)],
      [],
      ["Period", "Sales"],
      ...buckets.map(b => [b.label, b.value.toFixed(2)]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `sales-${range.toLowerCase()}.csv`; a.click();
    URL.revokeObjectURL(url);
    await api.post("/reports/export-log", {
      reportType: range,
      details: `Sales CSV export — ${range} — ₱${total.toFixed(2)}`,
    }).catch(() => {});
    }, {
      loading: "Exporting report…",
      success: "Report exported!",
      error: "Export failed.",
    });
  };

  return (
    <PermissionGate path="/reports">
    <PageContainer wide>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="font-display text-responsive-3xl">Sales & Revenue Report</h1>
          <p className="text-sm text-muted-foreground">All reporting periods</p>
        </div>
        <button type="button" onClick={() => setExportConfirmOpen(true)} disabled={!canExport}
                title={canExport ? "" : "Authorized personnel only"}
                className="btn-primary text-sm shrink-0 disabled:opacity-40">
          {canExport ? <Download className="w-4 h-4" /> : <Lock className="w-4 h-4" />} Export CSV
        </button>
      </div>

      <ConfirmActionModal
        open={exportConfirmOpen}
        title="Export Sales Report"
        message={`Are you sure you want to export the ${range} Sales & Revenue report?`}
        confirmLabel="Export CSV"
        variant="primary"
        onClose={() => setExportConfirmOpen(false)}
        onConfirm={exportCsv}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {(["Daily", "Weekly", "Monthly", "Quarterly", "Yearly", "All-Time"] as Range[]).map(r => (
          <button key={r} onClick={() => setRange(r)}
                  className={`px-5 py-2 rounded-full text-sm font-medium ${
                    range === r ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"
                  }`}>{r}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="Revenue" value={fmt(total)} accent />
        <StatCard icon={<ShoppingBag className="w-5 h-5" />} label="Orders" value={String(count)} />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Avg. ticket" value={fmt(avg)} />
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="VAT collected" value={fmt(vatTotal)} />
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="Discounts" value={fmt(discountTotal)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 glass-card rounded-2xl border p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="font-display text-xl">{range} Sales Graph</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {getGraphSubtitle()}
              </p>
            </div>
          </div>
          <SalesTrendChart data={chartData} />
        </div>

        <div className="glass-card rounded-2xl border p-4 sm:p-6">
          <h2 className="font-display text-xl mb-4">Top products</h2>
          {top.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales in this period yet.</p>
          ) : (
            <div className="space-y-3">
              {top.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center font-medium">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.qty} sold</div>
                  </div>
                  <div className="font-semibold text-sm">{fmt(p.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* REVISION 11: Sales by Category / Best Sellers Section */}
      <CategorySalesSection range={range} />
    </PageContainer>
    </PermissionGate>
  );
}

function CategorySalesSection({ range }: { range: string }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categoryData, setCategoryData] = useState<Array<{
    category: string;
    totalQty: number;
    totalSales: number;
    topSeller: string;
    items: Array<{ rank: number; productName: string; qtySold: number; salesAmount: number }>;
  }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get("/reports/by-category", { params: { range, category: selectedCategory } })
      .then(({ data }) => {
        if (!mounted) return;
        setCategoryData(data.categories || []);
      })
      .catch(() => {
        if (!mounted) return;
        setCategoryData([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [range, selectedCategory]);

  return (
    <div className="glass-card rounded-2xl border p-4 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-xl">Sales by Category & Best Sellers</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Performance breakdown and ranking per menu category ({range})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="cat-filter" className="text-xs font-medium text-muted-foreground shrink-0">Filter Category:</label>
          <select
            id="cat-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-lg border bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="Coffee">Coffee</option>
            <option value="Non-Coffee">Non-Coffee</option>
            <option value="Pastries">Pastries</option>
            <option value="Food">Food</option>
            <option value="Merchandise">Merchandise</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading category analysis…</div>
      ) : categoryData.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No sales data found for the selected category filter and timeframe.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryData.map((cat) => (
            <div key={cat.category} className="rounded-xl border bg-card/60 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b pb-3 mb-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-primary">{cat.category}</h3>
                    <p className="text-xs text-muted-foreground">{cat.totalQty} items sold total</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-base">{fmt(cat.totalSales)}</div>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                      Top: {cat.topSeller}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {cat.items.map((item) => (
                    <div key={item.productName} className="flex items-center justify-between text-xs py-1 hover:bg-muted/50 px-1.5 rounded transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          item.rank === 1 ? "bg-amber-500/20 text-amber-600" :
                          item.rank === 2 ? "bg-slate-400/20 text-slate-600" :
                          item.rank === 3 ? "bg-amber-700/20 text-amber-800" : "bg-muted text-muted-foreground"
                        }`}>
                          #{item.rank}
                        </span>
                        <span className="font-medium truncate">{item.productName}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className="text-muted-foreground font-mono">{item.qtySold} sold</span>
                        <span className="font-semibold text-foreground">{fmt(item.salesAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 hover-card ${accent ? "bg-primary text-primary-foreground" : "glass-card"}`}>
      <div className={`flex items-center gap-2 text-xs ${accent ? "opacity-80" : "text-muted-foreground"}`}>
        {icon} {label}
      </div>
      <div className="font-display text-2xl mt-2">{value}</div>
    </div>
  );
}
