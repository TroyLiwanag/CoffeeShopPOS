/**
 * Centralized pricing computation helper for Café Corazon POS (Frontend).
 * Ensures consistent financial calculations across POS cart, checkout, receipt, and reports.
 */

export interface AddonItem {
  name: string;
  price: number;
}

export interface PricingCartItem {
  id?: string;
  basePrice?: number;
  price?: number;
  unitPrice?: number;
  itemTotal?: number;
  qty?: number;
  quantity?: number;
  addons?: AddonItem[] | string[];
}

export interface PricingSettings {
  vatEnabled?: boolean;
  vatRate?: number;
  serviceEnabled?: boolean;
  serviceRate?: number;
  seniorDiscountRate?: number;
  pwdDiscountRate?: number;
}

export interface AppliedDiscountInfo {
  type: "None" | "Senior" | "PWD";
  idNumber?: string;
  beneficiary?: string;
}

export interface PromoInfo {
  id?: number;
  promo_name?: string;
  discount_type?: "percentage" | "fixed";
  discount_value?: number;
  status?: string;
}

export function calculateAddonsTotal(addons?: AddonItem[] | string[]): number {
  if (!addons || !Array.isArray(addons)) return 0;
  let total = 0;
  for (const a of addons) {
    if (typeof a === "object" && a !== null && "price" in a) {
      total += Number((a as AddonItem).price) || 0;
    }
  }
  return total;
}

export function calculateItemUnitPrice(item: PricingCartItem): number {
  if (item.unitPrice !== undefined && Number(item.unitPrice) > 0) {
    return Number(item.unitPrice);
  }
  const base = Number(item.basePrice ?? item.price) || 0;
  const addonsTotal = calculateAddonsTotal(item.addons);
  return base + addonsTotal;
}

export function calculateItemTotal(item: PricingCartItem): number {
  const unitPrice = calculateItemUnitPrice(item);
  const qty = Number(item.qty ?? item.quantity) || 1;
  return unitPrice * qty;
}

export function calculateOrderTotals({
  items = [],
  promo = null,
  discount = { type: "None" },
  settings = {},
}: {
  items: PricingCartItem[];
  promo?: PromoInfo | null;
  discount?: AppliedDiscountInfo;
  settings?: PricingSettings;
}) {
  const vatRate = typeof settings.vatRate === "number" ? settings.vatRate : 12;
  const vatEnabled = settings.vatEnabled !== false;
  const serviceRate = typeof settings.serviceRate === "number" ? settings.serviceRate : 5;
  const serviceEnabled = Boolean(settings.serviceEnabled);
  const seniorDiscountRate = typeof settings.seniorDiscountRate === "number" ? settings.seniorDiscountRate : 20;
  const pwdDiscountRate = typeof settings.pwdDiscountRate === "number" ? settings.pwdDiscountRate : 20;

  // 1. Gross Subtotal
  let grossSubtotal = 0;
  for (const item of items) {
    grossSubtotal += calculateItemTotal(item);
  }

  // 2. Promo Discount
  let promoDiscountAmount = 0;
  if (promo && (promo.status === "Active" || !promo.status)) {
    const val = Number(promo.discount_value) || 0;
    const type = promo.discount_type || "percentage";
    if (type === "percentage") {
      promoDiscountAmount = (grossSubtotal * val) / 100;
    } else {
      promoDiscountAmount = Math.min(grossSubtotal, val);
    }
  }

  const grossAfterPromo = Math.max(0, grossSubtotal - promoDiscountAmount);

  // 3. PWD / Senior Citizen Discount & Exemption (RA 9994 / RA 10754)
  const discountType = discount?.type || "None";
  const isExempt = discountType === "Senior" || discountType === "PWD";
  const exemptDiscountRate = discountType === "Senior" ? seniorDiscountRate : discountType === "PWD" ? pwdDiscountRate : 0;

  const baseNoVat = isExempt
    ? grossSubtotal / (1 + (vatEnabled ? vatRate / 100 : 0))
    : grossSubtotal;

  const discountAmount = isExempt ? baseNoVat * (exemptDiscountRate / 100) : 0;

  // 4. VAT & Exempt Sales
  const vatExemptSales = isExempt ? Math.max(0, baseNoVat - discountAmount) : 0;
  const vatableSales = isExempt
    ? 0
    : grossAfterPromo / (1 + (vatEnabled ? vatRate / 100 : 0));
  const vatAmount = isExempt ? 0 : vatEnabled ? grossAfterPromo - vatableSales : 0;

  // 5. Service Charge
  const taxableForService = isExempt ? vatExemptSales : grossAfterPromo;
  const serviceCharge = serviceEnabled ? taxableForService * (serviceRate / 100) : 0;

  // 6. Grand Total & Total Discount
  const totalDiscount = promoDiscountAmount + discountAmount;
  const grandTotal = (isExempt ? vatExemptSales : grossAfterPromo) + serviceCharge;

  return {
    grossSubtotal,
    promoDiscountAmount,
    grossAfterPromo,
    isExempt,
    discountType,
    exemptDiscountRate,
    discountAmount,
    totalDiscount,
    vatableSales,
    vatAmount,
    vatExemptSales,
    serviceCharge,
    grandTotal: Math.max(0, grandTotal),
  };
}
