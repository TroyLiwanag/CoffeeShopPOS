import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { usePos, type Settings } from "@/lib/pos-store";
import { LogOut, RotateCcw, Save, Printer, Bluetooth, CheckCircle2 } from "lucide-react";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { PermissionGate } from "@/components/PermissionGate";
import { withActionFeedbackSafe } from "@/lib/action-feedback";
import { PageContainer } from "@/components/layout/PageContainer";
import { formatTin } from "./_app.payment";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsScreen,
});

function settingsEqual(a: Settings, b: Settings) {
  return (
    a.shopName === b.shopName &&
    a.businessStyle === b.businessStyle &&
    a.address === b.address &&
    a.phone === b.phone &&
    a.tin === b.tin &&
    a.vatEnabled === b.vatEnabled &&
    a.vatRate === b.vatRate &&
    a.serviceEnabled === b.serviceEnabled &&
    a.serviceRate === b.serviceRate &&
    a.seniorDiscountRate === b.seniorDiscountRate &&
    a.pwdDiscountRate === b.pwdDiscountRate &&
    a.receiptFooter === b.receiptFooter &&
    a.printerEnabled === b.printerEnabled &&
    a.printerName === b.printerName &&
    a.printerPaperWidth === b.printerPaperWidth &&
    a.printerConnectionType === b.printerConnectionType
  );
}

