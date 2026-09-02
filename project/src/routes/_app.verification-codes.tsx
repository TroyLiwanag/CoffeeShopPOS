import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { usePos } from "@/lib/pos-store";
import {
  fetchVerificationCodes,
  adminGenerateVerificationCode,
  markVerificationCodeUsed,
  deleteVerificationCode,
  deleteVerificationCodes,
  deleteAllVerificationCodes,
  type VerificationCodeItem,
} from "@/lib/auth-api";
import {
  KeyRound,
  Copy,
  CheckCircle2,
  Trash2,
  Plus,
  ShieldAlert,
  Search,
  RefreshCw,
  Clock,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { withActionFeedbackSafe } from "@/lib/action-feedback";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/verification-codes")({
  component: VerificationCodesScreen,
});

function VerificationCodesScreen() {
  const { user, employees } = usePos();
  const [codes, setCodes] = useState<VerificationCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modal states
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [targetEmail, setTargetEmail] = useState("");
  const [generatedResult, setGeneratedResult] = useState<{
    code: string;
    staffName: string;
    email: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteBulkModalOpen, setDeleteBulkModalOpen] = useState(false);
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);

  const hasAccess =
    user?.role === "admin" ||
    !!user?.permissions?.canManageVerificationCodes ||
    !!user?.permissions?.manage_verification_codes;

  const loadCodes = useCallback(async () => {
    if (!hasAccess) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchVerificationCodes({
        search: search.trim(),
        status: statusFilter,
        sort: sortOrder,
      });
      setCodes(data);
    } catch (err: unknown) {
      setCodes([]);
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Cannot load verification codes";
      setError(msg || "Failed to fetch verification codes.");
    } finally {
      setLoading(false);
    }
  }, [hasAccess, search, statusFilter, sortOrder]);

  useEffect(() => {
    loadCodes();
  }, [loadCodes]);

  if (!hasAccess) {
    return (
      <PageContainer className="py-12">
        <div className="max-w-md mx-auto bg-card rounded-2xl border p-8 text-center space-y-4 shadow-lg">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="font-display text-2xl text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You do not have permission to view or manage verification codes. Please contact your
            administrator if you require access to this module.
          </p>
        </div>
      </PageContainer>
    );
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Verification code copied to clipboard!");
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === codes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(codes.map((c) => c.id));
    }
  };

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmail.trim()) return;
    setGenerating(true);
    try {
      const res = await adminGenerateVerificationCode(targetEmail.trim());
      setGeneratedResult({
        code: res.code,
        staffName: res.staffName,
        email: res.email,
      });
      toast.success("Verification code generated!");
      loadCodes();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Failed to generate code.";
      toast.error(msg || "Could not generate verification code.");
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkUsed = async (id: number) => {
    await withActionFeedbackSafe(
      async () => {
        await markVerificationCodeUsed(id);
        await loadCodes();
      },
      {
        loading: "Marking code as used…",
        success: "Verification code marked as used.",
        error: "Failed to update code status.",
      },
    );
  };

  const handleDeleteIndividual = async (id: number) => {
    await withActionFeedbackSafe(
      async () => {
        await deleteVerificationCode(id);
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        await loadCodes();
      },
      {
        loading: "Deleting verification code…",
        success: "Verification code deleted.",
        error: "Failed to delete code.",
      },
    );
    setDeleteTargetId(null);
  };

  const handleDeleteBulk = async () => {
    if (!selectedIds.length) return;
    await withActionFeedbackSafe(
      async () => {
        await deleteVerificationCodes(selectedIds);
        setSelectedIds([]);
        await loadCodes();
      },
      {
        loading: "Deleting selected codes…",
        success: `${selectedIds.length} verification code(s) deleted.`,
        error: "Failed to delete selected codes.",
      },
    );
    setDeleteBulkModalOpen(false);
  };

  const handleDeleteAll = async () => {
    await withActionFeedbackSafe(
      async () => {
        await deleteAllVerificationCodes();
        setSelectedIds([]);
        await loadCodes();
      },
      {
        loading: "Deleting all verification codes…",
        success: "All verification codes deleted.",
        error: "Failed to delete verification codes.",
      },
    );
    setDeleteAllModalOpen(false);
  };

  return (
    <PageContainer wide className="pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <KeyRound className="w-8 h-8 text-primary shrink-0" />
          <div>
            <h1 className="font-display text-responsive-3xl text-foreground">Verification Codes</h1>
            <p className="text-sm text-muted-foreground">
              Manage staff password reset verification codes
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setDeleteBulkModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-destructive text-destructive-foreground font-medium text-sm hover:opacity-90 transition shadow-sm touch-manipulation"
            >
              <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.length})
            </button>
          )}

          {codes.length > 0 && (
            <button
              type="button"
              onClick={() => setDeleteAllModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-destructive/40 text-destructive font-medium text-sm hover:bg-destructive/10 transition touch-manipulation"
            >
              <Trash2 className="w-4 h-4" /> Delete All
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-sm text-destructive flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadCodes}
            className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Filter and Search controls */}
      <div className="bg-card rounded-2xl border p-4 mb-5 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by staff name, email, code, or generated by…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="used">Used</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")}
              className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="desc">Sort by Date: Newest First</option>
              <option value="asc">Sort by Date: Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-muted/70">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                <th className="px-4 py-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={codes.length > 0 && selectedIds.length === codes.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-input accent-primary cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5 font-semibold">Staff Name</th>
                <th className="px-4 py-3.5 font-semibold">Email</th>
                <th className="px-4 py-3.5 font-semibold">Verification Code</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-4 py-3.5 font-semibold">Created Date</th>
                <th className="px-4 py-3.5 font-semibold">Expiration Time</th>
                <th className="px-4 py-3.5 font-semibold">Generated By</th>
                <th className="px-4 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      <span>Loading verification codes…</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && codes.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No verification codes found.
                  </td>
                </tr>
              )}

              {!loading &&
                codes.map((item) => {
                  const isExpired = item.status === "Expired";
                  const isUsed = item.status === "Used";
                  const isActive = item.status === "Active";

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "transition-colors hover:bg-muted/40",
                        isExpired && "bg-destructive/5 hover:bg-destructive/10 border-l-4 border-l-destructive",
                        isUsed && "opacity-75 bg-muted/20",
                      )}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => handleToggleSelect(item.id)}
                          className="w-4 h-4 rounded border-input accent-primary cursor-pointer"
                        />
                      </td>

                      <td className="px-4 py-3.5 text-sm font-medium text-foreground">
                        {item.staffName}
                      </td>

                      <td className="px-4 py-3.5 text-sm text-muted-foreground">
                        {item.email}
                      </td>

                      <td className="px-4 py-3.5 text-sm">
                        {item.code ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/80 font-mono text-base font-bold tracking-wider text-foreground border">
                            <span>{item.code}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(item.code!)}
                              title="Copy code"
                              className="p-1 text-muted-foreground hover:text-primary transition"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">— (Hashed)</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-sm">
                        {isActive && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <Clock className="w-3 h-3" /> Active
                          </span>
                        )}
                        {isUsed && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 border border-slate-500/20">
                            <UserCheck className="w-3 h-3" /> Used
                          </span>
                        )}
                        {isExpired && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                            <AlertTriangle className="w-3 h-3" /> Expired
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(item.expiresAt).toLocaleString()}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {item.generatedBy}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.code && (
                            <button
                              type="button"
                              onClick={() => handleCopyCode(item.code!)}
                              title="Copy Code"
                              className="p-2 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}

                          {isActive && (
                            <button
                              type="button"
                              onClick={() => handleMarkUsed(item.id)}
                              title="Mark as Used"
                              className="p-2 rounded-lg border bg-background hover:bg-emerald-50 text-emerald-600 hover:border-emerald-300 transition"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(item.id)}
                            title="Delete Code"
                            className="p-2 rounded-lg border bg-background hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Code Modal */}
      {generateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-xl p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-display text-xl text-foreground flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" /> Generate Verification Code
              </h3>
              <button
                type="button"
                onClick={() => setGenerateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                ✕
              </button>
            </div>

            {!generatedResult ? (
              <form onSubmit={handleGenerateCode} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Select or Enter Staff Email</label>
                  <input
                    type="email"
                    list="staff-email-list"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    placeholder="staff@example.com"
                    required
                    className="mt-1.5 w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <datalist id="staff-email-list">
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.email}>
                        {emp.fullname} ({emp.email})
                      </option>
                    ))}
                  </datalist>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generating a new code automatically invalidates any active pending code for this account.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setGenerateModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border bg-background hover:bg-muted text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generating}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-70"
                  >
                    {generating ? "Generating…" : "Generate Code"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-center py-2">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-2">
                  <p className="text-xs font-semibold uppercase text-emerald-600 tracking-wider">
                    Verification Code for {generatedResult.staffName}
                  </p>
                  <p className="text-3xl font-mono font-bold tracking-[0.35em] text-foreground">
                    {generatedResult.code}
                  </p>
                  <p className="text-xs text-muted-foreground">{generatedResult.email}</p>
                </div>

                <p className="text-xs text-muted-foreground">
                  Provide this 6-digit code to the staff member. Code expires in 10 minutes.
                </p>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCopyCode(generatedResult.code)}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" /> Copy Code
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGeneratedResult(null);
                      setTargetEmail("");
                    }}
                    className="py-2.5 px-4 rounded-xl border bg-background hover:bg-muted text-sm font-medium"
                  >
                    Generate Another
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Single Delete Confirmation */}
      <ConfirmDeleteModal
        open={deleteTargetId !== null}
        title="Delete Verification Code"
        message="Are you sure you want to delete this verification code?"
        detail="The staff member will not be able to use this code to reset their password."
        confirmLabel="Delete Code"
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId !== null) {
            handleDeleteIndividual(deleteTargetId);
          }
        }}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDeleteModal
        open={deleteBulkModalOpen}
        title="Delete Selected Codes"
        message={`Are you sure you want to delete ${selectedIds.length} selected verification code(s)?`}
        detail="This action cannot be undone."
        confirmLabel="Delete Selected"
        onClose={() => setDeleteBulkModalOpen(false)}
        onConfirm={handleDeleteBulk}
      />

      {/* Delete All Confirmation */}
      <ConfirmDeleteModal
        open={deleteAllModalOpen}
        title="Delete All Verification Codes"
        message="Are you sure you want to delete ALL verification codes in the database?"
        detail="This action is permanent and cannot be undone."
        confirmLabel="Delete All Codes"
        onClose={() => setDeleteAllModalOpen(false)}
        onConfirm={handleDeleteAll}
      />
    </PageContainer>
  );
}
