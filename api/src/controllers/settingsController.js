import pool from "../config/db.js";
import { logAuditFromReq } from "../utils/auditLogger.js";

export async function getSettings(req, res) {
  const [rows] = await pool.query(`SELECT settings_json FROM shop_settings WHERE id = 1`);
  if (!rows.length) return res.json(null);
  const json = rows[0].settings_json;
  res.json(typeof json === "string" ? JSON.parse(json) : json);
}

export async function updateSettings(req, res) {
  const settings = req.body;
  const json = JSON.stringify(settings);
  const [existing] = await pool.query(`SELECT id FROM shop_settings WHERE id = 1`);
  if (existing.length) {
    await pool.query(`UPDATE shop_settings SET settings_json = ?, updated_by = ? WHERE id = 1`, [
      json,
      req.user.id,
    ]);
  } else {
    await pool.query(`INSERT INTO shop_settings (id, settings_json, updated_by) VALUES (1, ?, ?)`, [
      json,
      req.user.id,
    ]);
  }
  await logAuditFromReq(
    req,
    "Update Settings",
    "Settings",
    `Updated: ${Object.keys(settings).join(", ")}`,
  );
  res.json(settings);
}
