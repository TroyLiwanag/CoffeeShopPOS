import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import api from "@/lib/api";
import { fetchMenuItems, type MenuItem as ApiMenuItem } from "@/lib/menu-api";
import type { Promo } from "@/lib/promo-api";
import type { Permissions } from "@/lib/permissions";
import { extractErrorMessage } from "@/lib/action-feedback";

export type Role = "staff" | "admin";

export interface User {
  id: string;
  fullname: string;
  email: string;
  role: Role;
  permissions: Permissions;
}

export interface EmployeeUser extends User {
  status?: string;
}

export type Category = string;

export const DEFAULT_CATEGORIES = [
  "Coffee",
  "Tea",
  "Non-Coffee",
  "Iced Blended",
  "Snacks",
  "Rice Meals",
  "Pastry",
] as const;

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  image?: string | null;
  icon?: string;
  stock?: number;
  status?: "available" | "unavailable";
  emoji?: string;
  unit: string;
  batchNo: string;
}

export function mapMenuToProduct(m: ApiMenuItem): Product {
  return {
    id: String(m.id),
    name: m.name,
    price: m.price,
    category: m.category,
    description: m.description || undefined,
    image: m.image,
    icon: m.icon || "coffee",
    stock: m.stock ?? 0,
    status: m.status,
    unit: "cup",
    batchNo: "",
  };
}

export function isProductAvailable(p: Product): boolean {
  const status = p.status ?? "available";
  const stock = p.stock ?? 0;
  return status === "available" && stock > 0;
}

export interface CartItem {
  id: string;
  product: Product;
  qty: number;
  size: string;
  sugar: string;
  milk: string;
  addons: string[];
  notes: string;
  unitPrice: number;
}

export type DiscountType = "None" | "Senior" | "PWD";

export interface AppliedDiscount {
  type: DiscountType;
  idNumber?: string;
  beneficiary?: string;
}

export type StockCategory = "Ingredient" | "Furniture" | "Utensil";

export interface Ingredient {
  id: string;
  name: string;
  stock: number;
  min: number;
  unit: string;
  category: StockCategory;
  batchNo?: string | null;
}

export type ExpirationStatus =
  | { type: "expired"; daysPast: number; label: string }
  | { type: "expiring"; daysLeft: number; label: string }
  | { type: "valid"; daysLeft: number; label: string }
  | null;

export function getExpirationStatus(batchNo?: string | null): ExpirationStatus {
  if (!batchNo || !batchNo.trim()) return null;
  const trimmed = batchNo.trim();
  if (/^[A-Za-z]+-/.test(trimmed)) return null;

  const dateObj = new Date(trimmed);
  if (isNaN(dateObj.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateObj);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { type: "expired", daysPast: Math.abs(diffDays), label: `Expired ${Math.abs(diffDays)}d ago` };
  }
  if (diffDays === 0) {
    return { type: "expired", daysPast: 0, label: "Expires Today" };
  }
  if (diffDays === 1) {
    return { type: "expiring", daysLeft: 1, label: "Expires Tomorrow (1d)" };
  }
  if (diffDays <= 7) {
    return { type: "expiring", daysLeft: diffDays, label: `Expires in ${diffDays} days` };
  }
  return { type: "valid", daysLeft: diffDays, label: trimmed };
}

export interface Order {
  id: string;
  number: number;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  promoId?: number;
  promoName?: string;
  promoDiscountAmount?: number;
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  serviceCharge: number;
  total: number;
  method: "Cash" | "QR";
  cashier: string;
  createdAt: string;
  customerName?: string;
  customerAddress?: string;
  customerTin?: string;
  discount: AppliedDiscount;
  /** Discount percent applied (Senior/PWD) at time of sale */
  discountRate: number;
  cashGiven?: number;
  orderType?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
}

