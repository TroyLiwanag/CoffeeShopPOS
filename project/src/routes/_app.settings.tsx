import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { usePos, type Settings } from "@/lib/pos-store";
import { LogOut, RotateCcw, Save, Printer, Bluetooth, CheckCircle2, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { ConfirmActionModal } from "@/components/ConfirmActionModal";
import { PermissionGate } from "@/components/PermissionGate";
import { withActionFeedbackSafe } from "@/lib/action-feedback";
import { PageContainer } from "@/components/layout/PageContainer";
import { formatTin } from "./_app.payment";
import { toast } from "sonner";
import api from "@/lib/api";

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
    a.printerConnectionType === b.printerConnectionType &&
    a.paymongoPublicKey === b.paymongoPublicKey &&
    a.paymongoSecretKey === b.paymongoSecretKey
  );
}

function SettingsScreen() {
  const { settings, saveSettings, logout, user, hydrated } = usePos();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Settings>(settings);
  const [saving, setSaving] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

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
          <div>VATable Sales: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; P92.86</div>
          <div>VAT Amount (12%): &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; P11.14</div>
          <div>VAT Exempt Sales: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; P0.00</div>
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
              onClick={() => setSaveConfirmOpen(true)}
              disabled={!dirty || saving}
              className="btn-primary text-sm min-h-[44px] flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>

        <ConfirmActionModal
          open={resetConfirmOpen}
          title="Reset Store Settings"
          message="Are you sure you want to reset all store settings back to default values?"
          detail="This will restore default business details, VAT, and printer configurations."
          confirmLabel="Reset Defaults"
          variant="destructive"
          onClose={() => setResetConfirmOpen(false)}
          onConfirm={async () => {
            setDraft(settings);
          }}
        />

        <ConfirmActionModal
          open={saveConfirmOpen}
          title="Save Store Settings"
          message="Are you sure you want to save these store settings changes?"
          detail="Updates will take effect immediately across all POS terminals."
          confirmLabel="Save Settings"
          variant="primary"
          onClose={() => setSaveConfirmOpen(false)}
          onConfirm={save}
        />

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

        <Section title="PayMongo Payment Gateway API (GCash & Dynamic QRPh)">
          <Field
            label="PayMongo Public Key (pk_test_... or pk_live_...)"
            value={draft.paymongoPublicKey || ""}
            onChange={(v) => setDraft((d) => ({ ...d, paymongoPublicKey: v }))}
            placeholder="pk_test_your_public_key_here"
          />
          <Field
            label="PayMongo Secret Key (sk_test_... or sk_live_...)"
            type="password"
            value={draft.paymongoSecretKey || ""}
            onChange={(v) => setDraft((d) => ({ ...d, paymongoSecretKey: v }))}
            placeholder="sk_test_your_secret_key_here"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Get your live API keys from <a href="https://dashboard.paymongo.com" target="_blank" rel="noreferrer" className="text-accent underline font-semibold">PayMongo Dashboard</a>. PayMongo API automatically generates dynamic QRPh codes and listens to instant GCash payment webhooks.
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

        {/* Security — Void Authorization (Admin only) */}
        {user?.role === "admin" && (
          <VoidPinSection settings={settings} saveSettings={saveSettings} />
        )}
      </div>

        <div className="pt-6 border-t border-border flex items-center justify-between safe-bottom">
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
            className="px-5 py-3 min-h-[48px] rounded-lg bg-destructive text-destructive-foreground font-medium inline-flex items-center justify-center gap-2 hover:opacity-90 touch-manipulation shrink-0"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
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

// ─────────────────────────────────────────────────────────────────────────────
// Void PIN Section (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
function VoidPinSection({ settings, saveSettings }: { settings: Settings; saveSettings: (s: Settings) => Promise<void> }) {
  const [adminPassword, setAdminPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAdminPw, setShowAdminPw] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const pinEnabled = (settings as any).voidPinEnabled !== false;
  const hasPinConfigured = (settings as any).voidPinConfigured === true;

  const handleToggleEnabled = async () => {
    setError(""); setSuccess("");
    if (!adminPassword.trim()) {
      setError("Enter your Admin password first to change Void PIN settings.");
      return;
    }
    try {
      setSaving(true);
      const { data } = await api.post("/settings/void-pin", {
        adminPassword,
        newPin: undefined,
        enableVoidPin: !pinEnabled,
      });
      if (data.success) {
        await saveSettings({ ...settings, ...(data.settings || {}), voidPinConfigured: hasPinConfigured } as Settings);
        setSuccess(`Void PIN authorization has been ${!pinEnabled ? "enabled" : "disabled"}.`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update Void PIN setting.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePin = async () => {
    setError(""); setSuccess("");
    if (!adminPassword.trim()) { setError("Current Admin password is required."); return; }
    if (!newPin.trim()) { setError("New Void PIN is required."); return; }
    if (!/^\d{4,8}$/.test(newPin.trim())) { setError("PIN must be 4–8 numeric digits."); return; }
    if (newPin !== confirmPin) { setError("New PIN and Confirm PIN do not match."); return; }

    try {
      setSaving(true);
      const { data } = await api.post("/settings/void-pin", {
        adminPassword,
        newPin,
        enableVoidPin: true,
      });
      if (data.success) {
        await saveSettings({ ...settings, ...(data.settings || {}), voidPinConfigured: true } as Settings);
        setSuccess("Void PIN updated and saved successfully.");
        setNewPin(""); setConfirmPin(""); setAdminPassword("");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save Void PIN.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Security — Void Authorization">
      <div className="flex items-center gap-2.5 mb-3">
        <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
        <div>
          <div className="font-semibold text-sm">Admin Void PIN</div>
          <div className="text-xs text-muted-foreground">
            Require an Admin PIN before any POS cart item can be voided. PIN is stored as a secure hash — never in plain text.
          </div>
        </div>
      </div>

      {/* Admin password — required for all changes */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-foreground">Current Admin Password *</label>
        <div className="relative">
          <input
            type={showAdminPw ? "text" : "password"}
            value={adminPassword}
            onChange={(e) => { setAdminPassword(e.target.value); setError(""); setSuccess(""); }}
            autoComplete="current-password"
            placeholder="Required to make any changes"
            className="w-full px-3 py-2.5 pr-10 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none"
          />
          <button type="button" onClick={() => setShowAdminPw(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
            {showAdminPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Toggle enable */}
      <div className="flex items-center justify-between pt-2 pb-1 border-t">
        <div>
          <div className="text-sm font-medium">Require PIN for Void</div>
          <div className="text-xs text-muted-foreground">
            {pinEnabled ? "PIN authorization is enabled — cashiers must enter Admin PIN to void cart items." : "PIN authorization is disabled — Admin role alone can authorize voids."}
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleEnabled}
          disabled={saving}
          className={`relative w-12 h-6 rounded-full transition-colors ${pinEnabled ? "bg-accent" : "bg-muted"} disabled:opacity-50`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow transition-all ${pinEnabled ? "left-6" : "left-0.5"}`} />
        </button>
      </div>

      {/* New PIN form */}
      <div className="space-y-3 pt-1 border-t">
        <div className="text-sm font-semibold">
          {hasPinConfigured ? "Change Void PIN" : "Set Void PIN"}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">New Void PIN (4–8 digits)</label>
            <div className="relative">
              <input
                type={showNewPin ? "text" : "password"}
                inputMode="numeric"
                value={newPin}
                onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8)); setError(""); }}
                maxLength={8}
                placeholder="••••"
                className="w-full px-3 py-2.5 pr-10 rounded-xl border bg-background text-sm font-mono tracking-widest focus:ring-2 focus:ring-ring focus:outline-none"
              />
              <button type="button" onClick={() => setShowNewPin(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
                {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Confirm New Void PIN</label>
            <div className="relative">
              <input
                type={showConfirmPin ? "text" : "password"}
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8)); setError(""); }}
                maxLength={8}
                placeholder="••••"
                className="w-full px-3 py-2.5 pr-10 rounded-xl border bg-background text-sm font-mono tracking-widest focus:ring-2 focus:ring-ring focus:outline-none"
              />
              <button type="button" onClick={() => setShowConfirmPin(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" tabIndex={-1}>
                {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSavePin}
          disabled={saving || !adminPassword || !newPin || !confirmPin}
          className="px-5 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          <ShieldAlert className="w-4 h-4" />
          {saving ? "Saving…" : hasPinConfigured ? "Update Void PIN" : "Save Void PIN"}
        </button>

        <p className="text-xs text-muted-foreground">
          The Void PIN is stored as a secure bcrypt hash. It is never stored in plain text, never returned by the API, and never included in audit logs.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}
    </Section>
  );
}