function SettingsScreen() {
  const { settings, saveSettings, logout, user, hydrated } = usePos();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Settings>(settings);
  const [saving, setSaving] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const dirty = useMemo(() => !settingsEqual(draft, settings), [draft, settings]);

  const handleToggle = async (key: keyof Settings, value: boolean) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    try {
      await saveSettings(next);
    } catch {
      /* ignore */
    }
  };

  const handleConnectBluetoothPrinter = async () => {
    if (typeof window === "undefined" || !("bluetooth" in navigator)) {
      toast.error("Web Bluetooth is not supported on this browser. Please use Chrome, Edge, or Android Chrome.");
      return;
    }
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "000018f0-0000-1000-8000-00805f9b34fb",
          "00001101-0000-1000-8000-00805f9b34fb",
          "0000ae30-0000-1000-8000-00805f9b34fb",
        ],
      });
      const name = device.name || "POS58D (58mm Thermal Printer)";
      setDraft((d) => ({
        ...d,
        printerName: name,
        printerEnabled: true,
        printerConnectionType: "Bluetooth",
        printerPaperWidth: "58mm",
      }));
      toast.success(`Paired with Bluetooth printer: ${name}!`);
    } catch (err: any) {
      if (err?.name !== "NotFoundError") {
        toast.error("Could not pair Bluetooth printer. Ensure device is turned on.");
      }
    }
  };

  const handleTestPrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to test print receipt.");
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Receipt - 58mm Thermal Printer</title>
          <style>
            @page { size: 58mm auto; margin: 0; }
            body {
              font-family: monospace, "Courier New", Courier;
              width: 48mm;
              margin: 0 auto;
              padding: 4px 0;
              font-size: 10px;
              line-height: 1.2;
              color: #000;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .line { border-bottom: 1px dashed #000; margin: 5px 0; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 12px;">${draft.shopName || "Cafe Corazon"}</div>
          <div class="center">${draft.businessStyle || "Kapeng may Puso 🖤"}</div>
          <div class="center">${draft.phone || ""}</div>
          <div class="line"></div>
          <div class="center bold">>>> SELF TEST PRINT <<<</div>
          <div class="center">Printer: ${draft.printerName || "POS58D"}</div>
          <div class="center">Paper: ${draft.printerPaperWidth || "58mm"} Thermal</div>
          <div class="center">Interface: ${draft.printerConnectionType || "Bluetooth"}</div>
          <div class="center">MAC: ${draft.printerAddress || "86:67:7A:00:4C:9D"}</div>
          <div class="line"></div>
          <div>1x Cafe Latte (Iced) &nbsp;&nbsp;&nbsp; P65.00</div>
          <div>1x Siomai 4pcs &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; P39.00</div>
          <div class="line"></div>
          <div class="right bold" style="font-size: 12px;">TOTAL: P104.00</div>
          <div class="line"></div>
          <div class="center">${draft.receiptFooter || "Thank you for supporting Local!!!"}</div>
          <div class="center" style="margin-top: 12px;">- - - - - CUT HERE - - - - -</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const save = async () => {
    if (!dirty || saving || !hydrated) return;
    setSaving(true);
    try {
      await withActionFeedbackSafe(
        async () => {
          await saveSettings(draft);
        },
        {
          loading: "Saving settings…",
          success: "Settings saved.",
          error: "Could not save settings.",
        },
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <PermissionGate path="/settings">
      <PageContainer wide>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-responsive-3xl">Settings</h1>
            <p className="text-sm text-muted-foreground">Store configuration & POS options</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setResetConfirmOpen(true)}
              className="px-4 py-2.5 min-h-[44px] rounded-xl border bg-card hover:bg-muted text-sm font-medium flex items-center gap-2 touch-manipulation"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className="btn-primary text-sm min-h-[44px] flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <Section title="Store profile">
            <Field label="Shop name" value={draft.shopName} onChange={(v) => setDraft((d) => ({ ...d, shopName: v }))} />
            <Field
              label="Business style"
              value={draft.businessStyle}
              onChange={(v) => setDraft((d) => ({ ...d, businessStyle: v }))}
            />
            <Field label="Address" value={draft.address} onChange={(v) => setDraft((d) => ({ ...d, address: v }))} />
            <Field label="Phone" value={draft.phone} onChange={(v) => setDraft((d) => ({ ...d, phone: v }))} />
            <Field
              label="VAT TIN"
              value={draft.tin}
              onChange={(v) => setDraft((d) => ({ ...d, tin: formatTin(v) }))}
              placeholder="000-00-0000"
            />
          </Section>

        <Section title="VAT & service">
          <Toggle
            label="Apply VAT (12%) — VAT-inclusive pricing"
            checked={draft.vatEnabled}
            onChange={(v) => void handleToggle("vatEnabled", v)}
          />
          {draft.vatEnabled && (
            <Field
              label="VAT rate (%)"
              type="number"
              value={String(draft.vatRate)}
              onChange={(v) => setDraft((d) => ({ ...d, vatRate: Number(v) || 0 }))}
            />
          )}
          <Toggle
            label="Apply service fee"
            checked={draft.serviceEnabled}
            onChange={(v) => void handleToggle("serviceEnabled", v)}
          />
          {draft.serviceEnabled && (
            <Field
              label="Service rate (%)"
              type="number"
              value={String(draft.serviceRate)}
              onChange={(v) => setDraft((d) => ({ ...d, serviceRate: Number(v) || 0 }))}
            />
          )}
        </Section>

        <Section title="Senior & PWD discounts">
          <Field
            label="Senior citizen discount (%)"
            type="number"
            value={String(draft.seniorDiscountRate)}
            onChange={(v) => setDraft((d) => ({ ...d, seniorDiscountRate: Math.min(100, Math.max(0, Number(v) || 0)) }))}
          />
          <Field
            label="PWD discount (%)"
            type="number"
            value={String(draft.pwdDiscountRate)}
            onChange={(v) => setDraft((d) => ({ ...d, pwdDiscountRate: Math.min(100, Math.max(0, Number(v) || 0)) }))}
          />
          <p className="text-xs text-muted-foreground">
            Senior Citizens (RA 9994) and PWDs (RA 10754) receive these discounts and are exempt from VAT.
            Changes apply immediately to the POS after you save.
          </p>
        </Section>

        <Section title="Receipt & Thermal Printer (58mm / POS58D)">
          <Field
            label="Footer message"
            value={draft.receiptFooter}
            onChange={(v) => setDraft((d) => ({ ...d, receiptFooter: v }))}
          />

          <div className="pt-3 border-t border-border space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Printer className="w-4 h-4 text-accent" /> Thermal Receipt Printer Hardware Setup
            </h3>

            <Toggle
              label="Enable Thermal Printer Auto-Printing"
              checked={draft.printerEnabled ?? true}
              onChange={(v) => setDraft((d) => ({ ...d, printerEnabled: v }))}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Field
                label="Printer Name / Model"
                value={draft.printerName || "POS58D (58mm Thermal Printer)"}
                onChange={(v) => setDraft((d) => ({ ...d, printerName: v }))}
                placeholder="POS58D"
              />
              <Field
                label="Bluetooth MAC / Device ID"
                value={draft.printerAddress || "86:67:7A:00:4C:9D"}
                onChange={(v) => setDraft((d) => ({ ...d, printerAddress: v }))}
                placeholder="86:67:7A:00:4C:9D"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Paper Roll Width</label>
                <select
                  value={draft.printerPaperWidth || "58mm"}
                  onChange={(e) => setDraft((d) => ({ ...d, printerPaperWidth: e.target.value as any }))}
                  className="mt-1 w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm"
                >
                  <option value="58mm">58mm Thermal Paper (Standard POS58D - 32 chars/line)</option>
                  <option value="80mm">80mm Thermal Paper (Wide - 48 chars/line)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Connection Interface</label>
                <select
                  value={draft.printerConnectionType || "Bluetooth"}
                  onChange={(e) => setDraft((d) => ({ ...d, printerConnectionType: e.target.value as any }))}
                  className="mt-1 w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm"
                >
                  <option value="Bluetooth">Bluetooth (ESC/POS POS58D - PIN: 0000)</option>
                  <option value="USB">USB Cable (Direct Driver / Windows spooler)</option>
                  <option value="Network">Network / LAN IP Printer</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleConnectBluetoothPrinter}
                className="px-4 py-2.5 rounded-xl border border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
              >
                <Bluetooth className="w-3.5 h-3.5" /> Pair Bluetooth Printer (POS58D)
              </button>

              <button
                type="button"
                onClick={handleTestPrint}
                className="px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> Run 58mm Test Print Ticket
              </button>
            </div>
          </div>
        </Section>

        <Section title="User permissions">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">
              Logged in as <span className="font-medium text-foreground">{user?.fullname}</span> ({user?.role}).
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                <b>Admin:</b> Full access to all modules
              </li>
              <li>
                <b>Staff:</b> Access based on permissions set in Employees
              </li>
            </ul>
            <p className="mt-2 text-xs">Sidebar items and routes are hidden when the user lacks the required permission.</p>
          </div>
        </Section>
      </div>

        <div className="pt-6 border-t border-border flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between safe-bottom">
          <button
            type="button"
            onClick={async () => {
              await withActionFeedbackSafe(
                async () => {
                  await logout();
                  navigate({ to: "/" });
                },
                {
                  loading: "Signing out…",
                  success: "Signed out.",
                },
              );
            }}
            className="px-5 py-3 min-h-[48px] rounded-lg bg-destructive text-destructive-foreground font-medium inline-flex items-center justify-center gap-2 hover:opacity-90 touch-manipulation shrink-0 self-start"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
          <div className="flex flex-wrap gap-2 justify-end self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setResetConfirmOpen(true)}
              disabled={!dirty || saving}
              className="px-4 py-3 min-h-[48px] rounded-lg border bg-card hover:bg-muted text-sm font-medium inline-flex items-center justify-center gap-2 touch-manipulation disabled:opacity-45"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={!dirty || saving || !hydrated}
              className="btn-primary px-4 py-3 min-h-[48px] text-sm disabled:opacity-45"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>

        <ConfirmDeleteModal
          open={resetConfirmOpen}
          title="Reset changes"
          message="Are you sure???"
          detail="Unsaved edits will be discarded."
          confirmLabel="Reset"
          onClose={() => setResetConfirmOpen(false)}
          onConfirm={() => {
            setDraft(settings);
          }}
        />
      </PageContainer>
    </PermissionGate>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl border p-4 sm:p-6">
      <h2 className="font-display text-xl mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition ${checked ? "bg-accent" : "bg-muted"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow transition-all ${checked ? "left-6" : "left-0.5"}`} />
      </button>
    </label>
  );
}
