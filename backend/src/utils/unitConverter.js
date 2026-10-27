/**
 * Unit conversion utility for Café Corazon Inventory System
 * Standardizes units (g, kg, ml, L, pcs) for precise inventory math
 */

export function normalizeUnit(unit) {
  if (!unit) return "pcs";
  const u = String(unit).trim().toLowerCase();
  if (u === "kg" || u === "kilogram" || u === "kilograms" || u === "g" || u === "gram" || u === "grams") {
    return "g";
  }
  if (u === "l" || u === "liter" || u === "liters" || u === "ml" || u === "milliliter" || u === "milliliters") {
    return "ml";
  }
  return u;
}

export function toBaseAmount(quantity, unit) {
  const val = Number(quantity) || 0;
  const u = String(unit || "").trim().toLowerCase();

  if (u === "kg" || u === "kilogram" || u === "kilograms") {
    return val * 1000; // convert kg to g
  }
  if (u === "l" || u === "liter" || u === "liters") {
    return val * 1000; // convert L to ml
  }
  return val;
}

export function fromBaseAmount(baseQuantity, targetUnit) {
  const val = Number(baseQuantity) || 0;
  const u = String(targetUnit || "").trim().toLowerCase();

  if (u === "kg" || u === "kilogram" || u === "kilograms") {
    return val / 1000;
  }
  if (u === "l" || u === "liter" || u === "liters") {
    return val / 1000;
  }
  return val;
}

export function convertQuantity(value, fromUnit, toUnit) {
  const val = Number(value) || 0;
  const fromNorm = normalizeUnit(fromUnit);
  const toNorm = normalizeUnit(toUnit);

  if (fromNorm !== toNorm) {
    // Incompatible units (e.g. g to ml without density), return original value
    return val;
  }

  const baseVal = toBaseAmount(val, fromUnit);
  return fromBaseAmount(baseVal, toUnit);
}

export function formatUnitDisplay(value, unit) {
  const val = Number(value) || 0;
  const u = String(unit || "").trim();
  const uLower = u.toLowerCase();

  if (uLower === "g" && val >= 1000) {
    return `${(val / 1000).toFixed(2)} kg`;
  }
  if (uLower === "ml" && val >= 1000) {
    return `${(val / 1000).toFixed(2)} L`;
  }
  return `${val.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${unit || "pcs"}`;
}
