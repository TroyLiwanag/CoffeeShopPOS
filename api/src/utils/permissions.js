export const PERMISSION_KEYS = [
  "canViewDashboard",
  "canManageUsers",
  "canManageProducts",
  "canManageMenu",
  "canManageOrders",
  "canManageInventory",
  "canManageSales",
  "canManageAttendance",
  "canManageReports",
  "canManageSettings",
  "canExportReports",
  "canManagePromos",
  "manage_verification_codes",
];

export const DB_PERMISSION_MAP = {
  canViewDashboard: "can_view_dashboard",
  canManageUsers: "can_manage_users",
  canManageProducts: "can_manage_products",
  canManageMenu: "can_manage_menu",
  canManageOrders: "can_manage_orders",
  canManageInventory: "can_manage_inventory",
  canManageSales: "can_manage_sales",
  canManageAttendance: "can_manage_attendance",
  canManageReports: "can_manage_reports",
  canManageSettings: "can_manage_settings",
  canExportReports: "can_export_reports",
  canManagePromos: "can_manage_promos",
  canManageVerificationCodes: "can_manage_verification_codes",
  manage_verification_codes: "can_manage_verification_codes",
};

export function rowToPermissions(row) {
  if (!row) return null;
  const manageVc = !!(row.can_manage_verification_codes || row.manage_verification_codes);
  return {
    canViewDashboard: !!row.can_view_dashboard,
    canManageUsers: !!row.can_manage_users,
    canManageProducts: !!row.can_manage_products,
    canManageMenu: !!row.can_manage_menu,
    canManageOrders: !!row.can_manage_orders,
    canManageInventory: !!row.can_manage_inventory,
    canManageSales: !!row.can_manage_sales,
    canManageAttendance: !!row.can_manage_attendance,
    canManageReports: !!row.can_manage_reports,
    canManageSettings: !!row.can_manage_settings,
    canExportReports: !!row.can_export_reports,
    canManagePromos: !!row.can_manage_promos,
    canManageVerificationCodes: manageVc,
    manage_verification_codes: manageVc,
  };
}

export function adminPermissions() {
  return {
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
}

export function permissionsToDb(permissions = {}) {
  const out = {};
  for (const [key, col] of Object.entries(DB_PERMISSION_MAP)) {
    if (permissions[key] !== undefined) out[col] = permissions[key] ? 1 : 0;
  }
  return out;
}
