import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export function isEmailConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * Sends a 6-digit password reset code to the user's registered email.
 */
export async function sendPasswordResetEmail({ to, fullname, code }) {
  const transport = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const subject = "Cafe Corazon — Password reset code";
  const text = [
    `Hello ${fullname},`,
    "",
    "We received a request to reset your Cafe Corazon account password.",
    "",
    `Your verification code is: ${code}`,
    "",
    "This code expires in 10 minutes. If you did not request this, you can ignore this email.",
    "",
    "— Cafe Corazon",
  ].join("\n");

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.6;color:#2c1810;max-width:480px">
      <h2 style="margin:0 0 12px">Password reset</h2>
      <p>Hello <strong>${escapeHtml(fullname)}</strong>,</p>
      <p>We received a request to reset your Cafe Corazon account password.</p>
      <p style="font-size:28px;letter-spacing:6px;font-weight:700;margin:24px 0">${code}</p>
      <p style="color:#666">This code expires in <strong>10 minutes</strong>.</p>
      <p style="color:#666;font-size:13px">If you did not request this, you can safely ignore this email.</p>
      <p style="margin-top:24px">— Cafe Corazon</p>
    </div>
  `;

  if (!transport) {
    console.warn("[email] SMTP not configured. Password reset code for", to, ":", code);
    return { devMode: true };
  }

  await transport.sendMail({ from, to, subject, text, html });
  return { devMode: false };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
