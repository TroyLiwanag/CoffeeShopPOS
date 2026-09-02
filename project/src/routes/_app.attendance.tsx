import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, LogIn, LogOut, Trash2, Wallet, RotateCcw } from "lucide-react";
import { usePos } from "@/lib/pos-store";
import { PermissionGate } from "@/components/PermissionGate";
import { PageContainer } from "@/components/layout/PageContainer";
import { canManageEmployeeAttendance } from "@/lib/permissions";
import { withActionFeedback } from "@/lib/action-feedback";
import {
  clockIn,
  clockOut,
  deleteAttendance,
  fetchAttendanceList,
  fetchMyAttendanceStatus,
  type AttendanceRecord,
  type MyAttendanceStatus,
} from "@/lib/attendance-api";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";

export const Route = createFileRoute("/_app/attendance")({
  component: AttendanceScreen,
});

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function AttendanceScreen() {
  const { user } = usePos();
  const canManage = !!(user && canManageEmployeeAttendance(user.permissions, user.role));
  const [days, setDays] = useState(14);
  const [myStatus, setMyStatus] = useState<MyAttendanceStatus | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);
  const [resubmitTarget, setResubmitTarget] = useState<AttendanceRecord | null>(null);
  const [pendingAction, setPendingAction] = useState<"clock_in" | "clock_out" | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const load = useCallback(async () => {
    try {
      const status = await fetchMyAttendanceStatus();
      setMyStatus(status);
    } catch {
      setMyStatus(null);
    }
    if (!canManage) return;
    try {
      const list = await fetchAttendanceList(days);
      setRecords(list);
    } catch {
      setRecords([]);
    }
  }, [canManage, days]);

  useEffect(() => {
    void load().catch(() => {
      setMyStatus(null);
      setRecords([]);
    });
  }, [load]);

  const handleClockIn = async () => {
    await withActionFeedback(
      () => clockIn(),
      {
        loading: "Clocking in…",
        success: "Clocked in!",
        error: "Could not clock in.",
      },
    );
    await load();
  };

  const handleClockOut = async () => {
    await withActionFeedback(
      () => clockOut(),
      {
        loading: "Clocking out…",
        success: "Clocked out!",
        error: "Could not clock out.",
      },
    );
    await load();
  };

  const allowResubmit = async (record: AttendanceRecord) => {
    await withActionFeedback(
      () => clockIn(record.userId, true),
      {
        loading: "Resetting attendance…",
        success: "Staff can re-submit clock in now.",
        error: "Could not reset attendance.",
      },
    );
    await load();
  };

  return (
    <PermissionGate path="/attendance">
      <PageContainer wide>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <Clock className="w-7 h-7 text-accent shrink-0" />
            <div>
              <h1 className="font-display text-responsive-3xl">Attendance</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Clock in/out feeds hours into{" "}
                <Link to="/payroll" className="text-primary underline-offset-2 hover:underline">
                  Payroll
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl border p-4 sm:p-6 mb-6">
          <h2 className="font-display text-lg mb-3">Today — {user?.fullname}</h2>
          <div className="flex flex-wrap items-center gap-3">
            {myStatus?.status === "not_clocked_in" && (
              <button type="button" onClick={() => setPendingAction("clock_in")} className="btn-primary">
                <LogIn className="w-4 h-4" /> Clock in
              </button>
            )}
            {myStatus?.status === "clocked_in" && (
              <>
                <span className="text-sm text-muted-foreground">
                  Clocked in at {formatTime(myStatus.record?.clockIn ?? null)}
                </span>
                <button type="button" onClick={() => setPendingAction("clock_out")} className="btn-primary">
                  <LogOut className="w-4 h-4" /> Clock out
                </button>
              </>
            )}
            {myStatus?.status === "completed" && myStatus.record && (
              <div className="text-sm">
                <span className="text-muted-foreground">
                  {formatTime(myStatus.record.clockIn)} – {formatTime(myStatus.record.clockOut)}
                </span>
                <span className="ml-3 font-medium">
                  {myStatus.record.hoursWorked}h reg
                  {myStatus.record.overtimeHours > 0 ? ` + ${myStatus.record.overtimeHours}h OT` : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {canManage ? (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    days === d ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"
                  }`}
                >
                  Last {d} days
                </button>
              ))}
            </div>

            <div className="glass-card rounded-2xl border overflow-hidden">
              <div className="table-scroll">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">In</th>
                      <th className="px-4 py-3">Out</th>
                      <th className="px-4 py-3 text-right">Reg. hrs</th>
                      <th className="px-4 py-3 text-right">OT</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="px-4 py-3">
                          <div className="font-medium">{r.userName}</div>
                          <div className="text-xs text-muted-foreground capitalize">{r.userRole}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">{r.workDate}</td>
                        <td className="px-4 py-3 text-sm">{formatTime(r.clockIn)}</td>
                        <td className="px-4 py-3 text-sm">{formatTime(r.clockOut)}</td>
                        <td className="px-4 py-3 text-right text-sm">{r.hoursWorked.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-sm">{r.overtimeHours.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {r.workDate === today && canManage && (
                              <button
                                type="button"
                                onClick={() => setResubmitTarget(r)}
                                className="p-2 text-muted-foreground hover:text-foreground"
                                title="Allow re-submit clock in"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(r)}
                              className="p-2 text-muted-foreground hover:text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          No attendance records in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Managers with &quot;Manage attendance&quot; or payroll access can view and edit all records here.
          </p>
        )}

        <div className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
          <Wallet className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            Attendance records reset by date each day. Payroll reads these daily clock in/out records.
          </p>
        </div>

        <ConfirmDeleteModal
          open={pendingAction !== null}
          title={pendingAction === "clock_out" ? "Confirm clock out" : "Confirm clock in"}
          message="Are you sure???"
          detail={
            pendingAction === "clock_out"
              ? "This will finalize today's attendance."
              : "This will start today's attendance record."
          }
          confirmLabel={pendingAction === "clock_out" ? "Clock out" : "Clock in"}
          onClose={() => setPendingAction(null)}
          onConfirm={async () => {
            if (pendingAction === "clock_out") {
              await handleClockOut();
            } else if (pendingAction === "clock_in") {
              await handleClockIn();
            }
            setPendingAction(null);
          }}
        />

        <ConfirmDeleteModal
          open={resubmitTarget !== null}
          title="Reset today's attendance"
          message="Are you sure???"
          detail={
            resubmitTarget
              ? `${resubmitTarget.userName} can clock in again for today.`
              : undefined
          }
          confirmLabel="Reset"
          onClose={() => setResubmitTarget(null)}
          onConfirm={async () => {
            if (!resubmitTarget) return;
            await allowResubmit(resubmitTarget);
          }}
        />

        <ConfirmDeleteModal
          open={deleteTarget !== null}
          title="Delete attendance"
          detail={deleteTarget ? `${deleteTarget.userName} — ${deleteTarget.workDate}` : undefined}
          confirmLabel="Delete"
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (!deleteTarget) return;
            await withActionFeedback(
              () => deleteAttendance(deleteTarget.id),
              {
                loading: "Deleting…",
                success: "Record deleted.",
                error: "Could not delete.",
              },
            );
            await load();
          }}
        />
      </PageContainer>
    </PermissionGate>
  );
}
