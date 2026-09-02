import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { adminPermissions, rowToPermissions } from "../utils/permissions.js";
import { logAudit } from "../utils/auditLogger.js";
import * as passwordResetService from "../services/passwordResetService.js";

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }
  const [rows] = await pool.query(
    `SELECT u.*, p.can_view_dashboard, p.can_manage_users, p.can_manage_products,
            p.can_manage_menu, p.can_manage_orders, p.can_manage_inventory, p.can_manage_sales,
            p.can_manage_attendance, p.can_manage_reports, p.can_manage_settings, p.can_export_reports,
            p.can_manage_promos, p.can_manage_verification_codes
     FROM users u
     LEFT JOIN employee_permissions p ON p.user_id = u.id
     WHERE u.email = ? AND u.status = 'active'`,
    [email],
  );
  if (!rows.length) {
    await logAudit(req, {
      userId: null,
      userName: email,
      actionType: "Failed Login",
      moduleName: "Auth",
      description: `Failed login attempt for ${email}`,
    });
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    await logAudit(req, {
      userId: user.id,
      userName: user.fullname,
      actionType: "Failed Login",
      moduleName: "Auth",
      description: `Invalid password for ${email}`,
    });
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const permissions =
    user.role === "admin" ? adminPermissions() : rowToPermissions(user);
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  await logAudit(req, {
    userId: user.id,
    userName: user.fullname,
    actionType: "Login",
    moduleName: "Auth",
    description: `User logged in (${user.role})`,
  });

  res.json({
    token,
    user: {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      role: user.role,
      permissions,
    },
  });
}

export async function logout(req, res) {
  await logAudit(req, {
    userId: req.user?.id ?? null,
    userName: req.user?.fullname || "Unknown",
    actionType: "Logout",
    moduleName: "Auth",
    description: "User logged out",
  });
  res.json({ success: true });
}

export async function me(req, res) {
  res.json({ user: req.user });
}

/** Step 1: verify email exists and send 6-digit code. */
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const result = await passwordResetService.requestPasswordReset(email);
    await logAudit(req, {
      userId: null,
      userName: email,
      actionType: "Password Reset Request",
      moduleName: "Auth",
      description: `Verification code generated for ${email}`,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message || "Could not send verification code." });
  }
}

/** Step 2: verify the 6-digit code before allowing a new password. */
export async function verifyResetCode(req, res) {
  try {
    const { email, code } = req.body;
    const result = await passwordResetService.verifyPasswordResetCode(email, code);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message || "Verification failed." });
  }
}

/** Step 3: set a new password after successful code verification. */
export async function resetPassword(req, res) {
  try {
    const { email, code, newPassword } = req.body;
    const result = await passwordResetService.resetPasswordWithCode(email, code, newPassword);
    await logAudit(req, {
      userId: null,
      userName: email,
      actionType: "Password Reset",
      moduleName: "Auth",
      description: `Password reset completed for ${email}`,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message || "Could not reset password." });
  }
}
