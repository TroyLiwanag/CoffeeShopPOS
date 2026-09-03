import type { Order, Settings } from "./pos-store";
import { formatOrderNumber } from "./pos-store";

/**
 * Converts /cafe-corazon-logo.png into monochrome ESC/POS GS v 0 raster bitmap bytes
 * Uses 96px width (12 bytes) for maximum thermal printer buffer stability (Xprinter / POS58D)
 */
export async function getLogoEscPosBytes(logoUrl: string = "/cafe-corazon-logo.png"): Promise<number[]> {
  if (typeof window === "undefined") return [];

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = logoUrl;

    img.onload = () => {
      try {
        const width = 96; // 96 pixels wide (12 bytes width) for lightweight, zero-lag thermal printing
        const height = Math.round((img.height / img.width) * width);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve([]);

        // White background fill
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        const widthBytes = Math.ceil(width / 8);
        const raster: number[] = [];

        // ESC/POS Command: GS v 0 0 xL xH yL yH
        raster.push(0x1d, 0x76, 0x30, 0x00);
        raster.push(widthBytes % 256, Math.floor(widthBytes / 256));
        raster.push(height % 256, Math.floor(height / 256));

        for (let y = 0; y < height; y++) {
          for (let xByte = 0; xByte < widthBytes; xByte++) {
            let byteVal = 0;
            for (let bit = 0; bit < 8; bit++) {
              const x = xByte * 8 + bit;
              if (x < width) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];
                // Luminance / Thresholding for black dots on thermal head
                const brightness = r * 0.299 + g * 0.587 + b * 0.114;
                if (a > 128 && brightness < 180) {
                  byteVal |= 0x80 >> bit;
                }
              }
            }
            raster.push(byteVal);
          }
        }
        resolve(raster);
      } catch (err) {
        console.error("Logo ESC/POS convert error:", err);
        resolve([]);
      }
    };

    img.onerror = () => resolve([]);
  });
}

