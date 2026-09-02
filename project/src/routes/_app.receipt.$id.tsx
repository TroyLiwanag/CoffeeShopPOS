import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { usePos, fmt, formatOrderNumber, type CartItem } from "@/lib/pos-store";
import { Printer, ArrowLeft, Usb, Bluetooth, HelpCircle, ChevronDown, ChevronUp, X } from "lucide-react";
import { hasPermission } from "@/lib/permissions";
import { PageContainer } from "@/components/layout/PageContainer";
import { generateEscPosReceipt, getLogoEscPosBytes } from "@/lib/esc-pos-encoder";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/receipt/$id")({
  component: ReceiptScreen,
});

function ReceiptScreen() {
  const { id } = Route.useParams();
  const { orders, settings, user } = usePos();
  const navigate = useNavigate();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPrintingDirect, setIsPrintingDirect] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <PageContainer>
        <p className="text-muted-foreground">
          Order not found.{" "}
          <Link to="/pos" className="text-accent underline">
            Back to POS
          </Link>
        </p>
      </PageContainer>
    );
  }

  const canPrint = true; // All users (staff, cashier, admin) can use thermal print
  const orNo = formatOrderNumber(order.number, order.createdAt);
  const isExempt = order.discount.type === "Senior" || order.discount.type === "PWD";
  const discountRate = order.discountRate ?? (order.discount.type === "Senior" ? settings.seniorDiscountRate : settings.pwdDiscountRate);
  const formattedDate = new Date(order.createdAt).toLocaleString([], {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Direct USB / Serial ESC-POS Printing (115200 Baud from self-test)
  const handlePrintViaThermalPrinter = async () => {
    if (typeof window === "undefined" || !("serial" in navigator)) {
      toast.error("Web Serial API is not supported in this browser. Use Google Chrome or MS Edge, or use Standard Print.");
      return;
    }
    try {
      setIsPrintingDirect(true);
      toast.info("Select your POS58D thermal printer port...");
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 115200 });

      const logoBytes = await getLogoEscPosBytes("/cafe-corazon-logo.png");
      const escBytes = generateEscPosReceipt(order, settings, logoBytes);
      const writer = port.writable.getWriter();

      // Stream in 128-byte micro-chunks with 20ms delay to prevent receive buffer overflow on Xprinter/POS58D
      const CHUNK_SIZE = 128;
      for (let offset = 0; offset < escBytes.length; offset += CHUNK_SIZE) {
        const chunk = escBytes.slice(offset, offset + CHUNK_SIZE);
        await writer.write(chunk);
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      writer.releaseLock();
      await port.close();
      toast.success("Receipt printed with logo cleanly to POS58D!");
      setIsPrintModalOpen(false);
    } catch (err: any) {
      if (err?.name !== "NotFoundError") {
        toast.error(`Print error: ${err.message || "Failed to access thermal printer port"}`);
      }
    } finally {
      setIsPrintingDirect(false);
    }
  };

  // Web Bluetooth Direct Printing
  const handlePrintBluetooth = async () => {
    if (typeof window === "undefined" || !("bluetooth" in navigator)) {
      toast.error("Web Bluetooth is not available in this browser. Please pair POS58D in Windows Settings first.");
      return;
    }
    try {
      setIsPrintingDirect(true);
      toast.info("Searching for POS58D Bluetooth Printer...");
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "000018f0-0000-1000-8000-00805f9b34fb",
          "00001101-0000-1000-8000-00805f9b34fb",
          "0000ae30-0000-1000-8000-00805f9b34fb",
        ],
      });
      toast.success(`Connected to ${device.name || "POS58D Printer"}. Sending print job...`);
      setIsPrintModalOpen(false);
      window.print();
    } catch (err: any) {
      if (err?.name !== "NotFoundError") {
        toast.error(`Bluetooth error: ${err.message || "Ensure POS58D is paired in Windows/Phone Settings first."}`);
      }
    } finally {
      setIsPrintingDirect(false);
    }
  };

  const handleStandardPrint = () => {
    setIsPrintModalOpen(false);
    window.print();
  };

  return (
    <PageContainer className="max-w-md mx-auto py-6 sm:py-10 receipt-page bg-white">
      {/* Top navigation bar */}
      <div className="mb-4 no-print flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate({ to: "/pos" })}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border bg-card hover:bg-muted text-xs font-medium text-foreground transition-all touch-manipulation active:scale-95 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to POS
        </button>
        <span className="text-[11px] font-mono bg-muted/60 text-muted-foreground px-2.5 py-1 rounded-md border">
          🖨️ 58mm Thermal Receipt
        </span>
      </div>

      <div
        id="printable-receipt"
        className="receipt-document bg-white rounded-xl border border-border/80 p-5 sm:p-6 shadow-sm font-mono text-sm text-foreground space-y-3"
      >
        {/* Top Header metadata */}
        <div className="flex justify-between items-center text-xs text-muted-foreground pb-2 border-b border-dashed border-gray-300">
          <span>{formattedDate}</span>
          <span className="font-bold">#{orNo}</span>
        </div>

        {/* Logo & Store Info */}
        <div className="text-center py-1 space-y-1">
          <img
            src="/cafe-corazon-logo.png"
            alt="Cafe Corazon Logo"
            className="w-16 h-16 mx-auto object-contain mb-1"
          />
          <h2 className="font-bold text-base tracking-tight text-foreground">
            {settings.shopName || "Cafe Corazon"}
          </h2>
          <p className="text-xs text-muted-foreground italic font-sans">
            {settings.businessStyle || "Kapeng may Puso 🖤"}
          </p>
        </div>

        {/* Staff & POS Station */}
        <div className="text-xs space-y-0.5 pt-2 border-t border-dashed border-gray-300">
          <div>
            Employee: <span className="font-semibold">{order.cashier || "Owner"}</span>
          </div>
          <div>
            POS: <span className="font-semibold">POS 1</span>
          </div>
        </div>

        {/* Items List */}
        <div className="border-t border-dashed border-gray-300 pt-3 space-y-2.5">
          {order.items.map((i) => {
            const displayName = `${i.product.name}${i.size ? ` (${i.size.slice(0, 1).toUpperCase()})` : ""}`;
            return (
              <div key={i.id} className="space-y-0.5">
                <div className="flex justify-between items-start text-sm">
                  <span className="font-semibold text-foreground">{displayName}</span>
                  <span className="font-bold">₱{(i.unitPrice * i.qty).toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {i.qty} x ₱{i.unitPrice.toFixed(2)}
                </div>
                <ReceiptItemMeta item={i} />
              </div>
            );
          })}
        </div>

        {/* Totals & Payment */}
        <div className="border-t border-dashed border-gray-300 pt-3 space-y-1.5 text-sm">
          {order.promoName && (
            <div className="flex justify-between text-xs text-accent">
              <span>Promo ({order.promoName})</span>
              <span>-{fmt(order.promoDiscountAmount || 0)}</span>
            </div>
          )}
          {isExempt && (
            <div className="flex justify-between text-xs text-amber-700 dark:text-amber-400">
              <span>{order.discount.type} Discount ({discountRate}%)</span>
              <span>-{fmt(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-base font-bold pt-1">
            <span>Total</span>
            <span className="text-lg">₱{order.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Cash</span>
            <span>₱{(order.cashGiven ?? order.total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Change</span>
            <span>₱{(order.cashGiven ? Math.max(0, order.cashGiven - order.total) : 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Customer & Discount Metadata if present */}
        {(order.customerName || isExempt) && (
          <div className="border-t border-dashed border-gray-300 pt-2 text-xs text-muted-foreground space-y-0.5">
            {order.customerName && <div>Customer: {order.customerName}</div>}
            {isExempt && order.discount.idNumber && <div>{order.discount.type} ID: {order.discount.idNumber}</div>}
            {isExempt && order.discount.beneficiary && <div>Beneficiary: {order.discount.beneficiary}</div>}
          </div>
        )}

        {/* Footer Message */}
        <div className="border-t border-dashed border-gray-300 pt-3 text-center">
          <p className="font-semibold text-xs tracking-wide text-foreground">
            {settings.receiptFooter || "Thank you for supporting Local!!!"}
          </p>
        </div>
      </div>

      {/* Main Single Print Receipt Button */}
      <div className="receipt-actions no-print mt-6">
        <button
          type="button"
          onClick={() =>
            canPrint ? setIsPrintModalOpen(true) : alert("Only authorized personnel can print receipts.")
          }
          className={`w-full py-3.5 min-h-[50px] rounded-xl flex items-center justify-center gap-2 text-base font-bold transition-all shadow-md active:scale-98 ${
            canPrint
              ? "bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
              : "bg-muted/40 border border-border opacity-60 cursor-not-allowed text-muted-foreground"
          }`}
        >
          <Printer className="w-5 h-5" /> Print Receipt
        </button>
      </div>

      {/* Clean Crisp Print Modal Popup */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in no-print">
          <div className="relative w-full max-w-md bg-card rounded-2xl border border-border p-6 shadow-2xl space-y-5 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Print Thermal Receipt</h3>
                  <p className="text-xs text-muted-foreground">Select connection method for POS58D (58mm)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Options List */}
            <div className="space-y-3">
              {/* Option 1: Print */}
              <button
                type="button"
                onClick={handlePrintViaThermalPrinter}
                disabled={isPrintingDirect}
                className="w-full p-3.5 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-foreground transition-all flex items-center justify-between text-left group active:scale-98 disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    <Printer className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                      Print
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Pick a printer
                    </div>
                  </div>
                </div>
              </button>

              {/* Option 2: Connect to Bluetooth */}
              <button
                type="button"
                onClick={handlePrintBluetooth}
                disabled={isPrintingDirect}
                className="w-full p-3.5 rounded-xl border bg-card hover:bg-muted text-foreground transition-all flex items-center justify-between text-left group active:scale-98 disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center font-bold">
                    <Bluetooth className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground group-hover:text-accent transition-colors">
                      Connect to Bluetooth
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Wireless Bluetooth ESC/POS printing (PIN: 0000)
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Expandable Printer Setup Guide */}
            <div className="border-t pt-3.5">
              <button
                type="button"
                onClick={() => setShowGuideModal(!showGuideModal)}
                className="w-full py-2 px-3 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground text-xs font-medium flex items-center justify-between border transition-all"
              >
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-accent" /> Thermal Printer Setup Guide
                </span>
                {showGuideModal ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showGuideModal && (
                <div className="mt-2.5 p-3.5 rounded-xl border bg-muted/30 text-xs space-y-2 text-foreground animate-fade-in max-h-48 overflow-y-auto">
                  <div className="font-semibold text-accent border-b pb-1.5 flex items-center justify-between">
                    <span>📋 Quick Setup Steps:</span>
                    <span className="font-mono bg-card border px-1.5 py-0.5 rounded text-[10px]">PIN: 0000</span>
                  </div>
                  <ol className="list-decimal ml-4 space-y-1.5 text-muted-foreground text-[11px]">
                    <li>
                      <strong className="text-foreground">Option 1: Direct USB or Bluetooth (Recommended)</strong>
                      <br />
                      Plug via USB cable or pair Bluetooth (PIN: <code className="bg-card px-1 rounded text-foreground">0000</code>). Click <strong>Direct USB or Bluetooth</strong> and select the POS58D printer port.
                    </li>
                    <li>
                      <strong className="text-foreground">Option 2: Standard Windows Print Driver</strong>
                      <br />
                      Select <strong>Standard Windows Print Driver</strong> and choose POS58D from the Windows print dialog.
                    </li>
                  </ol>
                </div>
              )}
            </div>

            {/* Cancel Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="w-full py-2.5 rounded-xl border bg-muted/40 hover:bg-muted text-xs font-medium text-muted-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function ReceiptItemMeta({ item }: { item: CartItem }) {
  const opts = [item.sugar, item.milk].filter(Boolean);
  if (opts.length === 0 && item.addons.length === 0) return null;
  return (
    <>
      {opts.length > 0 && (
        <div className="text-xs text-muted-foreground">{opts.join(" · ")}</div>
      )}
      {item.addons.length > 0 && (
        <div className="text-xs text-muted-foreground">+ {item.addons.join(", ")}</div>
      )}
    </>
  );
}