export const PRODUCTS: Product[] = [
  { id: "c1", name: "V60 Single Origin (Hot)", price: 49, category: "Coffee", emoji: "☕", unit: "cup", batchNo: "B-C001" },
  { id: "c2", name: "Americano (Hot)", price: 65, category: "Coffee", emoji: "☕", unit: "cup", batchNo: "B-C002" },
  { id: "c3", name: "Flavored Americano (Hot)", price: 85, category: "Coffee", emoji: "☕", unit: "cup", batchNo: "B-C003" },
  { id: "c4", name: "Cappuccino (Hot)", price: 85, category: "Coffee", emoji: "☕", unit: "cup", batchNo: "B-C004" },
  { id: "c5", name: "Cafe Latte (Hot)", price: 85, category: "Coffee", emoji: "🥛", unit: "cup", batchNo: "B-C005" },
  { id: "c6", name: "Cafe Mocha (Hot)", price: 95, category: "Coffee", emoji: "🍫", unit: "cup", batchNo: "B-C006" },
  { id: "c7", name: "Caramel Macchiato (Hot)", price: 95, category: "Coffee", emoji: "☕", unit: "cup", batchNo: "B-C007" },
  { id: "c8", name: "Spanish Latte (Hot)", price: 105, category: "Coffee", emoji: "🥛", unit: "cup", batchNo: "B-C008" },
  { id: "c9", name: "White Choco Mocha (Hot)", price: 95, category: "Coffee", emoji: "🤍", unit: "cup", batchNo: "B-C009" },
  { id: "c10", name: "Hazelnut (Hot)", price: 95, category: "Coffee", emoji: "🌰", unit: "cup", batchNo: "B-C010" },
  { id: "c11", name: "French Vanilla (Hot)", price: 95, category: "Coffee", emoji: "🍦", unit: "cup", batchNo: "B-C011" },
  { id: "c12", name: "V60 Single Origin (Iced)", price: 49, category: "Coffee", emoji: "🧊", unit: "cup", batchNo: "B-C012" },
  { id: "c13", name: "Americano (Iced)", price: 65, category: "Coffee", emoji: "🧊", unit: "cup", batchNo: "B-C013" },
  { id: "c14", name: "Flavored Americano (Iced)", price: 65, category: "Coffee", emoji: "🧊", unit: "cup", batchNo: "B-C014" },
  { id: "c15", name: "Cappuccino (Iced)", price: 65, category: "Coffee", emoji: "🧊", unit: "cup", batchNo: "B-C015" },
  { id: "c16", name: "Cafe Latte (Iced)", price: 65, category: "Coffee", emoji: "🧊", unit: "cup", batchNo: "B-C016" },
  { id: "c17", name: "Cafe Mocha (Iced)", price: 65, category: "Coffee", emoji: "🧊", unit: "cup", batchNo: "B-C017" },
  { id: "c18", name: "Caramel Macchiato (Iced)", price: 65, category: "Coffee", emoji: "🧊", unit: "cup", batchNo: "B-C018" },
  { id: "c19", name: "Spanish Latte (Iced)", price: 75, category: "Coffee", emoji: "🧊", unit: "cup", batchNo: "B-C019" },
  { id: "c20", name: "White Choco Mocha (Iced)", price: 95, category: "Coffee", emoji: "🧊", unit: "cup", batchNo: "B-C020" },
  { id: "c21", name: "Biscoff Latte (Iced)", price: 75, category: "Coffee", emoji: "🍪", unit: "cup", batchNo: "B-C021" },
  { id: "c22", name: "Hazelnut (Iced)", price: 75, category: "Coffee", emoji: "🌰", unit: "cup", batchNo: "B-C022" },
  { id: "c23", name: "French Vanilla (Iced)", price: 75, category: "Coffee", emoji: "🍦", unit: "cup", batchNo: "B-C023" },
  { id: "n1", name: "Iced Choco", price: 65, category: "Non-Coffee", emoji: "🍫", unit: "cup", batchNo: "B-N001" },
  { id: "n2", name: "Oreo Milk", price: 65, category: "Non-Coffee", emoji: "🥛", unit: "cup", batchNo: "B-N002" },
  { id: "n3", name: "White Choco", price: 65, category: "Non-Coffee", emoji: "🤍", unit: "cup", batchNo: "B-N003" },
  { id: "n4", name: "Chocoberry", price: 75, category: "Non-Coffee", emoji: "🍓", unit: "cup", batchNo: "B-N004" },
  { id: "n5", name: "Strawberry Latte", price: 65, category: "Non-Coffee", emoji: "🍓", unit: "cup", batchNo: "B-N005" },
  { id: "n6", name: "Blueberry Latte", price: 65, category: "Non-Coffee", emoji: "🫐", unit: "cup", batchNo: "B-N006" },
  { id: "n7", name: "Lemon Fruitea", price: 30, category: "Non-Coffee", emoji: "🍋", unit: "cup", batchNo: "B-N007" },
  { id: "n8", name: "Kiwi Fruitea", price: 30, category: "Non-Coffee", emoji: "🥝", unit: "cup", batchNo: "B-N008" },
  { id: "n9", name: "Blueberry Fruitea", price: 30, category: "Non-Coffee", emoji: "🫐", unit: "cup", batchNo: "B-N009" },
  { id: "n10", name: "Mango Fruitea", price: 30, category: "Non-Coffee", emoji: "🥭", unit: "cup", batchNo: "B-N010" },
  { id: "n11", name: "Strawberry Fruitea", price: 30, category: "Non-Coffee", emoji: "🍓", unit: "cup", batchNo: "B-N011" },
  { id: "n12", name: "Japanese Matcha", price: 65, category: "Non-Coffee", emoji: "🍵", unit: "cup", batchNo: "B-N012" },
  { id: "n13", name: "Uji Matcha", price: 65, category: "Non-Coffee", emoji: "🍵", unit: "cup", batchNo: "B-N013" },
  { id: "n14", name: "Strawberry Matcha", price: 75, category: "Non-Coffee", emoji: "🍵", unit: "cup", batchNo: "B-N014" },
  { id: "n15", name: "Blueberry Matcha", price: 75, category: "Non-Coffee", emoji: "🍵", unit: "cup", batchNo: "B-N015" },
  { id: "n16", name: "Choco Matcha", price: 75, category: "Non-Coffee", emoji: "🍵", unit: "cup", batchNo: "B-N016" },
  { id: "n17", name: "Dirty Matcha", price: 75, category: "Non-Coffee", emoji: "🍵", unit: "cup", batchNo: "B-N017" },
  { id: "b1", name: "Cappuccino Frappe", price: 120, category: "Iced Blended", emoji: "🥤", unit: "cup", batchNo: "B-B001" },
  { id: "b2", name: "Mochachino", price: 120, category: "Iced Blended", emoji: "🥤", unit: "cup", batchNo: "B-B002" },
  { id: "b3", name: "Biscoffee", price: 150, category: "Iced Blended", emoji: "🍪", unit: "cup", batchNo: "B-B003" },
  { id: "b4", name: "Coffee Nutella", price: 150, category: "Iced Blended", emoji: "🍫", unit: "cup", batchNo: "B-B004" },
  { id: "b5", name: "Pistachio Coffee", price: 220, category: "Iced Blended", emoji: "🥜", unit: "cup", batchNo: "B-B005" },
  { id: "b6", name: "Dirty Matcha Frappe", price: 130, category: "Iced Blended", emoji: "🍵", unit: "cup", batchNo: "B-B006" },
  { id: "b7", name: "Caramel Frappe", price: 120, category: "Iced Blended", emoji: "🥤", unit: "cup", batchNo: "B-B007" },
  { id: "b8", name: "Vanilla Frappe", price: 100, category: "Iced Blended", emoji: "🍦", unit: "cup", batchNo: "B-B008" },
  { id: "b9", name: "Chocolate Frappe", price: 100, category: "Iced Blended", emoji: "🍫", unit: "cup", batchNo: "B-B009" },
  { id: "b10", name: "Salted Caramel", price: 100, category: "Iced Blended", emoji: "🧂", unit: "cup", batchNo: "B-B010" },
  { id: "b11", name: "Biscoff Biscuit", price: 150, category: "Iced Blended", emoji: "🍪", unit: "cup", batchNo: "B-B011" },
  { id: "b12", name: "Nutty Nutella", price: 150, category: "Iced Blended", emoji: "🍫", unit: "cup", batchNo: "B-B012" },
  { id: "b13", name: "Pistachio Crunch", price: 220, category: "Iced Blended", emoji: "🥜", unit: "cup", batchNo: "B-B013" },
  { id: "b14", name: "Oreo Matcha", price: 150, category: "Iced Blended", emoji: "🍵", unit: "cup", batchNo: "B-B014" },
  { id: "b15", name: "Oreo Frappe", price: 120, category: "Iced Blended", emoji: "🥤", unit: "cup", batchNo: "B-B015" },
  { id: "b16", name: "Matcha Frappe", price: 120, category: "Iced Blended", emoji: "🍵", unit: "cup", batchNo: "B-B016" },
  { id: "b17", name: "Strawberry Frappe", price: 120, category: "Iced Blended", emoji: "🍓", unit: "cup", batchNo: "B-B017" },
  { id: "b18", name: "Blueberry Frappe", price: 120, category: "Iced Blended", emoji: "🫐", unit: "cup", batchNo: "B-B018" },
  { id: "b19", name: "Fresh Lemonade", price: 85, category: "Iced Blended", emoji: "🍋", unit: "cup", batchNo: "B-B019" },
  { id: "s1", name: "Fries (Plain/Cheese/Sour Cream/BBQ)", price: 90, category: "Snacks", emoji: "🍟", unit: "serving", batchNo: "B-S001" },
  { id: "s2", name: "Nachos Overload", price: 100, category: "Snacks", emoji: "🌽", unit: "plate", batchNo: "B-S002" },
  { id: "s3", name: "Siomai 4pcs", price: 39, category: "Snacks", emoji: "🥟", unit: "4 pcs", batchNo: "B-S003" },
  { id: "s4", name: "Waffle — Plain", price: 60, category: "Snacks", emoji: "🧇", unit: "pc", batchNo: "B-S004" },
  { id: "s5", name: "Waffle — Caramel", price: 85, category: "Snacks", emoji: "🧇", unit: "pc", batchNo: "B-S005" },
  { id: "s6", name: "Waffle — Oreo Cream", price: 95, category: "Snacks", emoji: "🧇", unit: "pc", batchNo: "B-S006" },
  { id: "s7", name: "Waffle — Nutty Nutella", price: 105, category: "Snacks", emoji: "🧇", unit: "pc", batchNo: "B-S007" },
  { id: "s8", name: "Waffle — Biscoff", price: 95, category: "Snacks", emoji: "🧇", unit: "pc", batchNo: "B-S008" },
  { id: "s9", name: "Waffle — Pork Floss", price: 120, category: "Snacks", emoji: "🧇", unit: "pc", batchNo: "B-S009" },
  { id: "r1", name: "Shang-si (Shanghai, Sinangag)", price: 55, category: "Rice Meals", emoji: "🍚", unit: "plate", batchNo: "B-R001" },
  { id: "r2", name: "Shang-silog (Shanghai, Rice, Egg)", price: 70, category: "Rice Meals", emoji: "🍳", unit: "plate", batchNo: "B-R002" },
  { id: "r3", name: "Sio-silog (Siomai 4pcs, Rice, Egg)", price: 70, category: "Rice Meals", emoji: "🥟", unit: "plate", batchNo: "B-R003" },
  { id: "r4", name: "Spam-silog (Spam, Rice, Egg)", price: 85, category: "Rice Meals", emoji: "🥓", unit: "plate", batchNo: "B-R004" },
  { id: "r5", name: "Nuggets-silog (Nuggets 5pcs, Rice, Egg)", price: 120, category: "Rice Meals", emoji: "🍗", unit: "plate", batchNo: "B-R005" },
];

