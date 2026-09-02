import pool from "../config/db.js";
import { formatDeviceInfo } from "../utils/deviceParser.js";
import { logAuditFromReq } from "../utils/auditLogger.js";

function buildWhere(query) {
  const conditions = [];
  const params = [];

  if (query.search) {
    conditions.push(
      `(user_name LIKE ? OR action_type LIKE ? OR module_name LIKE ? OR description LIKE ?)`,
    );
    const term = `%${query.search}%`;
    params.push(term, term, term, term);
  }

  if (query.module) {
    conditions.push(`module_name = ?`);
    params.push(query.module);
  }

  if (query.userId) {
    conditions.push(`user_id = ?`);
    params.push(query.userId);
  }

  if (query.actionType) {
    conditions.push(`action_type = ?`);
    params.push(query.actionType);
  }

  const period = query.period || "all";
  if (period === "today") {
    conditions.push(`DATE(created_at) = CURDATE()`);
  } else if (period === "week") {
    conditions.push(`created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`);
  } else if (period === "month") {
    conditions.push(`created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`);
  } else if (period === "custom" && query.dateFrom && query.dateTo) {
    conditions.push(`DATE(created_at) BETWEEN ? AND ?`);
    params.push(query.dateFrom, query.dateTo);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return { where, params };
}

function mapRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    actionType: row.action_type,
    moduleName: row.module_name,
    description: row.description,
    ipAddress: row.ip_address,
    deviceInfo: row.device_info,
    deviceLabel: formatDeviceInfo(row.device_info),
    createdAt: row.created_at,
  };
}

export async function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 25));
  const offset = (page - 1) * limit;

  const { where, params } = buildWhere(req.query);

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM audit_logs ${where}`,
    params,
  );
  const total = Number(countRows[0].total);

  const [rows] = await pool.query(
    `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  res.json({
    data: rows.map(mapRow),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
}

export async function getModules(req, res) {
  const [rows] = await pool.query(
    `SELECT DISTINCT module_name FROM audit_logs ORDER BY module_name`,
  );
  res.json(rows.map((r) => r.module_name));
}

export async function getUsers(req, res) {
  const [rows] = await pool.query(
    `SELECT DISTINCT user_id, user_name FROM audit_logs WHERE user_name IS NOT NULL ORDER BY user_name`,
  );
  res.json(
    rows.map((r) => ({ id: r.user_id, name: r.user_name })),
  );
}

export async function remove(req, res) {
  const id = req.params.id;
  await pool.query(`DELETE FROM audit_logs WHERE id = ?`, [id]);
  await logAuditFromReq(req, "Delete Audit Log", "Audit", `Deleted audit entry #${id}`);
  res.json({ success: true });
}

export async function removeBulk(req, res) {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ message: "ids array required" });
  }
  const placeholders = ids.map(() => "?").join(",");
  await pool.query(`DELETE FROM audit_logs WHERE id IN (${placeholders})`, ids);
  await logAuditFromReq(
    req,
    "Delete Audit Logs",
    "Audit",
    `Deleted ${ids.length} audit entries`,
  );
  res.json({ success: true });
}

async function fetchForExport(query) {
  const { where, params } = buildWhere(query);
  const [rows] = await pool.query(
    `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT 5000`,
    params,
  );
  return rows.map(mapRow);
}

function escapeCsv(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function exportCsv(req, res) {
  const rows = await fetchForExport(req.query);
  const header = ["ID", "User", "Action", "Module", "Description", "IP", "Device", "Date"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.userName,
        r.actionType,
        r.moduleName,
        r.description,
        r.ipAddress,
        r.deviceLabel,
        new Date(r.createdAt).toISOString(),
      ]
        .map(escapeCsv)
        .join(","),
    ),
  ];
  await logAuditFromReq(req, "Export Audit Log", "Audit", `CSV export (${rows.length} rows)`);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="audit-log-${Date.now()}.csv"`);
  res.send(lines.join("\n"));
}

export async function exportPdf(req, res) {
  const rows = await fetchForExport(req.query);
  await logAuditFromReq(req, "Export Audit Log", "Audit", `PDF export (${rows.length} rows)`);

  const rowsHtml = rows
    .map(
      (r) => `<tr>
        <td>${r.id}</td>
        <td>${escapeHtml(r.userName)}</td>
        <td>${escapeHtml(r.actionType)}</td>
        <td>${escapeHtml(r.moduleName)}</td>
        <td>${escapeHtml(r.description || "")}</td>
        <td>${escapeHtml(r.ipAddress || "")}</td>
        <td>${escapeHtml(r.deviceLabel)}</td>
        <td>${new Date(r.createdAt).toLocaleString()}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Audit Log</title>
<style>
  body { font-family: Georgia, serif; font-size: 11px; color: #3d2b1f; padding: 24px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #666; margin-bottom: 20px; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #5c3d2e; color: #fff; }
  tr:nth-child(even) { background: #f7f1e3; }
</style></head><body>
  <h1>Cafe Corazon — Audit Log</h1>
  <p class="meta">Exported ${new Date().toLocaleString()} · ${rows.length} entries</p>
  <table>
    <thead><tr>
      <th>ID</th><th>User</th><th>Action</th><th>Module</th>
      <th>Description</th><th>IP</th><th>Device</th><th>Date</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body></html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Disposition", `inline; filename="audit-log-${Date.now()}.html"`);
  res.send(html);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
