import crypto from "crypto";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";

const CODE_TTL_MS = 10 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 6;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateSixDigitCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function deriveStatus(row) {
  if (row.used_at) return "Used";
  if (new Date(row.expires_at) <= new Date()) return "Expired";
  return "Active";
}

function mapVerificationRow(row) {
  return {
    id: row.id,
    staffName: row.staff_name,
    email: row.email,
    code: row.code_plain || null,
    status: deriveStatus(row),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    generatedBy: row.generated_by_name || "Staff request",
    userId: row.user_id,
  };
}

async function findActiveUserByEmail(email) {
  const [rows] = await pool.query(
    `SELECT id, fullname, email, role FROM users WHERE email = ? AND status = 'active'`,
    [email],
  );
  return rows[0] || null;
}

async function findActiveStaffByEmail(email) {
  const user = await findActiveUserByEmail(email);
  if (!user) return null;
  return user;
}

async function invalidateExistingCodes(userId) {
  await pool.query(
    `UPDATE password_reset_codes SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL`,
    [userId],
  );
}

async function insertResetCode({ userId, code, generatedBy, generatedByName }) {
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await invalidateExistingCodes(userId);
  const [result] = await pool.query(
    `INSERT INTO password_reset_codes
      (user_id, code_hash, code_plain, expires_at, generated_by, generated_by_name)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, codeHash, code, expiresAt, generatedBy ?? null, generatedByName ?? "Staff request"],
  );

  return { id: result.insertId, code, expiresAt };
}

async function findValidResetRecord(email, code) {
  const normalized = normalizeEmail(email);
  const user = await findActiveUserByEmail(normalized);
  if (!user) return null;

  const [rows] = await pool.query(
    `SELECT id, code_hash, expires_at, used_at
     FROM password_reset_codes
     WHERE user_id = ? AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [user.id],
  );

  if (!rows.length) return null;

  const record = rows[0];
  const matches = await bcrypt.compare(String(code).trim(), record.code_hash);
  if (!matches) return null;

  return { user, recordId: record.id };
}

/**
 * Staff self-service: verify email, generate code, no email sent.
 */
export async function requestPasswordReset(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("Email is required.");
  if (!isValidEmail(normalized)) throw new Error("Please enter a valid email address.");

  const user = await findActiveStaffByEmail(normalized);
  if (!user) {
    throw new Error("No active account found with that email address.");
  }

  const code = generateSixDigitCode();
  await insertResetCode({
    userId: user.id,
    code,
    generatedBy: null,
    generatedByName: "Staff request",
  });

  return {
    message:
      "Your verification code has been generated. Please contact your administrator to obtain the code.",
  };
}

/** Admin generates a code for a staff member. */
export async function adminGenerateVerificationCode(email, generatedBy) {
  const normalized = normalizeEmail(email);
  if (!normalized || !isValidEmail(normalized)) {
    throw new Error("Please enter a valid email address.");
  }

  const user = await findActiveStaffByEmail(normalized);
  if (!user) {
    throw new Error("No active account found with that email address.");
  }
  if (user.role === "admin") {
    throw new Error("Administrator accounts cannot use verification codes.");
  }

  const code = generateSixDigitCode();
  const record = await insertResetCode({
    userId: user.id,
    code,
    generatedBy: generatedBy.id,
    generatedByName: generatedBy.fullname,
  });

  return {
    message: "Verification code generated.",
    code: record.code,
    id: record.id,
    staffName: user.fullname,
    email: user.email,
    expiresAt: record.expiresAt,
  };
}

