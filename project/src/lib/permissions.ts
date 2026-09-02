export type Permissions = {
  canViewDashboard: boolean;
  canManageUsers: boolean;
  canManageProducts: boolean;
  canManageMenu: boolean;
  canManageOrders: boolean;
  canManageInventory: boolean;
  canManageSales: boolean;
  canManageAttendance: boolean;
  canManageReports: boolean;
  canManageSettings: boolean;
  canExportReports: boolean;
  canManagePromos: boolean;
  manage_verification_codes?: boolean;
  canManageVerificationCodes?: boolean;
};

export const PERMISSION_LABELS: Record<keyof Permissions, string> = {
  canViewDashboard: "View dashboard / POS",
  canManageUsers: "Manage users",
  canManageProducts: "Manage products",
  canManageMenu: "Manage menu",
  canManageOrders: "Manage orders",
  canManageInventory: "Manage inventory",
  canManageSales: "Manage sales / payroll",
  canManageAttendance: "Manage attendance",
  canManageReports: "Manage reports",
  canManageSettings: "Manage settings",
  canExportReports: "Export reports",
  canManagePromos: "Manage promos",
  manage_verification_codes: "Manage verification codes",
} as Record<keyof Permissions, string>;

export const ROUTE_PERMISSIONS: Record<string, keyof Permissions | null> = {
  "/pos": "canViewDashboard",
  "/orders": "canManageOrders",
  "/payment": "canManageOrders",
  "/inventory": "canManageInventory",
  "/reports": "canManageReports",
  "/payroll": "canManageSales",
  "/attendance": "canViewDashboard",
  "/employees": "canManageUsers",
  "/menu": "canManageMenu",
  "/promos": "canManagePromos",
  "/settings": "canManageSettings",
  "/audit": "canManageReports",
  "/verification-codes": "manage_verification_codes",
};

export function hasPermission(
  permissions: Permissions | undefined,
  role: string,
  key: keyof Permissions,
): boolean {
  if (role === "admin") return true;
  if (key === "manage_verification_codes" || key === "canManageVerificationCodes") {
    return !!(permissions?.manage_verification_codes || permissions?.canManageVerificationCodes);
  }
  return !!permissions?.[key];
}

/** Clock in/out, view records, resubmit — attendance managers or payroll managers */
export function canManageEmployeeAttendance(
  permissions: Permissions | undefined,
  role: string,
): boolean {
  if (role === "admin") return true;
  return !!(permissions?.canManageAttendance || permissions?.canManageSales);
}

export function canAccessRoute(
  path: string,
  permissions: Permissions | undefined,
  role: string,
): boolean {
  const key = ROUTE_PERMISSIONS[path];
  if (!key) return true;
  return hasPermission(permissions, role, key);
}

/** Permissions tied to advanced modules. */
export const LOCKED_MODULE_PERMISSIONS: (keyof Permissions)[] = [
  "canManageReports",
  "canManageSales",
  "canManageAttendance",
  "canExportReports",
];

export function getEditablePermissions(partialMode: boolean): (keyof Permissions)[] {
  const all = Object.keys(PERMISSION_LABELS) as (keyof Permissions)[];
  if (!partialMode) return all;
  return all.filter((key) => !LOCKED_MODULE_PERMISSIONS.includes(key));
}

/** Sanitize permissions for partial release if enabled. */
export function sanitizePermissionsForPartial(permissions: Permissions): Permissions {
  const out = { ...permissions };
  for (const key of LOCKED_MODULE_PERMISSIONS) {
    out[key] = false;
  }
  return out;
}
