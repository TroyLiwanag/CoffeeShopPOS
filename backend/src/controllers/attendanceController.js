import pool from "../config/db.js";
import { logAuditFromReq } from "../utils/auditLogger.js";

const STANDARD_DAY_HOURS = 8;

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function computeHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return { hoursWorked: 0, overtimeHours: 0 };
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  const total = Math.max(0, Math.round((ms / 3600000) * 100) / 100);
  const hoursWorked = Math.min(STANDARD_DAY_HOURS, total);
  const overtimeHours = Math.max(0, Math.round((total - STANDARD_DAY_HOURS) * 100) / 100);
  return { hoursWorked, overtimeHours };
}

function mapRow(r) {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    userName: r.user_name,
    userRole: r.user_role,
    workDate: formatDayKey(r.work_date),
    clockIn: r.clock_in,
    clockOut: r.clock_out,
    hoursWorked: Number(r.hours_worked),
    overtimeHours: Number(r.overtime_hours),
    notes: r.notes || "",
    status: r.clock_out ? "completed" : r.clock_in ? "clocked_in" : "scheduled",
  };
}

function formatDayKey(day) {
  if (!day) return "";
  if (day instanceof Date && !Number.isNaN(day.getTime())) {
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, "0");
    const d = String(day.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const match = String(day).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : String(day).slice(0, 10);
}

function resolveTargetUserId(req, bodyUserId) {
  const targetId = bodyUserId != null ? Number(bodyUserId) : req.user.id;
  if (!Number.isFinite(targetId)) return null;
  if (
    targetId !== req.user.id &&
    req.user.role !== "admin" &&
    !req.user.permissions?.canManageSales &&
    !req.user.permissions?.canManageAttendance
  ) {
    return null;
  }
  return targetId;
}

function canManageAttendance(req) {
  return (
    req.user?.role === "admin" ||
    !!req.user?.permissions?.canManageSales ||
    !!req.user?.permissions?.canManageAttendance
  );
}

async function getRecordForDate(userId, workDate) {
  const [rows] = await pool.query(
    `SELECT * FROM attendance_records WHERE user_id = ? AND work_date = ?`,
    [userId, workDate],
  );
  return rows[0] || null;
}

async function fetchRecordById(id) {
  const [rows] = await pool.query(
    `SELECT ar.*, u.fullname AS user_name, u.role AS user_role
     FROM attendance_records ar
     JOIN users u ON u.id = ar.user_id
     WHERE ar.id = ?`,
    [id],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function myStatus(req, res) {
  const workDate = todayDateString();
  const [rows] = await pool.query(
    `SELECT ar.*, u.fullname AS user_name, u.role AS user_role
     FROM attendance_records ar
     JOIN users u ON u.id = ar.user_id
     WHERE ar.user_id = ? AND ar.work_date = ?`,
    [req.user.id, workDate],
  );
  const row = rows[0];
  if (!row) {
    return res.json({ workDate, status: "not_clocked_in", record: null });
  }
  res.json({
    workDate,
    status: row.clock_out ? "completed" : "clocked_in",
    record: mapRow(row),
  });
}

export async function list(req, res) {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 14));
  const userId = req.query.userId != null ? Number(req.query.userId) : null;
  const params = [days - 1];
  let sql = `SELECT ar.*, u.fullname AS user_name, u.role AS user_role
     FROM attendance_records ar
     JOIN users u ON u.id = ar.user_id
     WHERE ar.work_date >= (CURDATE() - INTERVAL ? DAY)`;
  if (userId != null && Number.isFinite(userId)) {
    sql += ` AND ar.user_id = ?`;
    params.push(userId);
  }
  sql += ` ORDER BY ar.work_date DESC, u.fullname ASC`;
  const [rows] = await pool.query(sql, params);
  res.json(rows.map(mapRow));
}

export async function clockIn(req, res) {
  const targetUserId = resolveTargetUserId(req, req.body?.userId);
  if (!targetUserId) return res.status(403).json({ message: "Not allowed to clock in for this employee" });

  const workDate = todayDateString();
  const existing = await getRecordForDate(targetUserId, workDate);
  const force = !!req.body?.force;
  const manager = canManageAttendance(req);
  if (existing?.clock_in && !existing.clock_out) {
    return res.status(400).json({ message: "Already clocked in for today" });
  }
  if (existing?.clock_out) {
    if (!force || !manager) {
      return res.status(400).json({ message: "Attendance for today is already complete" });
    }
  }

  const now = new Date();
  if (existing) {
    await pool.query(
      `UPDATE attendance_records SET clock_in = ?, clock_out = NULL, hours_worked = 0, overtime_hours = 0,
       recorded_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [now, req.user.id, existing.id],
    );
    const record = await fetchRecordById(existing.id);
    await logAuditFromReq(
      req,
      existing.clock_out ? "Reset Clock In" : "Clock In",
      "Attendance",
      `${record.userName} — ${workDate}`,
    );
    return res.json(record);
  }

  const [result] = await pool.query(
    `INSERT INTO attendance_records (user_id, work_date, clock_in, recorded_by)
     VALUES (?, ?, ?, ?)`,
    [targetUserId, workDate, now, req.user.id],
  );
  const record = await fetchRecordById(result.insertId);
  await logAuditFromReq(req, "Clock In", "Attendance", `${record.userName} — ${workDate}`);
  res.status(201).json(record);
}

export async function clockOut(req, res) {
  const targetUserId = resolveTargetUserId(req, req.body?.userId);
  if (!targetUserId) return res.status(403).json({ message: "Not allowed to clock out for this employee" });

  const workDate = todayDateString();
  const existing = await getRecordForDate(targetUserId, workDate);
  if (!existing?.clock_in) {
    return res.status(400).json({ message: "Not clocked in yet for today" });
  }
  if (existing.clock_out) {
    return res.status(400).json({ message: "Already clocked out for today" });
  }

  const now = new Date();
  const { hoursWorked, overtimeHours } = computeHours(existing.clock_in, now);
  await pool.query(
    `UPDATE attendance_records SET clock_out = ?, hours_worked = ?, overtime_hours = ?,
     recorded_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [now, hoursWorked, overtimeHours, req.user.id, existing.id],
  );
  const record = await fetchRecordById(existing.id);
  await logAuditFromReq(req, "Clock Out", "Attendance", `${record.userName} — ${workDate} (${hoursWorked}h)`);
  res.json(record);
}

export async function remove(req, res) {
  const id = Number(req.params.id);
  const record = await fetchRecordById(id);
  if (!record) return res.status(404).json({ message: "Record not found" });
  await pool.query(`DELETE FROM attendance_records WHERE id = ?`, [id]);
  await logAuditFromReq(req, "Delete Attendance", "Attendance", `${record.userName} — ${record.workDate}`);
  res.json({ ok: true });
}

/** Used by payroll — hours per user for a period */
export async function hoursSummary(days) {
  const d = Math.min(365, Math.max(1, Number(days) || 7));
  const [rows] = await pool.query(
    `SELECT user_id,
            COALESCE(SUM(hours_worked), 0) AS regular_hours,
            COALESCE(SUM(overtime_hours), 0) AS overtime_hours,
            COUNT(*) AS days_recorded
     FROM attendance_records
     WHERE work_date >= (CURDATE() - INTERVAL ? DAY)
     GROUP BY user_id`,
    [d - 1],
  );
  return rows;
}
