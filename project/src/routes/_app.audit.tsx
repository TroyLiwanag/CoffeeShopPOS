import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { usePos } from "@/lib/pos-store";
import {
  fetchAuditLogs,
  fetchAuditModules,
  fetchAuditUsers,
  downloadAuditCsv,
  openAuditPdf,
  type AuditLog,
  type AuditFilters,
} from "@/lib/audit-api";
import { FileSearch, Download, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { withActionFeedbackSafe } from "@/lib/action-feedback";

export const Route = createFileRoute("/_app/audit")({
  component: AuditScreen,
});

type Period = AuditFilters["period"];

function AuditScreen() {
  const { user } = usePos();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("");
  const [userId, setUserId] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modules, setModules] = useState<string[]>([]);
  const [users, setUsers] = useState<{ id: number | null; name: string }[]>([]);

  const isAdmin = user?.role === "admin";

  const filters: AuditFilters = {
    page,
    limit: 20,
    search: search || undefined,
    module: module || undefined,
    userId: userId || undefined,
    period,
    dateFrom: period === "custom" ? dateFrom : undefined,
    dateTo: period === "custom" ? dateTo : undefined,
  };

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAuditLogs(filters);
      setLogs(result.data);
      setTotalPages(result.pagination.totalPages);
      setTotal(result.pagination.total);
    } catch (err: unknown) {
      setLogs([]);
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { message?: string }; status?: number } }).response?.data?.message
          || `HTTP ${(err as { response?: { status?: number } }).response?.status}`
        : "Cannot reach audit API";
      setError(msg || "Failed to load audit logs. Restart the API from CoffeeShop/api.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, search, module, userId, period, dateFrom, dateTo]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAuditModules().then(setModules).catch(() => {});
    fetchAuditUsers().then(setUsers).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, module, userId, period, dateFrom, dateTo]);

  if (!isAdmin) {
    return <Navigate to="/pos" />;
  }

  return (
    <PageContainer wide className="pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <FileSearch className="w-7 h-7 text-accent shrink-0" />
          <div>
            <h1 className="font-display text-responsive-3xl">Audit Log</h1>
            <p className="text-sm text-muted-foreground">{total} entries · Admin only</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              withActionFeedbackSafe(() => downloadAuditCsv(filters), {
                loading: "Exporting CSV…",
                success: "Audit log exported!",
                error: "Export failed.",
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 touch-manipulation"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            type="button"
            onClick={() =>
              withActionFeedbackSafe(() => openAuditPdf(filters), {
                loading: "Generating PDF…",
                success: "PDF ready!",
                error: "PDF export failed.",
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg border bg-card text-sm hover:bg-muted touch-manipulation"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg border border-destructive/40 bg-destructive/10 text-sm text-destructive">
          {error}. Make sure the API is running from <code className="font-mono">CoffeeShop/api</code> and shows
          &quot;/api/audit&quot; in the startup log. Stop any old process on port 5000, then run <code className="font-mono">npm run dev</code> again.
        </div>
      )}

      <div className="bg-card rounded-2xl border p-4 mb-4 space-y-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search user, action, module…"
          className="w-full px-4 py-3 rounded-lg border bg-background text-sm"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={module}
            onChange={(e) => setModule(e.target.value)}
            className="px-3 py-2.5 rounded-lg border bg-background text-sm"
          >
            <option value="">All modules</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="px-3 py-2.5 rounded-lg border bg-background text-sm"
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={String(u.id)} value={u.id ?? ""}>
                {u.name}
              </option>
            ))}
          </select>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="px-3 py-2.5 rounded-lg border bg-background text-sm sm:col-span-2 lg:col-span-1"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="custom">Custom range</option>
          </select>
        </div>
        {period === "custom" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2.5 rounded-lg border bg-background text-sm"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2.5 rounded-lg border bg-background text-sm"
            />
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-muted">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Loading audit logs…
                  </td>
                </tr>
              )}
              {!loading &&
                logs.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{a.userName}</td>
                    <td className="px-4 py-3 text-sm">{a.actionType}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-0.5 rounded-full bg-muted text-xs">{a.moduleName}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                      {a.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {a.ipAddress || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[140px] truncate">
                      {a.deviceLabel}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No audit entries match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded-lg border bg-card disabled:opacity-40 touch-manipulation"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-lg border bg-card disabled:opacity-40 touch-manipulation"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
