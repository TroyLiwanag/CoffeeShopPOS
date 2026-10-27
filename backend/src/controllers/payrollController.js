import pool from "../config/db.js";
import { logAuditFromReq } from "../utils/auditLogger.js";
import { hoursSummary } from "./attendanceController.js";

const DEFAULT_RATE = 80;

export async function overview(req, res) {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 7));
  const standardHours = days * 8;
  const attendanceByUser = new Map();
  for (const row of await hoursSummary(days)) {
    attendanceByUser.set(String(row.user_id), {
      regularHours: Number(row.regular_hours),
      overtimeHours: Number(row.overtime_hours),
      daysRecorded: Number(row.days_recorded),
    });
  }

  const [rows] = await pool.query(
    `SELECT u.id, u.fullname, u.email, u.role, u.status,
            COALESCE(pr.hourly_rate, ?) AS hourly_rate,
            pr.updated_at AS rate_updated_at
     FROM users u
     LEFT JOIN payroll_rates pr ON pr.user_id = u.id
     WHERE u.status = 'active'
     ORDER BY u.fullname ASC`,
    [DEFAULT_RATE],
  );
  res.json(
    rows.map((r) => {
      const att = attendanceByUser.get(String(r.id));
      const hasAttendance = att && att.daysRecorded > 0;
      return {
        id: String(r.id),
        fullname: r.fullname,
        email: r.email,
        role: r.role,
        status: r.status,
        hourlyRate: Number(r.hourly_rate),
        rateUpdatedAt: r.rate_updated_at,
        regularHours: hasAttendance ? att.regularHours : standardHours,
        overtimeHours: hasAttendance ? att.overtimeHours : 0,
        hoursSource: hasAttendance ? "attendance" : "estimated",
        daysRecorded: att?.daysRecorded ?? 0,
      };
    }),
  );
}

export async function saveRates(req, res) {
  const rates = Array.isArray(req.body?.rates) ? req.body.rates : [];
  if (!rates.length) {
    return res.status(400).json({ message: "No payroll rates provided" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const entry of rates) {
      const userId = Number(entry.userId);
      const hourlyRate = Number(entry.hourlyRate);
      if (!Number.isFinite(userId) || !Number.isFinite(hourlyRate) || hourlyRate < 0) {
        continue;
      }
      await conn.query(
        `INSERT INTO payroll_rates (user_id, hourly_rate, updated_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           hourly_rate = VALUES(hourly_rate),
           updated_by = VALUES(updated_by),
           updated_at = CURRENT_TIMESTAMP`,
        [userId, hourlyRate, req.user.id],
      );
    }
    await conn.commit();

    await logAuditFromReq(
      req,
      "Update Payroll Rates",
      "Payroll",
      `Updated ${rates.length} payroll rate${rates.length > 1 ? "s" : ""}`,
    );

    const [rows] = await pool.query(
      `SELECT u.id, u.fullname, u.email, u.role, u.status,
              COALESCE(pr.hourly_rate, ?) AS hourly_rate,
              pr.updated_at AS rate_updated_at
       FROM users u
       LEFT JOIN payroll_rates pr ON pr.user_id = u.id
       WHERE u.status = 'active'
       ORDER BY u.fullname ASC`,
      [DEFAULT_RATE],
    );

    const days = Math.min(365, Math.max(1, Number(req.query.days) || 7));
    const standardHours = days * 8;
    const attendanceByUser = new Map();
    for (const row of await hoursSummary(days)) {
      attendanceByUser.set(String(row.user_id), {
        regularHours: Number(row.regular_hours),
        overtimeHours: Number(row.overtime_hours),
        daysRecorded: Number(row.days_recorded),
      });
    }

    res.json(
      rows.map((r) => {
        const att = attendanceByUser.get(String(r.id));
        const hasAttendance = att && att.daysRecorded > 0;
        return {
          id: String(r.id),
          fullname: r.fullname,
          email: r.email,
          role: r.role,
          status: r.status,
          hourlyRate: Number(r.hourly_rate),
          rateUpdatedAt: r.rate_updated_at,
          regularHours: hasAttendance ? att.regularHours : standardHours,
          overtimeHours: hasAttendance ? att.overtimeHours : 0,
          hoursSource: hasAttendance ? "attendance" : "estimated",
          daysRecorded: att?.daysRecorded ?? 0,
        };
      }),
    );
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