const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: "i1", name: "Coffee Beans", stock: 4200, min: 1500, unit: "g", category: "Ingredient", batchNo: "2026-12-31" },
  { id: "i2", name: "Whole Milk", stock: 8, min: 5, unit: "L", category: "Ingredient", batchNo: "2026-09-15" },
  { id: "i3", name: "Oat Milk", stock: 2, min: 4, unit: "L", category: "Ingredient", batchNo: "2026-09-20" },
  { id: "i4", name: "Almond Milk", stock: 3, min: 4, unit: "L", category: "Ingredient", batchNo: "2026-09-25" },
  { id: "i5", name: "Sugar", stock: 5200, min: 1000, unit: "g", category: "Ingredient", batchNo: "2027-01-01" },
  { id: "i6", name: "Chocolate Syrup", stock: 1.2, min: 1, unit: "L", category: "Ingredient", batchNo: "2026-11-30" },
  { id: "i7", name: "Matcha Powder", stock: 180, min: 200, unit: "g", category: "Ingredient", batchNo: "2026-10-15" },
  { id: "i8", name: "Tea Bags", stock: 320, min: 100, unit: "pcs", category: "Ingredient", batchNo: "2026-12-01" },
  { id: "i9", name: "Pastries", stock: 24, min: 10, unit: "pcs", category: "Ingredient", batchNo: "2026-08-30" },
  { id: "f1", name: "Dining Tables", stock: 8, min: 8, unit: "units", category: "Furniture" },
  { id: "f2", name: "Dining Chairs", stock: 24, min: 20, unit: "units", category: "Furniture" },
  { id: "f3", name: "Bar Stools", stock: 6, min: 4, unit: "units", category: "Furniture" },
  { id: "f4", name: "Display Shelves", stock: 3, min: 2, unit: "units", category: "Furniture" },
  { id: "u1u", name: "Ceramic Cups", stock: 48, min: 30, unit: "pcs", category: "Utensil" },
  { id: "u2u", name: "Glass Mugs", stock: 36, min: 24, unit: "pcs", category: "Utensil" },
  { id: "u3u", name: "Spoons", stock: 60, min: 30, unit: "pcs", category: "Utensil" },
  { id: "u4u", name: "Forks", stock: 60, min: 30, unit: "pcs", category: "Utensil" },
  { id: "u5u", name: "Serving Trays", stock: 12, min: 8, unit: "pcs", category: "Utensil" },
];

