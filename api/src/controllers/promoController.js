import pool from "../config/db.js";
import { logAuditFromReq } from "../utils/auditLogger.js";

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Automatically sync promo status based on current date */
async function syncPromoStatuses() {
  try {
    const today = getTodayString();
    await pool.query(
      `UPDATE promos SET status = 'Expired' WHERE end_date < ? AND status IN ('Active', 'Scheduled')`,
      [today],
    );
    await pool.query(
      `UPDATE promos SET status = 'Active' WHERE start_date <= ? AND end_date >= ? AND status = 'Scheduled'`,
      [today, today],
    );
  } catch (err) {
    console.error("[promoController] Status sync error:", err.message);
  }
}

export async function list(_req, res) {
  await syncPromoStatuses();
  const [promos] = await pool.query(
    `SELECT p.*,
            (SELECT COUNT(*) FROM promo_history ph WHERE ph.promo_id = p.id AND ph.action = 'Promo Used') AS usage_count
     FROM promos p
     ORDER BY p.created_at DESC`,
  );
  res.json(promos);
}

export async function getById(req, res) {
  await syncPromoStatuses();
  const [rows] = await pool.query(`SELECT * FROM promos WHERE id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: "Promo not found" });
  res.json(rows[0]);
}

export async function create(req, res) {
  const promoName = req.body.promoName || req.body.promo_name;
  const description = req.body.description;
  const discountType = req.body.discountType || req.body.discount_type || "percentage";
  const rawDiscVal = req.body.discountValue !== undefined ? req.body.discountValue : req.body.discount_value;
  const discountValue = rawDiscVal !== undefined ? Number(rawDiscVal) : 0;
  const eligibleCustomer = req.body.eligibleCustomer || req.body.eligible_customer || "Everyone";
  const startDate = req.body.startDate || req.body.start_date;
  const endDate = req.body.endDate || req.body.end_date;
  const startTime = req.body.startTime !== undefined ? req.body.startTime : req.body.start_time;
  const endTime = req.body.endTime !== undefined ? req.body.endTime : req.body.end_time;
  const status = req.body.status;

  if (!promoName || !promoName.trim()) {
    return res.status(400).json({ message: "Promo name is required." });
  }
  if (!discountValue || Number(discountValue) <= 0) {
    return res.status(400).json({ message: "Discount value must be greater than zero." });
  }
  if (discountType === "percentage" && Number(discountValue) > 100) {
    return res.status(400).json({ message: "Percentage discount cannot exceed 100%." });
  }
  if (!startDate || !endDate) {
    return res.status(400).json({ message: "Start date and End date are required." });
  }
  if (new Date(endDate) < new Date(startDate)) {
    return res.status(400).json({ message: "End date cannot be before the start date." });
  }

  const [existing] = await pool.query(`SELECT id FROM promos WHERE promo_name = ?`, [promoName.trim()]);
  if (existing.length > 0) {
    return res.status(400).json({ message: "A promo with this name already exists." });
  }

  const today = getTodayString();
  let initialStatus = status || "Active";
  if (startDate > today) {
    initialStatus = "Scheduled";
  } else if (endDate < today) {
    initialStatus = "Expired";
  }

  const normalizedStartTime = (startTime && typeof startTime === "string" && startTime.trim()) ? startTime.trim() : null;
  const normalizedEndTime = (endTime && typeof endTime === "string" && endTime.trim()) ? endTime.trim() : null;

  const [result] = await pool.query(
    `INSERT INTO promos (
      promo_name, description, discount_type, discount_value, eligible_customer,
      start_date, end_date, start_time, end_time, status, created_by, created_by_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      promoName.trim(),
      description || "",
      discountType,
      Number(discountValue),
      eligibleCustomer,
      startDate,
      endDate,
      normalizedStartTime,
      normalizedEndTime,
      initialStatus,
      req.user?.id || null,
      req.user?.fullname || "Administrator",
    ],
  );

  const promoId = result.insertId;

  await pool.query(
    `INSERT INTO promo_history (promo_id, promo_name, action, performed_by, performed_by_name)
     VALUES (?, ?, 'Promo Created', ?, ?)`,
    [promoId, promoName.trim(), req.user?.id || null, req.user?.fullname || "Administrator"],
  );

  await logAuditFromReq(
    req,
    "Create Promo",
    "Promos",
    `Administrator created promo: ${promoName.trim()}`,
  );

  const [rows] = await pool.query(`SELECT * FROM promos WHERE id = ?`, [promoId]);
  res.status(201).json(rows[0]);
}

