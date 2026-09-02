import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePos, Role, type EmployeeUser } from "@/lib/pos-store";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { Trash2, UserPlus, ShieldCheck, Briefcase, Pencil, X, Save, Clock } from "lucide-react";
import { PermissionGate } from "@/components/PermissionGate";
import {
  PERMISSION_LABELS,
  canManageEmployeeAttendance,
  getEditablePermissions,
  sanitizePermissionsForPartial,
  type Permissions,
} from "@/lib/permissions";
import { useDeliveryLock } from "@/lib/delivery-lock-context";
import { EmployeeAttendanceModal } from "@/components/employees/EmployeeAttendanceModal";
import { withActionFeedback } from "@/lib/action-feedback";
import { PageContainer } from "@/components/layout/PageContainer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/employees")({
  component: EmployeesScreen,
});

const defaultPermissions: Permissions = {
  canViewDashboard: true,
  canManageUsers: false,
  canManageProducts: false,
  canManageMenu: false,
  canManageOrders: true,
  canManageInventory: false,
  canManageSales: false,
  canManageAttendance: false,
  canManageReports: false,
  canManageSettings: false,
  canExportReports: false,
  canManagePromos: false,
  canManageVerificationCodes: false,
};

const blank = {
  fullname: "",
  email: "",
  password: "",
  role: "staff" as Role,
  permissions: { ...defaultPermissions },
};