export interface Settings {
  shopName: string;
  address: string;
  phone: string;
  tin: string;
  businessStyle: string;
  vatEnabled: boolean;
  vatRate: number;
  serviceEnabled: boolean;
  serviceRate: number;
  seniorDiscountRate: number;
  pwdDiscountRate: number;
  receiptFooter: string;
  printerEnabled?: boolean;
  printerName?: string;
  printerAddress?: string;
  printerPaperWidth?: "58mm" | "80mm";
  printerConnectionType?: "Bluetooth" | "USB" | "Network";
}

const DEFAULT_SETTINGS: Settings = {
  shopName: "Cafe Corazon",
  address: "FB: CorazonsTea",
  phone: "0916 583 6120",
  tin: "000-000-000-000",
  businessStyle: "Kapeng may Puso 🖤",
  vatEnabled: true,
  vatRate: 12,
  serviceEnabled: false,
  serviceRate: 5,
  seniorDiscountRate: 20,
  pwdDiscountRate: 20,
  receiptFooter: "Thank you for supporting Local!!!",
  printerEnabled: true,
  printerName: "POS58D (58mm Thermal Printer)",
  printerAddress: "86:67:7A:00:4C:9D",
  printerPaperWidth: "58mm",
  printerConnectionType: "Bluetooth",
};