export async function update(req, res) {
  const { id } = req.params;
  const promoName = req.body.promoName || req.body.promo_name;
  const description = req.body.description;
  const discountType = req.body.discountType || req.body.discount_type;
  const rawDiscVal = req.body.discountValue !== undefined ? req.body.discountValue : req.body.discount_value;
  const discountValue = rawDiscVal !== undefined ? Number(rawDiscVal) : undefined;
  const eligibleCustomer = req.body.eligibleCustomer || req.body.eligible_customer;
  const startDate = req.body.startDate || req.body.start_date;
  const endDate = req.body.endDate || req.body.end_date;
  const startTime = req.body.startTime !== undefined ? req.body.startTime : req.body.start_time;
  const endTime = req.body.endTime !== undefined ? req.body.endTime : req.body.end_time;
  const status = req.body.status;

  const [before] = await pool.query(`SELECT * FROM promos WHERE id = ?`, [id]);
  if (!before.length) return res.status(404).json({ message: "Promo not found." });

  const current = before[0];

  if (promoName && promoName.trim() !== current.promo_name) {
    const [dup] = await pool.query(`SELECT id FROM promos WHERE promo_name = ? AND id != ?`, [promoName.trim(), id]);
    if (dup.length > 0) return res.status(400).json({ message: "Another promo with this name already exists." });
  }

  const newDiscType = discountType || current.discount_type;
  const newDiscVal = discountValue !== undefined ? Number(discountValue) : current.discount_value;
  if (newDiscType === "percentage" && newDiscVal > 100) {
    return res.status(400).json({ message: "Percentage discount cannot exceed 100%." });
  }

  const sDate = startDate || current.start_date;
  const eDate = endDate || current.end_date;
  if (sDate && eDate && new Date(eDate) < new Date(sDate)) {
    return res.status(400).json({ message: "End date cannot be before start date." });
  }

  const updatedName = promoName ? promoName.trim() : current.promo_name;
  const newStatus = status || current.status;

  const normalizedStartTime = startTime !== undefined
    ? ((startTime && typeof startTime === "string" && startTime.trim()) ? startTime.trim() : null)
    : current.start_time;

  const normalizedEndTime = endTime !== undefined
    ? ((endTime && typeof endTime === "string" && endTime.trim()) ? endTime.trim() : null)
    : current.end_time;

  await pool.query(
    `UPDATE promos SET
      promo_name = ?,
      description = ?,
      discount_type = ?,
      discount_value = ?,
      eligible_customer = ?,
      start_date = ?,
      end_date = ?,
      start_time = ?,
      end_time = ?,
      status = ?
     WHERE id = ?`,
    [
      updatedName,
      description !== undefined ? description : current.description,
      newDiscType,
      newDiscVal,
      eligibleCustomer !== undefined ? eligibleCustomer : current.eligible_customer,
      sDate,
      eDate,
      normalizedStartTime,
      normalizedEndTime,
      newStatus,
      id,
    ],
  );

  let historyAction = "Promo Updated";
  if (current.status !== "Active" && newStatus === "Active") historyAction = "Promo Activated";
  else if (current.status === "Active" && (newStatus === "Disabled" || newStatus === "Inactive")) historyAction = "Promo Deactivated";

  await pool.query(
    `INSERT INTO promo_history (promo_id, promo_name, action, performed_by, performed_by_name)
     VALUES (?, ?, ?, ?, ?)`,
    [id, updatedName, historyAction, req.user?.id || null, req.user?.fullname || "Administrator"],
  );

  await logAuditFromReq(
    req,
    "Update Promo",
    "Promos",
    `Administrator updated promo: ${updatedName}`,
  );

  const [rows] = await pool.query(`SELECT * FROM promos WHERE id = ?`, [id]);
  res.json(rows[0]);
}

export async function remove(req, res) {
  const { id } = req.params;
  const [before] = await pool.query(`SELECT * FROM promos WHERE id = ?`, [id]);
  if (!before.length) return res.status(404).json({ message: "Promo not found." });

  const promoName = before[0].promo_name;

  await pool.query(
    `INSERT INTO promo_history (promo_id, promo_name, action, performed_by, performed_by_name)
     VALUES (?, ?, 'Promo Deleted', ?, ?)`,
    [id, promoName, req.user?.id || null, req.user?.fullname || "Administrator"],
  );

  await pool.query(`DELETE FROM promos WHERE id = ?`, [id]);

  await logAuditFromReq(
    req,
    "Delete Promo",
    "Promos",
    `Administrator deleted promo: ${promoName}`,
  );

  res.json({ message: `Promo '${promoName}' deleted.` });
}

export async function history(_req, res) {
  const [rows] = await pool.query(
    `SELECT ph.*, o.id as order_number
     FROM promo_history ph
     LEFT JOIN orders o ON o.id = ph.order_id
     ORDER BY ph.created_at DESC LIMIT 500`,
  );
  res.json(rows);
}

export async function stats(_req, res) {
  await syncPromoStatuses();
  const [totalRows] = await pool.query(`SELECT COUNT(*) AS count FROM promos`);
  const [activeRows] = await pool.query(`SELECT COUNT(*) AS count FROM promos WHERE status = 'Active'`);
  const [expiredRows] = await pool.query(`SELECT COUNT(*) AS count FROM promos WHERE status = 'Expired'`);

  const today = getTodayString();
  const [usageTodayRows] = await pool.query(
    `SELECT COUNT(*) AS count FROM promo_history WHERE action = 'Promo Used' AND DATE(created_at) = ?`,
    [today],
  );

  res.json({
    totalPromos: totalRows[0].count,
    activePromos: activeRows[0].count,
    expiredPromos: expiredRows[0].count,
    usageToday: usageTodayRows[0].count,
  });
}