function EmployeesScreen() {
  const { employees, addEmployee, removeEmployee, updateEmployee, user, refreshEmployees } = usePos();
  const { unlocked } = useDeliveryLock();
  const partialMode = !unlocked;
  const isAdmin = user?.role === "admin";
  const canManagePermissions = !partialMode || isAdmin;
  const editablePermissions = getEditablePermissions(partialMode);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeUser | null>(null);
  const [attendanceTarget, setAttendanceTarget] = useState<EmployeeUser | null>(null);

  const canManageAttendance = !!(user && canManageEmployeeAttendance(user.permissions, user.role));

  useEffect(() => {
    refreshEmployees();
  }, [refreshEmployees]);

  const closeUserModal = () => {
    setUserModalOpen(false);
    setEditingId(null);
    setForm({ ...blank, permissions: { ...defaultPermissions } });
  };

  const openAddUser = () => {
    setEditingId(null);
    setForm({
      ...blank,
      role: "staff",
      permissions: { ...defaultPermissions },
    });
    setUserModalOpen(true);
  };

  const openEditUser = (e: (typeof employees)[0]) => {
    if (!canManagePermissions) return;
    setEditingId(e.id);
    setForm({
      fullname: e.fullname,
      email: e.email,
      password: "",
      role: e.role,
      permissions: { ...e.permissions },
    });
    setUserModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullname.trim() || !form.email.trim()) return;
    if (!editingId && !form.password.trim()) return;
    if (partialMode && editingId && !isAdmin) return;

    const isEdit = !!editingId;
    const payloadRole = canManagePermissions ? form.role : "staff";
    const payloadPermissions = canManagePermissions
      ? partialMode
        ? sanitizePermissionsForPartial(form.permissions)
        : form.permissions
      : defaultPermissions;
    setSubmitting(true);
    try {
      await withActionFeedback(
        async () => {
          if (editingId) {
            await updateEmployee(editingId, {
              fullname: form.fullname.trim(),
              email: form.email.trim(),
              role: payloadRole,
              permissions: payloadPermissions,
              ...(form.password.trim() ? { password: form.password.trim() } : {}),
            });
          } else {
            await addEmployee({
              fullname: form.fullname.trim(),
              email: form.email.trim(),
              password: form.password.trim(),
              role: payloadRole,
              permissions: payloadPermissions,
            });
          }
        },
        {
          loading: isEdit ? "Saving employee…" : "Creating employee…",
          success: isEdit ? "Employee updated!" : "Employee created!",
          error: "Could not save employee.",
        },
      );
      closeUserModal();
    } catch {
      /* toast shown */
    } finally {
      setSubmitting(false);
    }
  };

  const togglePerm = (key: keyof Permissions) => {
    setForm((f) => ({
      ...f,
      permissions: { ...f.permissions, [key]: !f.permissions[key] },
    }));
  };

  const userModal = userModalOpen ? (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-4 modal-backdrop animate-fade-in"
      onClick={closeUserModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
    >
      <form
        className="modal-panel relative w-full max-w-lg max-h-[90dvh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="sticky top-0 glass-bar px-4 sm:px-6 py-4 border-b flex items-center justify-between rounded-t-2xl shrink-0">
          <div id="user-modal-title" className="flex items-center gap-2 font-display text-xl">
            {editingId ? (
              <>
                <Pencil className="w-5 h-5" /> Edit user
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" /> {canManagePermissions ? "Add user" : "Add staff user"}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={closeUserModal}
            className="p-2 rounded-lg hover:bg-muted touch-manipulation"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain min-h-0">
          <div>
            <label className="text-sm font-medium">Full name</label>
            <input
              value={form.fullname}
              onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2.5 min-h-[44px] rounded-lg border bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2.5 min-h-[44px] rounded-lg border bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              Password {editingId && <span className="text-muted-foreground font-normal">(leave blank to keep)</span>}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="mt-1.5 w-full px-3 py-2.5 min-h-[44px] rounded-lg border bg-background"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Role</label>
            {!canManagePermissions ? (
              <div className="mt-1.5 py-3 px-3 rounded-lg border bg-muted/40 text-sm capitalize">
                Staff
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {(["staff", "admin"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: r }))}
                    className={`py-3 min-h-[44px] rounded-lg border text-sm capitalize touch-manipulation active:scale-95 transition-transform ${
                      form.role === r ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
          {canManagePermissions && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium">Permissions</p>
            {partialMode && (
              <p className="text-xs text-muted-foreground">
                Reports, attendance, payroll, and export permissions unlock with the full release.
              </p>
            )}
            {editablePermissions.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm min-h-[44px]">
                <input
                  type="checkbox"
                  checked={form.permissions[key]}
                  onChange={() => togglePerm(key)}
                  disabled={form.role === "admin"}
                  className="w-5 h-5 accent-caramel"
                />
                {PERMISSION_LABELS[key]}
              </label>
            ))}
          </div>
          )}
          {!canManagePermissions && !editingId && (
            <p className="text-xs text-muted-foreground pt-2 border-t">
              Staff accounts are created with POS and order access so they can sign in and work at the register.
            </p>
          )}
        </div>

        <div className="sticky bottom-0 glass-bar border-t p-4 sm:p-5 flex gap-3 rounded-b-2xl shrink-0">
          <button
            type="button"
            onClick={closeUserModal}
            className="flex-1 py-3 min-h-[48px] rounded-lg border bg-card hover:bg-muted touch-manipulation"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex-1 py-3 min-h-[48px] inline-flex items-center justify-center gap-2"
          >
            {submitting ? (
              "Processing…"
            ) : editingId ? (
              <>
                <Save className="w-4 h-4" /> Save changes
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Add user
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  ) : null;

  return (
    <PermissionGate path="/employees">
      <PageContainer wide>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="font-display text-responsive-3xl">
              {canManagePermissions ? "Employees & Permissions" : "Employees"}
            </h1>
            {partialMode && !canManagePermissions && (
              <p className="text-sm text-muted-foreground mt-1">
                Create staff accounts so your team can sign in and use the POS.
              </p>
            )}
            {partialMode && canManagePermissions && (
              <p className="text-sm text-muted-foreground mt-1">
                Manage staff access for POS, orders, menu, inventory, and settings.
              </p>
            )}
          </div>
          <button type="button" onClick={openAddUser} className="btn-primary shrink-0">
            <UserPlus className="w-4 h-4" /> {canManagePermissions ? "Add User" : "Add Staff User"}
          </button>
        </div>

        <div className="glass-card rounded-2xl border overflow-hidden">
          <div className="table-scroll">
            <table className="w-full">
              <thead className="bg-muted">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  {canManagePermissions && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className={cn("border-t", editingId === e.id && userModalOpen && "bg-accent/10")}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center ${
                            e.role === "admin"
                              ? "bg-accent text-accent-foreground"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {e.role === "admin" ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : (
                            <Briefcase className="w-4 h-4" />
                          )}
                        </div>
                        <span className="font-medium">{e.fullname}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{e.email}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full capitalize ${
                          e.role === "admin" ? "bg-accent/15 text-accent-foreground" : "bg-muted"
                        }`}
                      >
                        {e.role}
                      </span>
                    </td>
                    {canManagePermissions && (
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {!partialMode && canManageAttendance && (
                          <button
                            type="button"
                            onClick={() => setAttendanceTarget(e)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted touch-manipulation"
                            title="Manage attendance"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditUser(e)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted touch-manipulation"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(e)}
                          disabled={e.id === user?.id}
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted disabled:opacity-30 touch-manipulation"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <ConfirmDeleteModal
          open={deleteTarget !== null}
          title="Remove employee"
          detail={deleteTarget?.fullname}
          confirmLabel="Remove"
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (!deleteTarget) return;
            await withActionFeedback(
              () => removeEmployee(deleteTarget.id),
              {
                loading: "Removing employee…",
                success: "Employee removed.",
                error: "Could not remove employee.",
              },
            );
          }}
        />

        {typeof document !== "undefined" && createPortal(userModal, document.body)}

        <EmployeeAttendanceModal employee={attendanceTarget} onClose={() => setAttendanceTarget(null)} />
      </PageContainer>
    </PermissionGate>
  );
}
