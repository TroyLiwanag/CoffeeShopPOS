import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { logAuditFromReq } from "../utils/auditLogger.js";

export async function getSettings(req, res) {
  const [rows] = await pool.query(`SELECT settings_json FROM shop_settings WHERE id = 1`);
  if (!rows.length) return res.json(null);
  let json = rows[0].settings_json;
  let parsed = typeof json === "string" ? JSON.parse(json) : json;
  if (parsed && typeof parsed === "object") {
    // Expose whether a PIN hash exists (but never the hash itself)
    parsed.voidPinConfigured = Boolean(parsed.voidPinHash);
    delete parsed.voidPinHash;
    delete parsed.voidPin;
  }
  res.json(parsed);
}

export async function updateSettings(req, res) {
  const settings = req.body || {};

  // Preserve existing voidPinHash if present
  const [current] = await pool.query(`SELECT settings_json FROM shop_settings WHERE id = 1`);
  if (current.length && current[0].settings_json) {
    try {
      const existingObj = typeof current[0].settings_json === "string"
        ? JSON.parse(current[0].settings_json)
        : current[0].settings_json;
      if (existingObj.voidPinHash) {
        settings.voidPinHash = existingObj.voidPinHash;
      }
    } catch {}
  }

  // Never store plain text PINs
  delete settings.voidPin;

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

  const safeSettings = { ...settings };
  delete safeSettings.voidPinHash;
  delete safeSettings.voidPin;
  res.json(safeSettings);
}

export async function updateVoidPin(req, res) {
  const { adminPassword, newPin, enableVoidPin } = req.body;

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only Admin users can configure Void PIN settings." });
  }

  if (!adminPassword || !String(adminPassword).trim()) {
    return res.status(400).json({ message: "Current Admin password is required." });
  }

  // Fetch admin password from DB
  const [users] = await pool.query(`SELECT password FROM users WHERE id = ?`, [req.user.id]);
  if (!users.length) {
    return res.status(404).json({ message: "User account not found." });
  }

  const validPassword = await bcrypt.compare(String(adminPassword).trim(), users[0].password);
  if (!validPassword) {
    return res.status(401).json({ message: "Incorrect current Admin password." });
  }

  let voidPinHash = null;
  if (newPin && String(newPin).trim()) {
    const trimmedPin = String(newPin).trim();
    if (!/^\d{4,8}$/.test(trimmedPin)) {
      return res.status(400).json({ message: "Void PIN must consist of 4 to 8 numeric digits." });
    }
    voidPinHash = await bcrypt.hash(trimmedPin, 10);
  }

  // Get current settings object
  const [rows] = await pool.query(`SELECT settings_json FROM shop_settings WHERE id = 1`);
  let settings = {};
  if (rows.length && rows[0].settings_json) {
    try {
      settings = typeof rows[0].settings_json === "string" ? JSON.parse(rows[0].settings_json) : rows[0].settings_json;
    } catch {}
  }

  if (voidPinHash) {
    settings.voidPinHash = voidPinHash;
  }
  settings.voidPinEnabled = enableVoidPin !== undefined ? Boolean(enableVoidPin) : true;
  delete settings.voidPin;

  const json = JSON.stringify(settings);
  if (rows.length) {
    await pool.query(`UPDATE shop_settings SET settings_json = ?, updated_by = ? WHERE id = 1`, [json, req.user.id]);
  } else {
    await pool.query(`INSERT INTO shop_settings (id, settings_json, updated_by) VALUES (1, ?, ?)`, [json, req.user.id]);
  }

  await logAuditFromReq(
    req,
    "Update Void PIN",
    "Settings",
    `Updated Void PIN configuration. PIN Enabled: ${settings.voidPinEnabled}`,
  );

  const safeSettings = { ...settings };
  delete safeSettings.voidPinHash;
  delete safeSettings.voidPin;
  // Let frontend know whether a PIN hash exists (but never the hash itself)
  safeSettings.voidPinConfigured = Boolean(settings.voidPinHash);
  res.json({ success: true, message: "Void PIN updated successfully.", settings: safeSettings });
}