export function mergeSettings(base: Settings, incoming?: Partial<Settings> | null): Settings {
  if (!incoming) return base;
  return {
    shopName: incoming.shopName ?? base.shopName,
    address: incoming.address ?? base.address,
    phone: incoming.phone ?? base.phone,
    tin: incoming.tin ?? base.tin,
    businessStyle: incoming.businessStyle ?? base.businessStyle,
    vatEnabled: typeof incoming.vatEnabled === "boolean" ? incoming.vatEnabled : base.vatEnabled,
    vatRate: typeof incoming.vatRate === "number" ? incoming.vatRate : base.vatRate,
    serviceEnabled: typeof incoming.serviceEnabled === "boolean" ? incoming.serviceEnabled : base.serviceEnabled,
    serviceRate: typeof incoming.serviceRate === "number" ? incoming.serviceRate : base.serviceRate,
    seniorDiscountRate: typeof incoming.seniorDiscountRate === "number" ? incoming.seniorDiscountRate : base.seniorDiscountRate,
    pwdDiscountRate: typeof incoming.pwdDiscountRate === "number" ? incoming.pwdDiscountRate : base.pwdDiscountRate,
    receiptFooter: incoming.receiptFooter ?? base.receiptFooter,
    printerEnabled: typeof incoming.printerEnabled === "boolean" ? incoming.printerEnabled : base.printerEnabled,
    printerName: incoming.printerName ?? base.printerName,
    printerAddress: incoming.printerAddress ?? base.printerAddress,
    printerPaperWidth: incoming.printerPaperWidth ?? base.printerPaperWidth,
    printerConnectionType: incoming.printerConnectionType ?? base.printerConnectionType,
  };
}

export function getExemptDiscountRate(settings: Settings, type: DiscountType): number {
  if (type === "Senior") return settings.seniorDiscountRate;
  if (type === "PWD") return settings.pwdDiscountRate;
  return 0;
}

interface Ctx {
  hydrated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void | Promise<void>;

  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  clearCart: () => void;

  discount: AppliedDiscount;
  setDiscount: (d: AppliedDiscount) => void;

  appliedPromo: Promo | null;
  setAppliedPromo: (p: Promo | null) => void;
  promoDiscountAmount: number;

  cartSubtotal: number;
  discountAmount: number;
  vatableSales: number;
  vatExemptSales: number;
  vatAmount: number;
  serviceCharge: number;
  cartTotal: number;

  ingredients: Ingredient[];
  updateIngredient: (id: string, updates: number | Partial<Ingredient>) => void;
  addIngredient: (i: Omit<Ingredient, "id">) => void;
  removeIngredient: (id: string) => void;

  orders: Order[];
  placeOrder: (
    method: "Cash" | "QR",
    customer?: { name?: string; address?: string; tin?: string },
    cashGiven?: number,
    orderType?: string,
  ) => Promise<Order>;

  settings: Settings;
  /** Persist full settings to the server (Settings page uses a draft until Save). */
  saveSettings: (next: Settings) => Promise<void>;

  employees: EmployeeUser[];
  refreshEmployees: () => Promise<void>;
  addEmployee: (data: {
    fullname: string;
    email: string;
    password: string;
    role: Role;
    permissions: Permissions;
  }) => Promise<void>;
  removeEmployee: (id: string) => Promise<void>;
  updateEmployee: (
    id: string,
    data: Partial<{
      fullname: string;
      email: string;
      password: string;
      role: Role;
      permissions: Permissions;
    }>,
  ) => Promise<void>;

  audit: AuditEntry[];
  logAudit: (action: string, details?: string) => void;

  menuItems: Product[];
  menuLoading: boolean;
  refreshMenu: () => Promise<void>;
}

const PosContext = createContext<Ctx | null>(null);

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

