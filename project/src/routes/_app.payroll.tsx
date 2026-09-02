import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Wallet,
  Download,
  Lock,
  Save,
  Clock,
  User,
  FileText,
  Printer,
  X,
  Info,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  Users,
  Sparkles,
} from "lucide-react";
import { usePos, fmt } from "@/lib/pos-store";
import { PermissionGate } from "@/components/PermissionGate";
import { hasPermission } from "@/lib/permissions";
import { PageContainer } from "@/components/layout/PageContainer";
import { withActionFeedbackSafe } from "@/lib/action-feedback";
import { fetchPayrollOverview, savePayrollRates, type PayrollUser } from "@/lib/payroll-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/payroll")({
  component: PayrollScreen,
});

type Period = "Weekly" | "Bi-weekly" | "Monthly";

const DEFAULT_RATE = 80;

interface PayrollRow {
  e: PayrollUser;
  regular: number;
  overtime: number;
  rate: number;
  regPay: number;
  otPay: number;
  gross: number;
  sss: number;
  philhealth: number;
  pagibig: number;
  deductions: number;
  net: number;
  fromAttendance: boolean;
}

function PayrollScreen() {
  const { user } = usePos();
  const [period, setPeriod] = useState<Period>("Weekly");
  const [employees, setEmployees] = useState<PayrollUser[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [otHours, setOtHours] = useState<Record<string, number>>({});
  const [dirty, setDirty] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<PayrollRow | null>(null);

  const canExport = user && hasPermission(user.permissions, user.role, "canExportReports");

  const days = period === "Weekly" ? 7 : period === "Bi-weekly" ? 14 : 30;

  useEffect(() => {
    fetchPayrollOverview(days)
      .then((rows) => {
        setEmployees(rows);
        setRates(Object.fromEntries(rows.map((r) => [r.id, Number(r.hourlyRate) || DEFAULT_RATE])));
        setOtHours(Object.fromEntries(rows.map((r) => [r.id, Number(r.overtimeHours) || 0])));
      })
      .catch(() => {
        setEmployees([]);
        setRates({});
        setOtHours({});
      });
  }, [days]);

  const rows: PayrollRow[] = useMemo(
    () =>
      employees.map((e) => {
        const rate = rates[e.id] ?? Number(e.hourlyRate) ?? DEFAULT_RATE;
        const regular = Number(e.regularHours) || days * 8;
        const overtime = otHours[e.id] ?? Number(e.overtimeHours) ?? 0;
        const regPay = regular * rate;
        const otPay = overtime * rate * 1.25;
        const gross = regPay + otPay;
        const sss = gross * 0.045;
        const philhealth = gross * 0.025;
        const pagibig = Math.min(100, gross * 0.02);
        const deductions = sss + philhealth + pagibig;
        const net = gross - deductions;
        return {
          e,
          regular,
          overtime,
          rate,
          regPay,
          otPay,
          gross,
          sss,
          philhealth,
          pagibig,
          deductions,
          net,
          fromAttendance: e.hoursSource === "attendance",
        };
      }),
    [employees, rates, otHours, days],
  );

  const saveRatesToApi = () => {
    const payload = rows.map((r) => ({ userId: r.e.id, hourlyRate: r.rate }));
    return withActionFeedbackSafe(
      async () => {
        const updated = await savePayrollRates(payload, days);
        setEmployees(updated);
        setRates(Object.fromEntries(updated.map((r) => [r.id, Number(r.hourlyRate) || DEFAULT_RATE])));
        setDirty(false);
      },
      {
        loading: "Saving payroll rates…",
        success: "Payroll rates saved successfully.",
        error: "Could not save payroll rates.",
      },
    );
  };

  const exportCsv = () => {
    if (!canExport) {
      alert("Only authorized personnel can export payroll.");
      return;
    }
    void withActionFeedbackSafe(
      async () => {
        const header = [
          "Employee",
          "Role",
          "Hours Source",
          "Hourly Rate (PHP)",
          "Regular Shift Hours (4PM-12AM)",
          "Overtime Hours (Excess > 8h)",
          "Regular Pay (PHP)",
          "OT Pay (1.25x PHP)",
          "Gross Earnings (PHP)",
          "SSS (4.5%)",
          "PhilHealth (2.5%)",
          "Pag-IBIG (2%)",
          "Total Deductions (PHP)",
          "Net Pay (PHP)",
        ];
        const csvRows = [
          header,
          ...rows.map((r) =>
            [
              `"${r.e.fullname}"`,
              `"${r.e.role}"`,
              `"${r.fromAttendance ? "Attendance Logged" : "Estimated"}"`,
              r.rate.toFixed(2),
              r.regular.toFixed(2),
              r.overtime.toFixed(2),
              r.regPay.toFixed(2),
              r.otPay.toFixed(2),
              r.gross.toFixed(2),
              r.sss.toFixed(2),
              r.philhealth.toFixed(2),
              r.pagibig.toFixed(2),
              r.deductions.toFixed(2),
              r.net.toFixed(2),
            ].join(","),
          ),
        ].join("\n");
        const url = URL.createObjectURL(new Blob([csvRows], { type: "text/csv" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `payroll-${period.toLowerCase()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        await new Promise((res) => setTimeout(res, 400));
      },
      {
        loading: "Exporting payroll CSV…",
        success: "Payroll report exported!",
        error: "Export failed.",
      },
    );
  };

  const totalRegularPay = rows.reduce((s, r) => s + r.regPay, 0);
  const totalOtHours = rows.reduce((s, r) => s + r.overtime, 0);
  const totalOtPay = rows.reduce((s, r) => s + r.otPay, 0);
  const totalGrossPay = rows.reduce((s, r) => s + r.gross, 0);
  const totalNet = rows.reduce((s, r) => s + r.net, 0);
  const usingAttendance = rows.some((r) => r.fromAttendance);

  return (
    <PermissionGate path="/payroll">
      <PageContainer wide>
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-responsive-3xl">Employee Payroll & Earnings</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Calculated based on attendance logs and hourly rates
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void saveRatesToApi()}
              disabled={!dirty}
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border shadow-xs",
                dirty
                  ? "bg-primary text-primary-foreground hover:bg-primary/95 border-primary shadow-md ring-2 ring-primary/40"
                  : "bg-background border-border text-foreground/80 hover:bg-muted opacity-80 cursor-not-allowed"
              )}
            >
              <Save className={cn("w-4 h-4", dirty ? "text-primary-foreground animate-pulse" : "text-primary")} />
              <span>{dirty ? "Save Rates *" : "Save Rates"}</span>
            </button>
            <button
              onClick={exportCsv}
              disabled={!canExport}
              className="btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
            >
              {canExport ? <Download className="w-4 h-4" /> : <Lock className="w-4 h-4" />} Export CSV
            </button>
          </div>
        </div>

        {/* Regular Shift & Overtime Rule Banner */}
        <div className="glass-card rounded-2xl border p-4 sm:p-5 mb-6 bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent border-amber-500/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base text-foreground">
                    Regular Shift Schedule: 4:00 PM – 12:00 AM (8.0 hrs/day)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                    OT Rate: 1.25× Base Rate
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Regular work duration is capped at <span className="font-medium text-foreground">8.0 hours per shift</span>. Any work time beyond 8 hours is automatically categorized as <span className="font-medium text-amber-700 dark:text-amber-300">Overtime (OT)</span> and compensated with a 1.25 multiplier per PH Labor Code standards.
                </p>
              </div>
            </div>
            <Link
              to="/attendance"
              className="text-xs font-medium text-primary hover:underline shrink-0 flex items-center gap-1.5 self-start md:self-center px-3 py-2 rounded-lg bg-background border shadow-xs"
            >
              <Clock className="w-3.5 h-3.5" /> View Attendance Logs →
            </Link>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="glass-card rounded-2xl border p-4 sm:p-5 hover-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="font-medium">Total Net Payroll</span>
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <div className="font-display text-2xl sm:text-3xl text-primary font-bold">{fmt(totalNet)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Net payout after deductions</p>
          </div>

          <div className="glass-card rounded-2xl border p-4 sm:p-5 hover-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="font-medium">Regular Pay</span>
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="font-display text-xl sm:text-2xl font-bold text-foreground">{fmt(totalRegularPay)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Standard shift hours (4PM–12AM)</p>
          </div>

          <div className="glass-card rounded-2xl border p-4 sm:p-5 hover-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="font-medium">Overtime (OT) Pay</span>
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="font-display text-xl sm:text-2xl font-bold text-amber-800 dark:text-amber-300">
              {fmt(totalOtPay)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {totalOtHours.toFixed(1)} excess hrs @ 1.25×
            </p>
          </div>

          <div className="glass-card rounded-2xl border p-4 sm:p-5 hover-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="font-medium">Active Staff</span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="font-display text-xl sm:text-2xl font-bold text-foreground">{rows.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Employees in payroll period</p>
          </div>
        </div>

        {/* Period Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-2 bg-muted/50 p-1 rounded-2xl border">
            {(["Weekly", "Bi-weekly", "Monthly"] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  period === p
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p} ({p === "Weekly" ? "7 Days" : p === "Bi-weekly" ? "14 Days" : "30 Days"})
              </button>
            ))}
          </div>

          {!usingAttendance && rows.length > 0 && (
            <div className="text-xs text-amber-800 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3.5 py-2 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-amber-600" />
              <span>No attendance records logged — using standard 8h/day shift estimates.</span>
            </div>
          )}
        </div>

        {/* Employee Payroll Breakdown List / Table */}
        <div className="glass-card rounded-2xl border overflow-hidden shadow-sm">
          <div className="px-4 sm:px-6 py-4 border-b bg-muted/30 flex items-center justify-between">
            <h2 className="font-display text-lg">Employee Earnings & Deductions Breakdown</h2>
            <span className="text-xs text-muted-foreground">{rows.length} Employees</span>
          </div>

          <div className="divide-y divide-border">
            {rows.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No active employees found in payroll.</p>
              </div>
            ) : (
              rows.map((r) => (
                <div
                  key={r.e.id}
                  className="p-4 sm:p-6 hover:bg-muted/10 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: Employee Info */}
                  <div className="flex items-start gap-3.5 min-w-[220px]">
                    <div className="w-11 h-11 rounded-2xl bg-secondary text-secondary-foreground font-semibold flex items-center justify-center text-sm shrink-0 border border-border">
                      {r.e.fullname.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-base flex items-center gap-2">
                        {r.e.fullname}
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground uppercase tracking-wider">
                          {r.e.role}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        {r.fromAttendance ? (
                          <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Attendance Logged
                          </span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Standard Estimated Shift
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Inputs (Hourly Rate, Regular Hrs, OT Hrs) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 lg:max-w-xl">
                    {/* Hourly Rate */}
                    <div className="bg-background rounded-xl border p-2.5">
                      <label className="text-[11px] font-semibold text-foreground/80 block mb-1">
                        Base Rate / hr
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-foreground/80 font-bold">₱</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={rates[r.e.id] === 0 ? "" : (rates[r.e.id] ?? DEFAULT_RATE)}
                          placeholder="0"
                          onChange={(ev) => {
                            const raw = ev.target.value;
                            const val = raw === "" ? 0 : Math.max(0, Number(raw));
                            setRates((prev) => ({ ...prev, [r.e.id]: val }));
                            setDirty(true);
                          }}
                          className="w-full bg-transparent font-bold text-sm text-foreground focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Regular Hours (Shift max 8h/day) */}
                    <div className="bg-background rounded-xl border p-2.5">
                      <label className="text-[11px] font-semibold text-foreground/80 block mb-1">
                        Regular Hours (4PM–12AM)
                      </label>
                      <div className="text-sm font-bold text-foreground flex items-center justify-between">
                        <span>{r.regular.toFixed(1)} hrs</span>
                        <span className="text-[11px] text-foreground/70 font-semibold">({fmt(r.regPay)})</span>
                      </div>
                    </div>

                    {/* Excess / Overtime Hours */}
                    <div className="bg-amber-500/10 rounded-xl border border-amber-500/40 p-2.5 col-span-2 sm:col-span-1">
                      <label className="text-[11px] font-bold text-amber-900 dark:text-amber-200 block mb-1 flex items-center justify-between">
                        <span>Excess / OT Hrs</span>
                        <span className="text-[10px] bg-amber-500/30 px-1.5 py-0.2 rounded font-bold text-amber-900 dark:text-amber-100">
                          1.25×
                        </span>
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={otHours[r.e.id] === 0 ? "" : (otHours[r.e.id] ?? 0)}
                          placeholder="0"
                          onChange={(ev) => {
                            const raw = ev.target.value;
                            const val = raw === "" ? 0 : Math.max(0, Number(raw));
                            setOtHours((prev) => ({ ...prev, [r.e.id]: val }));
                            setDirty(true);
                          }}
                          className="w-16 bg-background rounded border border-border px-2 py-0.5 text-xs font-bold text-foreground text-right focus:outline-none"
                        />
                        <span className="text-xs text-amber-900 dark:text-amber-300 font-bold truncate">
                          = {fmt(r.otPay)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Net Earnings & Paystub Button */}
                  <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0">
                    <div className="text-left lg:text-right">
                      <div className="text-[11px] font-semibold text-foreground/80">Net Take-Home Pay</div>
                      <div className="font-display text-2xl text-primary font-bold">{fmt(r.net)}</div>
                      <div className="text-[11px] font-medium text-foreground/70 mt-0.5">
                        Gross {fmt(r.gross)} − Deductions {fmt(r.deductions)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSlip(r)}
                      className="btn-secondary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
                    >
                      <FileText className="w-4 h-4 text-primary" /> View Slip
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Policy Notes */}
        <div className="mt-6 text-xs text-muted-foreground glass-card rounded-2xl border p-4 flex items-start gap-2.5">
          <Info className="w-4 h-4 shrink-0 text-primary mt-0.5" />
          <div>
            <span className="font-semibold text-foreground">Overtime & Labor Compliance Note:</span> Regular shift is set to 4:00 PM – 12:00 AM (8.0 hours). Overtime pay is computed on any excess work duration beyond 8.0 hours per shift using a 1.25× multiplier per PH Labor Code standards. Deductions include mandatory contributions (SSS 4.5%, PhilHealth 2.5%, Pag-IBIG 2.0%).
          </div>
        </div>

        {/* Interactive Itemized Pay Slip Modal */}
        {selectedSlip && (
          <PaySlipModal
            row={selectedSlip}
            period={period}
            onClose={() => setSelectedSlip(null)}
          />
        )}
      </PageContainer>
    </PermissionGate>
  );
}

/** Component for Employee Pay Slip Modal */
function PaySlipModal({
  row,
  period,
  onClose,
}: {
  row: PayrollRow;
  period: Period;
  onClose: () => void;
}) {
  const handlePrint = () => {
    window.print();
  };

  const modal = (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center p-4 modal-backdrop animate-fade-in bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-panel relative w-full sm:max-w-md max-h-[90dvh] flex flex-col rounded-3xl bg-background border shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between glass-bar">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-display text-lg">Employee Pay Stub</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pay Slip Details */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
          {/* Company & Employee Overview */}
          <div className="border-b pb-4">
            <div className="font-display text-xl text-primary">Cafe Corazon Coffee Shop</div>
            <div className="text-xs text-muted-foreground">Official Payroll Pay Slip</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-muted/30 p-3 rounded-xl border">
              <div>
                <span className="text-muted-foreground block">Employee Name:</span>
                <span className="font-semibold text-foreground">{row.e.fullname}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Role:</span>
                <span className="font-semibold capitalize text-foreground">{row.e.role}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Pay Period:</span>
                <span className="font-semibold text-foreground">{period}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Regular Shift:</span>
                <span className="font-semibold text-foreground">4:00 PM – 12:00 AM (8h)</span>
              </div>
            </div>
          </div>

          {/* Earnings Breakdown Table */}
          <div>
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Earnings Breakdown
            </h4>
            <div className="space-y-2 bg-background border rounded-xl p-3">
              <div className="flex justify-between items-center text-xs">
                <span>Base Hourly Rate</span>
                <span className="font-medium">₱{row.rate.toFixed(2)} / hr</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span>Regular Shift Hours ({row.regular.toFixed(1)} hrs)</span>
                <span className="font-medium">{fmt(row.regPay)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-amber-700 dark:text-amber-400">
                <span>Overtime ({row.overtime.toFixed(1)} excess hrs @ 1.25×)</span>
                <span className="font-semibold">{fmt(row.otPay)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between items-center font-semibold text-sm">
                <span>Total Gross Earnings</span>
                <span>{fmt(row.gross)}</span>
              </div>
            </div>
          </div>

          {/* Deductions Breakdown */}
          <div>
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Statutory Deductions
            </h4>
            <div className="space-y-1.5 bg-muted/20 border rounded-xl p-3 text-xs text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>SSS (4.5%)</span>
                <span>− {fmt(row.sss)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>PhilHealth (2.5%)</span>
                <span>− {fmt(row.philhealth)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Pag-IBIG (2.0% cap)</span>
                <span>− {fmt(row.pagibig)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between items-center font-medium text-foreground text-xs">
                <span>Total Deductions</span>
                <span className="text-destructive">− {fmt(row.deductions)}</span>
              </div>
            </div>
          </div>

          {/* Net Take-Home Pay Banner */}
          <div className="bg-primary/10 border border-primary/30 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground font-medium block">Net Take-Home Pay</span>
              <span className="text-xs text-muted-foreground">Gross − Total Deductions</span>
            </div>
            <div className="font-display text-2xl text-primary">{fmt(row.net)}</div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t glass-bar flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1 py-2.5 text-xs font-medium"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Print Pay Stub
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}
