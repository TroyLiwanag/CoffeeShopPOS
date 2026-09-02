import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePos, fmt, DiscountType, getExemptDiscountRate } from "@/lib/pos-store";
import { Banknote, BadgePercent, Tag, Check, X, Sparkles, AlertCircle } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { cn } from "@/lib/utils";
import { withActionFeedback } from "@/lib/action-feedback";
import { fetchPromos, type Promo } from "@/lib/promo-api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/payment")({
  component: PaymentScreen,
});

function isPromoValidNow(p: Promo): boolean {
  if (p.status !== "Active") return false;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  const startDateStr = (p.start_date || "").slice(0, 10);
  const endDateStr = (p.end_date || "").slice(0, 10);

  if (startDateStr && todayStr < startDateStr) return false;
  if (endDateStr && todayStr > endDateStr) return false;

  return true;
}

function PaymentScreen() {
  const {
    cart, cartSubtotal, discount, setDiscount, discountAmount,
    appliedPromo, setAppliedPromo, promoDiscountAmount,
    vatableSales, vatAmount, vatExemptSales, serviceCharge, cartTotal,
    placeOrder, settings,
  } = usePos();
  const navigate = useNavigate();
  const [method, setMethod] = useState<"Cash" | "QR">("Cash");
  const [cashGiven, setCashGiven] = useState("");
  const [customer, setCustomer] = useState({ name: "", address: "", tin: "" });
  const [confirming, setConfirming] = useState(false);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [availablePromos, setAvailablePromos] = useState<Promo[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(false);

  const isExempt = discount.type === "Senior" || discount.type === "PWD";
  const exemptDiscountRate = getExemptDiscountRate(settings, discount.type);

  useEffect(() => {
    const loadPromos = async () => {
      setLoadingPromos(true);
      try {
        const list = await fetchPromos();
        const valid = list.filter(isPromoValidNow);
        setAvailablePromos(valid);
      } catch {
        /* fallback empty */
      } finally {
        setLoadingPromos(false);
      }
    };
    loadPromos();
  }, []);

  if (cart.length === 0) {
    return (
      <PageContainer>
        <p className="text-muted-foreground">No items in cart. <Link to="/pos" className="text-accent underline">Back to POS</Link></p>
      </PageContainer>
    );
  }

  const change = method === "Cash" ? Math.max(0, Number(cashGiven || 0) - cartTotal) : 0;
  const canConfirm = (method === "QR" || Number(cashGiven || 0) >= cartTotal) &&
    (!isExempt || (discount.idNumber && discount.beneficiary));

  const confirm = async () => {
    if (confirming) return;

    if (isExempt) {
      const missingId = !discount.idNumber?.trim();
      const missingName = !discount.beneficiary?.trim();
      if (missingId && missingName) {
        toast.error(`Please enter the ${discount.type} ID No. and Beneficiary Name.`);
        return;
      }
      if (missingId) {
        toast.error(`Please enter the ${discount.type} ID No.`);
        return;
      }
      if (missingName) {
        toast.error(`Please enter the Beneficiary Name.`);
        return;
      }
    }

    if (method === "Cash" && Number(cashGiven || 0) < cartTotal) {
      toast.error(`Cash received (${fmt(Number(cashGiven || 0))}) is less than total amount (${fmt(cartTotal)}).`);
      return;
    }

    setConfirming(true);
    try {
      const order = await withActionFeedback(
        () => placeOrder(method, customer, Number(cashGiven || cartTotal), "Dine in"),
        {
          loading: "Processing payment…",
          success: "Payment complete!",
          error: "Payment could not be completed.",
        },
      );
      navigate({ to: "/receipt/$id", params: { id: order.id } });
    } catch {
      /* toast shown */
    } finally {
      setConfirming(false);
    }
  };

  return (
    <PageContainer wide>
      <h1 className="font-display text-responsive-3xl mb-4 sm:mb-6">Payment</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-card rounded-2xl border p-4 sm:p-6">
            <h2 className="font-display text-xl mb-4">Order summary</h2>
            <div className="space-y-2 mb-4">
              {cart.map(i => (
                <div key={i.id} className="flex justify-between text-sm py-2 border-b last:border-b-0">
                  <div>
                    <div className="font-medium">{i.qty}× {i.product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {i.size}, {i.milk} · Batch {i.product.batchNo}
                    </div>
                  </div>
                  <div className="font-medium">{fmt(i.unitPrice * i.qty)}</div>
                </div>
              ))}
            </div>
            <div className="space-y-1 text-sm pt-2 border-t">
              <Row label="Gross Sales" value={fmt(cartSubtotal)} />
              {appliedPromo && (
                <Row
                  label={`Promo: ${appliedPromo.promo_name} (${appliedPromo.discount_type === "percentage" ? `${appliedPromo.discount_value}%` : `₱${appliedPromo.discount_value}`})`}
                  value={`-${fmt(promoDiscountAmount)}`}
                  accent
                />
              )}
              {isExempt ? (
                <>
                  <Row label={`${discount.type} Discount (${exemptDiscountRate}%)`} value={`-${fmt(discountAmount)}`} accent />
                  <Row label="VAT Exempt Sales" value={fmt(vatExemptSales)} muted />
                </>
              ) : (
                settings.vatEnabled && (
                  <>
                    <Row label="VATable Sales" value={fmt(vatableSales)} muted />
                    <Row label={`VAT (${settings.vatRate}%)`} value={fmt(vatAmount)} muted />
                  </>
                )
              )}
              {settings.serviceEnabled && <Row label={`Service (${settings.serviceRate}%)`} value={fmt(serviceCharge)} />}
              <div className="flex justify-between pt-2 mt-2 border-t font-display text-xl">
                <span>Total</span><span className="text-primary">{fmt(cartTotal)}</span>
              </div>
            </div>
          </div>

          {/* Promos Section */}
          <div className="glass-card rounded-2xl border p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-accent" />
                <h2 className="font-display text-lg">Promotions</h2>
              </div>
              <button
                type="button"
                onClick={() => setPromoModalOpen(true)}
                className="btn-primary text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-4 h-4" /> {appliedPromo ? "Change Promo" : "Apply Promo"}
              </button>
            </div>

            {appliedPromo ? (
              <div className="p-3 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    {appliedPromo.promo_name}
                    <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-bold">
                      {appliedPromo.discount_type === "percentage" ? `${appliedPromo.discount_value}% OFF` : `₱${appliedPromo.discount_value} OFF`}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    For {appliedPromo.eligible_customer} • Discount: -{fmt(promoDiscountAmount)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAppliedPromo(null)}
                  className="p-1.5 rounded-lg hover:bg-black/10 text-muted-foreground hover:text-foreground"
                  title="Remove Promo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No promo applied. Click "Apply Promo" to select an active store promotion.
              </p>
            )}
          </div>

          {/* Customer form (receipt) */}
          <div className="glass-card rounded-2xl border p-4 sm:p-6">
            <h2 className="font-display text-lg mb-4">Customer details (for receipt)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Customer name" value={customer.name} onChange={v => setCustomer({ ...customer, name: v })} placeholder="Walk-in" />
              <Field label="TIN (9 digits)" value={customer.tin} onChange={v => setCustomer({ ...customer, tin: formatTin(v) })} placeholder="000-00-0000" maxLength={11} isNumeric />
              <div className="col-span-2">
                <Field label="Address" value={customer.address} onChange={v => setCustomer({ ...customer, address: v })} placeholder="Optional" />
              </div>
            </div>
          </div>

          {/* Discount */}
          <div className="glass-card rounded-2xl border p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <BadgePercent className="w-5 h-5 text-accent" />
              <h2 className="font-display text-lg">Discounts (Senior / PWD)</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["None", "Senior", "PWD"] as DiscountType[]).map(d => (
                <button key={d} type="button" onClick={() => setDiscount({ ...discount, type: d })}
                  className={cn(
                    "py-3 min-h-[44px] rounded-lg border text-sm touch-manipulation transition-all active:scale-95",
                    discount.type === d ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted",
                  )}>{d}</button>
              ))}
            </div>
            {isExempt && (
              <div className="space-y-3 mt-4">
                {(!discount.idNumber?.trim() || !discount.beneficiary?.trim()) && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 text-xs font-medium animate-fade-in">
                    <AlertCircle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-800 dark:text-amber-300">Data Required for {discount.type} Discount:</span>
                      <p className="mt-0.5 text-muted-foreground">
                        Please enter both the <strong>{discount.type} ID No.</strong> and <strong>Beneficiary Name</strong> to apply the {exemptDiscountRate}% discount.
                      </p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label={`${discount.type} ID No. (${discount.type === "Senior" ? "5 digits" : "12 digits"}) *`} value={discount.idNumber || ""}
                    onChange={v => setDiscount({ ...discount, idNumber: formatDiscountId(discount.type, v) })}
                    placeholder={discount.type === "Senior" ? "00-000" : "0000-0000-0000"}
                    maxLength={discount.type === "Senior" ? 6 : 14}
                    isNumeric
                    error={!discount.idNumber?.trim()} />
                  <Field label="Beneficiary name *" value={discount.beneficiary || ""}
                    onChange={v => setDiscount({ ...discount, beneficiary: v })}
                    placeholder="Enter Beneficiary Full Name"
                    error={!discount.beneficiary?.trim()} />
                  <p className="col-span-1 sm:col-span-2 text-xs text-muted-foreground">
                    {exemptDiscountRate}% discount + VAT exemption per {discount.type === "Senior" ? "RA 9994" : "RA 10754"}.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="glass-card rounded-2xl border p-4 sm:p-6">
              <h2 className="font-display text-xl mb-4">Payment method</h2>
              <div className="p-3.5 rounded-xl border bg-primary/10 border-primary/30 flex items-center gap-3">
                <Banknote className="w-6 h-6 text-primary shrink-0" />
                <div>
                  <div className="font-semibold text-sm text-foreground">Cash Payment</div>
                  <div className="text-xs text-muted-foreground">Cash payment on counter</div>
                </div>
              </div>

              {method === "Cash" && (
                <div className="mt-5 space-y-3">
                  <label className="text-sm font-medium">Cash received</label>
                  <input value={cashGiven} onChange={e => setCashGiven(e.target.value)} type="number" placeholder="0.00"
                    className="w-full px-4 py-3 min-h-[48px] rounded-lg border bg-background text-lg" />
                  <div className="flex flex-wrap gap-2">
                    {[50, 100, 200, 500, 1000].map(n => (
                      <button key={n} type="button" onClick={() => setCashGiven(String(n))}
                        className="px-4 py-2.5 min-h-[44px] rounded-lg border text-sm hover:bg-muted touch-manipulation active:scale-95">₱{n}</button>
                    ))}
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="text-muted-foreground">Change</span>
                    <span className="font-semibold text-accent">{fmt(change)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 safe-bottom">
              <button type="button" onClick={() => navigate({ to: "/pos" })}
                className="flex-1 py-3 min-h-[48px] rounded-lg border bg-card hover:bg-muted touch-manipulation active:scale-95 transition-transform">Cancel</button>
              <button type="button" onClick={confirm} disabled={confirming}
                className="btn-primary flex-1 py-3 min-h-[48px]">
                {confirming ? "Processing…" : "Confirm payment"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {promoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setPromoModalOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-accent" />
                <h2 className="font-display text-xl">Select Promo</h2>
              </div>
              <button
                type="button"
                onClick={() => setPromoModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {loadingPromos ? (
                <p className="text-center py-6 text-sm text-muted-foreground">Checking active promos…</p>
              ) : availablePromos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground space-y-2">
                  <Tag className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-sm font-medium">No active promotions available right now.</p>
                  <p className="text-xs">Promotions must be Active and within the valid date and time range.</p>
                </div>
              ) : (
                availablePromos.map((p) => {
                  const selected = appliedPromo?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setAppliedPromo(p);
                        setPromoModalOpen(false);
                      }}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 touch-manipulation active:scale-[0.98]",
                        selected
                          ? "border-accent bg-accent/15 shadow-sm"
                          : "border-border hover:bg-muted/50",
                      )}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="font-bold text-base text-foreground flex items-center gap-2">
                          <span className="truncate">{p.promo_name}</span>
                          <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-bold shrink-0">
                            {p.discount_type === "percentage" ? `${p.discount_value}% OFF` : `₱${p.discount_value} OFF`}
                          </span>
                        </div>
                        {p.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                        )}
                        <div className="text-xs text-accent font-medium">
                          Eligible: {p.eligible_customer}
                        </div>
                      </div>
                      {selected && (
                        <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {appliedPromo && (
              <button
                type="button"
                onClick={() => {
                  setAppliedPromo(null);
                  setPromoModalOpen(false);
                }}
                className="w-full py-2.5 rounded-lg border text-sm font-medium text-destructive hover:bg-destructive/10 shrink-0"
              >
                Clear Applied Promo
              </button>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function MethodCard({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "p-4 min-h-[88px] rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all touch-manipulation active:scale-95",
        active ? "border-accent bg-accent/10 shadow-sm" : "border-border hover:bg-muted",
      )}>
      {icon}<span className="text-sm font-medium">{label}</span>
    </button>
  );
}

export function formatTin(val: string): string {
  const d = val.replace(/\D/g, "").slice(0, 9);
  if (!d) return "";
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

export function formatSeniorId(val: string): string {
  const d = val.replace(/\D/g, "").slice(0, 5);
  if (!d) return "";
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}-${d.slice(2)}`;
}

export function formatPwdId(val: string): string {
  const d = val.replace(/\D/g, "").slice(0, 12);
  if (!d) return "";
  if (d.length <= 4) return d;
  if (d.length <= 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`;
}

export function formatDiscountId(type: string, val: string): string {
  if (type === "Senior") return formatSeniorId(val);
  if (type === "PWD") return formatPwdId(val);
  return formatTin(val);
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  isNumeric,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
  isNumeric?: boolean;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={isNumeric ? "numeric" : undefined}
        maxLength={maxLength || (isNumeric ? 14 : undefined)}
        className={cn(
          "mt-1 w-full px-3 py-2.5 min-h-[44px] rounded-lg border bg-background text-base sm:text-sm transition-colors",
          isNumeric ? "font-mono tracking-wider" : "",
          error ? "border-amber-500/70 focus:border-amber-600 focus:ring-1 focus:ring-amber-500/30 bg-amber-500/5" : ""
        )}
      />
    </div>
  );
}

function Row({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${muted ? "text-muted-foreground" : ""} ${accent ? "text-accent font-medium" : ""}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
