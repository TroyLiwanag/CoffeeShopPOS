import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { permissionsToDb, rowToPermissions } from "../utils/permissions.js";

export async function getUserWithPermissions(userId) {
  const [rows] = await pool.query(
    `SELECT u.*, p.can_view_dashboard, p.can_manage_users, p.can_manage_products,
            p.can_manage_menu, p.can_manage_orders, p.can_manage_inventory, p.can_manage_sales,
            p.can_manage_attendance, p.can_manage_reports, p.can_manage_settings, p.can_export_reports,
            p.can_manage_promos, p.can_manage_verification_codes
     FROM users u
     LEFT JOIN employee_permissions p ON p.user_id = u.id
     WHERE u.id = ?`,
    [userId],
  );
  if (!rows.length) return null;
  const row = rows[0];
  return {
    id: row.id,
    fullname: row.fullname,
    email: row.email,
    role: row.role,
    status: row.status,
    permissions: rowToPermissions(row),
  };
}

export async function listUsers() {
  const [rows] = await pool.query(
    `SELECT u.id, u.fullname, u.email, u.role, u.status, u.created_at,
            p.can_view_dashboard, p.can_manage_users, p.can_manage_products,
            p.can_manage_menu, p.can_manage_orders, p.can_manage_inventory, p.can_manage_sales,
            p.can_manage_attendance, p.can_manage_reports, p.can_manage_settings, p.can_export_reports,
            p.can_manage_promos, p.can_manage_verification_codes
     FROM users u
     LEFT JOIN employee_permissions p ON p.user_id = u.id
     ORDER BY u.created_at DESC`,
  );
  return rows.map((row) => ({
    id: row.id,
    fullname: row.fullname,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    permissions: rowToPermissions(row),
  }));
}

export async function createUser(data) {
  const hash = await bcrypt.hash(data.password, 10);
  const [result] = await pool.query(
    `INSERT INTO users (fullname, email, password, role, status) VALUES (?, ?, ?, ?, ?)`,
    [data.fullname, data.email, hash, data.role || "staff", data.status || "active"],
  );
  const userId = result.insertId;
  const perms = permissionsToDb(data.permissions || {});
  const cols = Object.keys(perms);
  const vals = Object.values(perms);
  if (cols.length) {
    await pool.query(
      `INSERT INTO employee_permissions (user_id, ${cols.join(", ")}) VALUES (?, ${cols.map(() => "?").join(", ")})`,
      [userId, ...vals],
    );
  } else {
    await pool.query(`INSERT INTO employee_permissions (user_id) VALUES (?)`, [userId]);
  }
  return getUserWithPermissions(userId);
}

export async function updateUser(id, data) {
  if (data.fullname || data.email || data.role || data.status) {
    await pool.query(
      `UPDATE users SET
        fullname = COALESCE(?, fullname),
        email = COALESCE(?, email),
        role = COALESCE(?, role),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [data.fullname ?? null, data.email ?? null, data.role ?? null, data.status ?? null, id],
    );
  }
  if (data.password) {
    const hash = await bcrypt.hash(data.password, 10);
    await pool.query(`UPDATE users SET password = ? WHERE id = ?`, [hash, id]);
  }
  if (data.permissions) {
    const perms = permissionsToDb(data.permissions);
    const [existing] = await pool.query(`SELECT id FROM employee_permissions WHERE user_id = ?`, [id]);
    if (existing.length === 0) {
      const cols = Object.keys(perms);
      if (cols.length) {
        await pool.query(
          `INSERT INTO employee_permissions (user_id, ${cols.join(", ")}) VALUES (?, ${cols.map(() => "?").join(", ")})`,
          [id, ...Object.values(perms)],
        );
      }
    } else {
      const sets = Object.keys(perms).map((c) => `${c} = ?`).join(", ");
      await pool.query(`UPDATE employee_permissions SET ${sets} WHERE user_id = ?`, [
        ...Object.values(perms),
        id,
      ]);
    }
  }
  return getUserWithPermissions(id);
}

export async function deleteUser(id) {
  await pool.query(`DELETE FROM users WHERE id = ?`, [id]);
}
