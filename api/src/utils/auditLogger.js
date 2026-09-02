import pool from "../config/db.js";
import { parseUserAgent } from "./deviceParser.js";

function getClientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress?.replace("::ffff:", "") || "";
}

/**
 * Reusable audit logger — persists to MySQL audit_logs.
 * @param {import('express').Request} req
 * @param {{ userId?: number|null, userName: string, actionType: string, moduleName: string, description?: string }} data
 */
export async function logAudit(req, { userId = null, userName, actionType, moduleName, description = "" }) {
  try {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers?.["user-agent"] || "";
    const deviceInfo = parseUserAgent(userAgent);

    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, action_type, module_name, description, ip_address, device_info)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId ?? null, userName || "System", actionType, moduleName, description || null, ipAddress, deviceInfo],
    );
  } catch (err) {
    console.error("[audit] Failed to save audit log:", err.message);
  }
}

/** Log using authenticated user from req.user */
export async function logAuditFromReq(req, actionType, moduleName, description = "") {
  const u = req.user;
  return logAudit(req, {
    userId: u?.id ?? null,
    userName: u?.fullname || u?.email || "Unknown",
    actionType,
    moduleName,
    description,
  });
}