export async function listVerificationCodes({ search = "", status = "all", sort = "desc" } = {}) {
  const params = [];
  let where = "WHERE 1=1";

  if (search.trim()) {
    where += " AND (u.fullname LIKE ? OR u.email LIKE ? OR prc.code_plain LIKE ? OR prc.generated_by_name LIKE ?)";
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  const [rows] = await pool.query(
    `SELECT prc.id, prc.user_id, prc.code_plain, prc.expires_at, prc.used_at, prc.created_at,
            prc.generated_by_name, u.fullname AS staff_name, u.email
     FROM password_reset_codes prc
     INNER JOIN users u ON u.id = prc.user_id
     ${where}
     ORDER BY prc.created_at ${sort === "asc" ? "ASC" : "DESC"}`,
    params,
  );

  let mapped = rows.map(mapVerificationRow);
  if (status !== "all") {
    mapped = mapped.filter((row) => row.status.toLowerCase() === status.toLowerCase());
  }
  return mapped;
}

export async function markVerificationCodeUsed(id) {
  const [rows] = await pool.query(
    `SELECT prc.id, prc.used_at, prc.expires_at, u.email, u.fullname
     FROM password_reset_codes prc
     INNER JOIN users u ON u.id = prc.user_id
     WHERE prc.id = ?`,
    [id],
  );
  if (!rows.length) throw new Error("Verification code not found.");
  const row = rows[0];
  if (row.used_at) throw new Error("This code has already been used.");

  await pool.query(`UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?`, [id]);
  return {
    message: "Verification code marked as used.",
    email: row.email,
    staffName: row.fullname,
  };
}

export async function deleteVerificationCode(id) {
  const [rows] = await pool.query(
    `SELECT prc.id, u.email, u.fullname
     FROM password_reset_codes prc
     INNER JOIN users u ON u.id = prc.user_id
     WHERE prc.id = ?`,
    [id],
  );
  if (!rows.length) throw new Error("Verification code not found.");

  await pool.query(`DELETE FROM password_reset_codes WHERE id = ?`, [id]);
  return {
    message: "Verification code deleted.",
    email: rows[0].email,
    staffName: rows[0].fullname,
  };
}

export async function deleteVerificationCodes(ids) {
  if (!Array.isArray(ids) || !ids.length) {
    throw new Error("Select at least one verification code.");
  }
  const placeholders = ids.map(() => "?").join(", ");
  const [result] = await pool.query(
    `DELETE FROM password_reset_codes WHERE id IN (${placeholders})`,
    ids,
  );
  return { message: `${result.affectedRows} verification code(s) deleted.` };
}

export async function deleteAllVerificationCodes() {
  const [result] = await pool.query(`DELETE FROM password_reset_codes`);
  return { message: `${result.affectedRows} verification code(s) deleted.` };
}

export async function verifyPasswordResetCode(email, code) {
  const normalized = normalizeEmail(email);
  const trimmedCode = String(code || "").trim();

  if (!normalized || !isValidEmail(normalized)) {
    throw new Error("Please enter a valid email address.");
  }
  if (!/^\d{6}$/.test(trimmedCode)) {
    throw new Error("Please enter the 6-digit verification code.");
  }

  const match = await findValidResetRecord(normalized, trimmedCode);
  if (!match) {
    throw new Error("Invalid or expired verification code.");
  }

  return { message: "Verification code accepted." };
}

export async function resetPasswordWithCode(email, code, newPassword) {
  const normalized = normalizeEmail(email);
  const trimmedCode = String(code || "").trim();
  const password = String(newPassword || "");

  if (!normalized || !isValidEmail(normalized)) {
    throw new Error("Please enter a valid email address.");
  }
  if (!/^\d{6}$/.test(trimmedCode)) {
    throw new Error("Please enter the 6-digit verification code.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const match = await findValidResetRecord(normalized, trimmedCode);
  if (!match) {
    throw new Error("Invalid or expired verification code.");
  }

  const hash = await bcrypt.hash(password, 10);
  await pool.query(`UPDATE users SET password = ? WHERE id = ?`, [hash, match.user.id]);
  await pool.query(`UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?`, [match.recordId]);
  await invalidateExistingCodes(match.user.id);

  return {
    message: "Password updated successfully. You can now sign in with your new password.",
  };
}