const DEFAULT_PERMISSIONS: Permissions = {
  canViewDashboard: true,
  canManageUsers: false,
  canManageProducts: false,
  canManageMenu: false,
  canManageOrders: true,
  canManageInventory: false,
  canManageSales: false,
  canManageAttendance: false,
  canManageReports: false,
  canManageSettings: false,
  canExportReports: false,
  canManagePromos: false,
  canManageVerificationCodes: false,
  manage_verification_codes: false,
};

function mapApiUser(u: {
  id: number | string;
  fullname?: string;
  name?: string;
  email: string;
  role: Role;
  permissions?: Partial<Permissions>;
}): User {
  const role = u.role === "admin" ? "admin" : "staff";
  const adminPerms: Permissions = {
    canViewDashboard: true,
    canManageUsers: true,
    canManageProducts: true,
    canManageMenu: true,
    canManageOrders: true,
    canManageInventory: true,
    canManageSales: true,
    canManageAttendance: true,
    canManageReports: true,
    canManageSettings: true,
    canExportReports: true,
    canManagePromos: true,
    canManageVerificationCodes: true,
    manage_verification_codes: true,
  };
  return {
    id: String(u.id),
    fullname: u.fullname ?? u.name ?? u.email,
    email: u.email,
    role,
    permissions:
      role === "admin"
        ? adminPerms
        : { ...DEFAULT_PERMISSIONS, ...u.permissions },
  };
}

