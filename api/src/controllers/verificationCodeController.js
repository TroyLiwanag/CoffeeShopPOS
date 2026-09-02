import * as passwordResetService from "../services/passwordResetService.js";
import { logAudit } from "../utils/auditLogger.js";

export async function list(req, res) {
  try {
    const { search, status, sort } = req.query;
    const codes = await passwordResetService.listVerificationCodes({
      search: search || "",
      status: status || "all",
      sort: sort || "desc",
    });
    res.json(codes);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to list verification codes." });
  }
}

export async function generate(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Staff email is required." });
    }
    const result = await passwordResetService.adminGenerateVerificationCode(email, req.user);
    await logAudit(req, {
      userId: req.user.id,
      userName: req.user.fullname,
      actionType: "Generate Verification Code",
      moduleName: "Verification Codes",
      description: `Generated verification code for staff member ${result.staffName} (${result.email})`,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message || "Could not generate verification code." });
  }
}

export async function markUsed(req, res) {
  try {
    const { id } = req.params;
    const result = await passwordResetService.markVerificationCodeUsed(id);
    await logAudit(req, {
      userId: req.user.id,
      userName: req.user.fullname,
      actionType: "Mark Code Used",
      moduleName: "Verification Codes",
      description: `Marked verification code #${id} for ${result.staffName} (${result.email}) as used`,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message || "Could not mark verification code as used." });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await passwordResetService.deleteVerificationCode(id);
    await logAudit(req, {
      userId: req.user.id,
      userName: req.user.fullname,
      actionType: "Delete Verification Code",
      moduleName: "Verification Codes",
      description: `Deleted verification code #${id} for ${result.staffName} (${result.email})`,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message || "Could not delete verification code." });
  }
}

export async function removeBulk(req, res) {
  try {
    const { ids } = req.body;
    const result = await passwordResetService.deleteVerificationCodes(ids);
    await logAudit(req, {
      userId: req.user.id,
      userName: req.user.fullname,
      actionType: "Delete Selected Codes",
      moduleName: "Verification Codes",
      description: `Deleted ${ids?.length || 0} selected verification code(s)`,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message || "Could not delete selected verification codes." });
  }
}

export async function removeAll(_req, res) {
  try {
    const result = await passwordResetService.deleteAllVerificationCodes();
    await logAudit(_req, {
      userId: _req.user.id,
      userName: _req.user.fullname,
      actionType: "Delete All Codes",
      moduleName: "Verification Codes",
      description: "Deleted all verification codes from the database",
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message || "Could not delete all verification codes." });
  }
}