export function generateEscPosReceipt(order: Order, settings: Settings, logoBytes: number[] = []): Uint8Array {
  const bytes: number[] = [];

  const writeStr = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      bytes.push(code > 255 ? 63 : code);
    }
  };

  // 1. Initialize printer (ESC @) & set PC850 character table (ESC t 2)
  bytes.push(0x1b, 0x40);
  bytes.push(0x1b, 0x74, 0x02);

  // 2. Align Center - Header & Logo
  bytes.push(0x1b, 0x61, 0x01);

  // Append logo raster bitmap if generated
  if (logoBytes && logoBytes.length > 0) {
    bytes.push(...logoBytes);
    bytes.push(0x0a, 0x0a); // Feed lines after logo to ensure printer advances to text mode cleanly
  }

  bytes.push(0x1d, 0x21, 0x11); // Double width & height
  bytes.push(0x1b, 0x45, 0x01); // Bold ON
  writeStr((settings.shopName || "Cafe Corazon") + "\n");

  bytes.push(0x1d, 0x21, 0x00); // Normal size
  bytes.push(0x1b, 0x45, 0x00); // Bold OFF
  writeStr((settings.businessStyle || "Kapeng may Puso") + "\n");
  if (settings.phone) writeStr(settings.phone + "\n");

  const separator = "--------------------------------\n";
  writeStr(separator);

  // 3. Align Left - Order Metadata
  bytes.push(0x1b, 0x61, 0x00);
  const orNo = formatOrderNumber(order.number, order.createdAt);
  const dateStr = new Date(order.createdAt).toLocaleString([], {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  writeStr(`Date: ${dateStr}\n`);
  writeStr(`Order #: ${orNo}\n`);
  writeStr(`Employee: ${order.cashier || "Owner"}\n`);
  writeStr(separator);

  // 4. Items List (32 columns max for 58mm thermal paper)
  order.items.forEach((i) => {
    const itemTotalStr = `P${(i.unitPrice * i.qty).toFixed(2)}`;
    const name = `${i.product.name}${i.size ? ` (${i.size.slice(0, 1).toUpperCase()})` : ""}`;

    const maxNameLen = 32 - itemTotalStr.length - 1;
    const trimmedName = name.length > maxNameLen ? name.substring(0, maxNameLen) : name;
    const padding = Math.max(1, 32 - trimmedName.length - itemTotalStr.length);

    writeStr(trimmedName + " ".repeat(padding) + itemTotalStr + "\n");
    writeStr(`  ${i.qty} x P${i.unitPrice.toFixed(2)}\n`);

    const opts = [i.sugar, i.milk].filter(Boolean);
    if (opts.length > 0) writeStr(`  (${opts.join(", ")})\n`);
    if (i.addons.length > 0) writeStr(`  + ${i.addons.join(", ")}\n`);
  });

  writeStr(separator);

  // 5. Totals & Payment Summary
  const writeRow = (left: string, right: string) => {
    const maxLen = 32;
    const rightLen = right.length;
    const leftMax = Math.max(0, maxLen - rightLen - 1);
    const trimmedLeft = left.length > leftMax ? left.substring(0, leftMax) : left;
    const padding = Math.max(1, maxLen - trimmedLeft.length - rightLen);
    writeStr(trimmedLeft + " ".repeat(padding) + right + "\n");
  };

  const itemsSubtotal = order.items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const subtotalVal = Math.max(order.subtotal || 0, itemsSubtotal);

  bytes.push(0x1b, 0x61, 0x00); // Align Left for 2-column rows
  writeRow("Subtotal:", `P${subtotalVal.toFixed(2)}`);

  const promoAmt = order.promoDiscountAmount || 0;
  if (order.promoName || promoAmt > 0) {
    const label = order.promoName ? `Promo (${order.promoName}):` : "Promo Discount:";
    writeRow(label, `-P${promoAmt.toFixed(2)}`);
  }

  const isExemptType = order.discount?.type === "Senior" || order.discount?.type === "PWD";
  const calcExemptDiscount = Math.max(0, subtotalVal - order.total - promoAmt);
  const discountAmt = (order.discountAmount && order.discountAmount > 0) ? order.discountAmount : calcExemptDiscount;

  const isDiscountApplied = isExemptType || discountAmt > 0.01;
  const discountLabelType = isExemptType ? order.discount.type : "Senior/PWD";
  const discountRate = order.discountRate || (order.discount?.type === "Senior" ? settings.seniorDiscountRate : settings.pwdDiscountRate) || 20;

  if (isDiscountApplied && discountAmt > 0.01) {
    writeRow(`${discountLabelType} Disc (${discountRate}%):`, `-P${discountAmt.toFixed(2)}`);
  }

  bytes.push(0x1b, 0x45, 0x01); // Bold ON
  writeRow("TOTAL:", `P${order.total.toFixed(2)}`);
  bytes.push(0x1b, 0x45, 0x00); // Bold OFF
  writeRow("Cash:", `P${(order.cashGiven ?? order.total).toFixed(2)}`);
  const change = order.cashGiven ? Math.max(0, order.cashGiven - order.total) : 0;
  writeRow("Change:", `P${change.toFixed(2)}`);

  writeStr(separator);

  // Customer & Discount Metadata if present
  const hasPromo = !!order.promoName || promoAmt > 0;
  if (order.customerName || isDiscountApplied || hasPromo) {
    bytes.push(0x1b, 0x61, 0x00); // Align Left
    if (order.customerName) writeStr(`Customer: ${order.customerName}\n`);
    if (order.promoName) writeStr(`Applied Promo: ${order.promoName}\n`);
    if (isDiscountApplied) {
      writeStr(`Discount: ${discountLabelType} (${discountRate}%)\n`);
      if (order.discount?.idNumber) writeStr(`${discountLabelType} ID: ${order.discount.idNumber}\n`);
      if (order.discount?.beneficiary) writeStr(`Beneficiary: ${order.discount.beneficiary}\n`);
    }
    writeStr(separator);
  }

  // 6. Footer
  bytes.push(0x1b, 0x61, 0x01); // Center
  writeStr((settings.receiptFooter || "Thank you for supporting Local!!!") + "\n\n");
  writeStr(`*${orNo}*\n`);

  // Feed 3 lines & Paper Cut (GS V A 0)
  bytes.push(0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x41, 0x00);

  return new Uint8Array(bytes);
}