export function PosProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<AppliedDiscount>({ type: "None" });
  const [ingredients, setIngredients] = useState<Ingredient[]>(INITIAL_INGREDIENTS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [employees, setEmployees] = useState<EmployeeUser[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const refreshMenu = useCallback(async () => {
    setMenuLoading(true);
    try {
      const data = await fetchMenuItems();
      setMenuItems(data.map(mapMenuToProduct));
    } catch {
      setMenuItems(PRODUCTS.map((p) => ({
        ...p,
        icon: "coffee",
        stock: 100,
        status: "available" as const,
      })));
    } finally {
      setMenuLoading(false);
    }
  }, []);

  const refreshIngredients = useCallback(async () => {
    try {
      const { data } = await api.get("/inventory/items");
      if (Array.isArray(data) && data.length > 0) {
        setIngredients(data);
      }
    } catch {
      /* ignore if offline */
    }
  }, []);

  const refreshOrders = useCallback(async () => {
    try {
      const { data } = await api.get("/orders");
      if (Array.isArray(data)) {
        const mapped = data.map((o: any) => {
          const total = Number(o.total_amount) || 0;
          const items: CartItem[] = (o.items || []).map((item: any, idx: number) => ({
            id: String(item.id || idx),
            product: {
              id: String(item.menu_item_id || item.product_id || idx),
              name: item.product_name || `Item #${item.menu_item_id || item.product_id}`,
              price: Number(item.price) || 0,
              category: "Coffee",
              unit: "cup",
              batchNo: "",
            },
            qty: Number(item.quantity) || 1,
            size: item.size || "Regular",
            sugar: "100%",
            milk: item.milk || "Whole Milk",
            addons: [],
            notes: "",
            unitPrice: Number(item.price) || 0,
          }));
          const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, total);
          return {
            id: String(o.id),
            number: Number(o.id),
            items,
            subtotal,
            discountAmount: 0,
            promoId: o.promo_id ? Number(o.promo_id) : undefined,
            promoName: o.promo_name || undefined,
            promoDiscountAmount: Number(o.promo_discount_amount) || 0,
            vatableSales: 0,
            vatAmount: 0,
            vatExemptSales: 0,
            serviceCharge: 0,
            total,
            method: (o.payment_method === "QR" ? "QR" : "Cash") as "Cash" | "QR",
            cashier: o.created_by_name || "Staff",
            createdAt: o.created_at,
            customerName: o.customer_name || undefined,
            discount: { type: "None" as const },
            discountRate: 0,
          };
        });
        setOrders(mapped);
      }
    } catch {
      /* ignore if offline */
    }
  }, []);

  const refreshEmployees = useCallback(async () => {
    try {
      const { data } = await api.get("/users");
      setEmployees(
        data.map((e: EmployeeUser & { id: number }) => ({
          ...mapApiUser(e),
          status: e.status,
        })),
      );
    } catch {
      /* ignore when not authorized */
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIngredients(load("pos.ingredients", INITIAL_INGREDIENTS));
      setOrders(load("pos.orders", []));
      const savedSettings = load<Settings | null>("pos.settings", null);
      setSettings(mergeSettings(DEFAULT_SETTINGS, savedSettings));
      setAudit(load("pos.audit", []));

      try {
        const { data: remoteSettings } = await api.get("/settings");
        if (remoteSettings) {
          setSettings((prev) => {
            const merged = mergeSettings(prev, remoteSettings);
            localStorage.setItem("pos.settings", JSON.stringify(merged));
            return merged;
          });
        }
      } catch {
        /* use local defaults */
      }

      const token = localStorage.getItem("auth_token");
      if (token) {
        try {
          const { data } = await api.get("/auth/me");
          setUser(mapApiUser(data.user));
          await Promise.all([refreshEmployees(), refreshMenu(), refreshOrders(), refreshIngredients()]);
        } catch {
          localStorage.removeItem("auth_token");
          setUser(null);
        }
      }
      setHydrated(true);
    };
    init();
  }, [refreshEmployees, refreshMenu, refreshOrders, refreshIngredients]);

  useEffect(() => {
    if (hydrated) localStorage.setItem("pos.user", JSON.stringify(user));
  }, [user, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem("pos.ingredients", JSON.stringify(ingredients));
  }, [ingredients, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem("pos.orders", JSON.stringify(orders));
  }, [orders, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem("pos.settings", JSON.stringify(settings));
  }, [settings, hydrated]);
  const logAudit = (_action: string, _details?: string) => {
    /* Audit logs are stored in MySQL via the API — see /api/audit */
  };

  const login = async (email: string, password: string): Promise<{ ok: boolean; message?: string }> => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("auth_token", data.token);
      const mapped = mapApiUser(data.user);
      setUser(mapped);
      await Promise.all([refreshEmployees(), refreshMenu(), refreshOrders(), refreshIngredients()]);
      return { ok: true };
    } catch (err: unknown) {
      const message = extractErrorMessage(err, "Invalid email or password.");
      return { ok: false, message };
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* proceed with local logout */
    }
    localStorage.removeItem("auth_token");
    setUser(null);
    setCart([]);
    setDiscount({ type: "None" });
  };

  const [appliedPromo, setAppliedPromo] = useState<Promo | null>(null);

  const gross = cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const isExempt = discount.type === "Senior" || discount.type === "PWD";
  const exemptDiscountRate = getExemptDiscountRate(settings, discount.type);
  const baseNoVat = isExempt ? gross / (1 + settings.vatRate / 100) : gross;
  const discountAmount = isExempt ? baseNoVat * (exemptDiscountRate / 100) : 0;

  // Promo Discount Calculation
  let promoDiscountAmount = 0;
  if (appliedPromo) {
    if (appliedPromo.discount_type === "percentage") {
      promoDiscountAmount = (gross * Number(appliedPromo.discount_value)) / 100;
    } else {
      promoDiscountAmount = Math.min(gross, Number(appliedPromo.discount_value));
    }
  }

  const vatExemptSales = isExempt ? Math.max(0, baseNoVat - discountAmount) : 0;
  const grossAfterPromo = Math.max(0, gross - promoDiscountAmount);
  const vatableSales = isExempt ? 0 : grossAfterPromo / (1 + (settings.vatEnabled ? settings.vatRate / 100 : 0));
  const vatAmount = isExempt ? 0 : settings.vatEnabled ? grossAfterPromo - vatableSales : 0;
  const taxableForService = isExempt ? vatExemptSales : grossAfterPromo;
  const serviceCharge = settings.serviceEnabled ? taxableForService * (settings.serviceRate / 100) : 0;
  const cartTotal = (isExempt ? vatExemptSales : grossAfterPromo) + serviceCharge;
  const cartSubtotal = gross;

  const placeOrder = async (
    method: "Cash" | "QR",
    customer?: { name?: string; address?: string; tin?: string },
    cashGivenAmount?: number,
    orderType: string = "Dine in",
  ): Promise<Order> => {
    const order: Order = {
      id: crypto.randomUUID(),
      number: (orders[0]?.number ?? 100000) + 1,
      items: cart,
      subtotal: cartSubtotal,
      discountAmount,
      promoId: appliedPromo?.id,
      promoName: appliedPromo?.promo_name,
      promoDiscountAmount,
      vatableSales,
      vatAmount,
      vatExemptSales,
      serviceCharge,
      total: cartTotal,
      method,
      cashier: user?.fullname ?? "—",
      createdAt: new Date().toISOString(),
      customerName: customer?.name,
      customerAddress: customer?.address,
      customerTin: customer?.tin,
      discount,
      discountRate: exemptDiscountRate,
      cashGiven: cashGivenAmount,
      orderType,
    };

    try {
      await api.post("/orders", {
        customerName: customer?.name,
        totalAmount: cartTotal,
        paymentMethod: method,
        orderStatus: "completed",
        promoId: appliedPromo?.id,
        promoName: appliedPromo?.promo_name,
        promoDiscountAmount,
        items: cart.map((i) => ({
          menuItemId: Number(i.product.id) || undefined,
          productId: Number(i.product.id) || 1,
          quantity: i.qty,
          price: i.unitPrice,
        })),
      });
      await refreshOrders();
    } catch (err) {
      if (err && typeof err === "object" && "response" in err && err.response) {
        throw err;
      }
    }

    setOrders((o) => [order, ...o]);
    setCart([]);
    setDiscount({ type: "None" });
    setAppliedPromo(null);
    refreshMenu().catch(() => { });
    logAudit("Place order", `OR #${formatOrderNumber(order.number, order.createdAt)} • ₱${order.total.toFixed(2)} • ${method}`);
    return order;
  };

  const addEmployee = async (data: {
    fullname: string;
    email: string;
    password: string;
    role: Role;
    permissions: Permissions;
  }) => {
    await api.post("/users", data);
    await refreshEmployees();
    logAudit("Add employee", data.email);
  };

  const removeEmployee = async (id: string) => {
    await api.delete(`/users/${id}`);
    await refreshEmployees();
    logAudit("Remove employee", id);
  };

  const updateEmployee = async (
    id: string,
    data: Partial<{
      fullname: string;
      email: string;
      password: string;
      role: Role;
      permissions: Permissions;
    }>,
  ) => {
    await api.put(`/users/${id}`, data);
    await refreshEmployees();
    logAudit("Update employee", id);
  };

  return (
    <PosContext.Provider
      value={{
        hydrated,
        user,
        login,
        logout,
        cart,
        addToCart: (item) => setCart((c) => [...c, item]),
        removeFromCart: (id) => setCart((c) => c.filter((i) => i.id !== id)),
        updateQty: (id, delta) =>
          setCart((c) =>
            c.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)),
          ),
        clearCart: () => {
          setCart([]);
          setDiscount({ type: "None" });
          setAppliedPromo(null);
        },
        discount,
        setDiscount,
        appliedPromo,
        setAppliedPromo,
        promoDiscountAmount,
        cartSubtotal,
        discountAmount,
        vatableSales,
        vatExemptSales,
        vatAmount,
        serviceCharge,
        cartTotal,
        ingredients,
        updateIngredient: async (id, updates) => {
          const item = ingredients.find((i) => i.id === id);
          const patch = typeof updates === "number" ? { stock: updates } : updates;
          if (item) {
            const updated = { ...item, ...patch };
            if ("batchNo" in patch && (!patch.batchNo || !patch.batchNo.trim())) {
              updated.batchNo = undefined;
            }
            setIngredients((list) => list.map((i) => (i.id === id ? updated : i)));
            try {
              const payload = {
                ...updated,
                batchNo:
                  "batchNo" in patch
                    ? patch.batchNo && patch.batchNo.trim()
                      ? patch.batchNo.trim()
                      : null
                    : updated.batchNo || null,
              };
              await api.put(`/inventory/items/${id}`, payload);
              await refreshIngredients();
            } catch {
              /* ignore fallback */
            }
          }
          logAudit("Update stock", id);
        },
        addIngredient: async (i) => {
          const id = crypto.randomUUID();
          const newItem = { ...i, id };
          setIngredients((list) => [...list, newItem]);
          try {
            await api.post("/inventory/items", newItem);
            await refreshIngredients();
          } catch {
            /* ignore fallback */
          }
          logAudit("Add inventory item", i.name);
        },
        removeIngredient: async (id) => {
          setIngredients((list) => list.filter((i) => i.id !== id));
          try {
            await api.delete(`/inventory/items/${id}`);
            await refreshIngredients();
          } catch {
            /* ignore fallback */
          }
          logAudit("Remove inventory item", id);
        },
        orders,
        placeOrder,
        settings,
        saveSettings: async (next) => {
          const merged = mergeSettings(DEFAULT_SETTINGS, next);
          setSettings(merged);
          localStorage.setItem("pos.settings", JSON.stringify(merged));
          await api.put("/settings", merged);
        },
        employees,
        refreshEmployees,
        addEmployee,
        removeEmployee,
        updateEmployee,
        audit,
        logAudit,
        menuItems,
        menuLoading,
        refreshMenu,
      }}
    >
      {children}
    </PosContext.Provider>
  );
}

export function usePos() {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error("usePos must be inside PosProvider");
  return ctx;
}

export function fmt(n: number) {
  return `₱${n.toFixed(2)}`;
}

export function formatOrderNumber(
  num: number | string | null | undefined,
  dateStr?: string | Date | null,
): string {
  if (num === null || num === undefined || num === "") return "";
  const n = Number(num);
  if (Number.isNaN(n)) return String(num);

  const year = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
  const validYear = Number.isNaN(year) ? new Date().getFullYear() : year;
  const seq = String(n % 100000).padStart(5, "0");
  return `${validYear} - ${seq}`;
}
