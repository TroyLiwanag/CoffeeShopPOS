/**
 * Centralized pricing computation helper for Café Corazon POS.
 * Ensures consistent financial calculations across POS cart, checkout, backend validation, receipt, and reports.
 */

export function calculateItemTotal(item) {
  const qty = Number(item.quantity ?? item.qty) || 1;
  if (item.unitPrice !== undefined && Number(item.unitPrice) > 0) {
    return Number(item.unitPrice) * qty;
  }
  const basePrice = Number(item.basePrice ?? item.price) || 0;
  let addonsTotal = 0;
  const list = (Array.isArray(item.addonsDetails) && item.addonsDetails.length > 0)
    ? item.addonsDetails
    : item.addons;
  if (Array.isArray(list)) {
    for (const addon of list) {
      if (typeof addon === "object" && addon !== null && "price" in addon) {
        addonsTotal += Number(addon.price) || 0;
      }
    }
  }
  return (basePrice + addonsTotal) * qty;
}

export function calculateOrderTotals({
  items = [],
  promo = null,
  discount = { type: "None" },
  settings = {},
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
  if (promo && promo.status === "Active") {
    const val = Number(promo.discount_value || promo.discountValue) || 0;
    const type = promo.discount_type || promo.discountType || "percentage";
    if (type === "percentage") {
      promoDiscountAmount = (grossSubtotal * val) / 100;
    } else {
      promoDiscountAmount = Math.min(grossSubtotal, val);
    }
  } else if (typeof promo === "number" || typeof promo === "string") {
    promoDiscountAmount = Number(promo) || 0;
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
