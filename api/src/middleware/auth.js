import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { rowToPermissions, adminPermissions } from "../utils/permissions.js";

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      `SELECT u.id, u.fullname, u.email, u.role, u.status,
              p.can_view_dashboard, p.can_manage_users, p.can_manage_products,
              p.can_manage_menu, p.can_manage_orders, p.can_manage_inventory, p.can_manage_sales,
              p.can_manage_attendance, p.can_manage_reports, p.can_manage_settings, p.can_export_reports,
              p.can_manage_promos, p.can_manage_verification_codes
       FROM users u
       LEFT JOIN employee_permissions p ON p.user_id = u.id
       WHERE u.id = ? AND u.status = 'active'`,
      [payload.userId],
    );
    if (!rows.length) return res.status(401).json({ message: "User not found" });
    const user = rows[0];
    req.user = {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      role: user.role,
      permissions:
        user.role === "admin" ? adminPermissions() : rowToPermissions(user),
    };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (req.user?.role === "admin") return next();
    if (req.user?.permissions?.[permissionKey]) return next();
    return res.status(403).json({ message: "Forbidden" });
  };
}

export function requireAnyPermission(...permissionKeys) {
  return (req, res, next) => {
    if (req.user?.role === "admin") return next();
    if (permissionKeys.some((key) => req.user?.permissions?.[key])) return next();
    return res.status(403).json({ message: "Forbidden" });
  };
}
