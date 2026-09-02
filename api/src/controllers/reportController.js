import pool from "../config/db.js";
import { logAuditFromReq } from "../utils/auditLogger.js";

/** Always return YYYY-MM-DD for chart labels (mysql2 may send Date objects). */
function formatDayKey(day) {
  if (!day) return "";
  if (day instanceof Date && !Number.isNaN(day.getTime())) {
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, "0");
    const d = String(day.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(day);
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : s.slice(0, 10);
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(12, 0, 0, 0);
  return monday;
}

function fillWeeklySeries(rows, numWeeks = 8) {
  const currentMonday = getMonday(new Date());

  const result = [];
  const startMonday = new Date(currentMonday);
  startMonday.setDate(startMonday.getDate() - (numWeeks - 1) * 7);

  for (let w = 0; w < numWeeks; w++) {
    const monday = new Date(startMonday);
    monday.setDate(monday.getDate() + w * 7);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const monMonth = monday.toLocaleDateString("en-US", { month: "short" });
    const monDay = monday.getDate();

    const sunMonth = sunday.toLocaleDateString("en-US", { month: "short" });
    const sunDay = sunday.getDate();

    let label = "";
    if (monMonth === sunMonth) {
      label = `${monMonth} ${monDay}–${sunDay}`;
    } else {
      label = `${monMonth} ${monDay}–${sunMonth} ${sunDay}`;
    }

    const fullLabel = `${monday.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

    let sales = 0;
    let orders = 0;

    for (const r of rows) {
      const rDate = new Date(r.day_key || r.day);
      rDate.setHours(12, 0, 0, 0);
      if (rDate >= monday && rDate <= sunday) {
        sales += Number(r.sales) || 0;
        orders += Number(r.orders) || 0;
      }
    }

    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, "0");
    const d = String(monday.getDate()).padStart(2, "0");

    result.push({
      day: `${y}-${m}-${d}`,
      label,
      fullLabel,
      sales,
      orders,
    });
  }

  return result;
}

function fillDailySeries(rows, numDays) {
  const map = new Map();
  for (const r of rows) {
    const key = formatDayKey(r.day_key);
    map.set(key, r);
  }

  const result = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dayNum = String(d.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${dayNum}`;

    if (map.has(key)) {
      const row = map.get(key);
      result.push({
        day: key,
        label: String(row.label),
        fullLabel: String(row.full_label),
        sales: Number(row.sales),
        orders: Number(row.orders),
      });
    } else {
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const fullLabel = d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      result.push({
        day: key,
        label,
        fullLabel,
        sales: 0,
        orders: 0,
      });
    }
  }

  return result;
}

function fillMonthlySeries(rows) {
  const map = new Map();
  for (const r of rows) {
    const monthNum = Number(r.day_key);
    map.set(monthNum, r);
  }

  const MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const MONTH_FULL_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = new Date().getFullYear();
  const result = [];

  for (let m = 1; m <= 12; m++) {
    if (map.has(m)) {
      const row = map.get(m);
      result.push({
        day: `${currentYear}-${String(m).padStart(2, "0")}`,
        label: MONTH_NAMES[m - 1],
        fullLabel: `${MONTH_FULL_NAMES[m - 1]} ${currentYear}`,
        sales: Number(row.sales),
        orders: Number(row.orders),
      });
    } else {
      result.push({
        day: `${currentYear}-${String(m).padStart(2, "0")}`,
        label: MONTH_NAMES[m - 1],
        fullLabel: `${MONTH_FULL_NAMES[m - 1]} ${currentYear}`,
        sales: 0,
        orders: 0,
      });
    }
  }

  return result;
}

export async function summary(req, res) {
  const rangeParam = String(req.query.range || "").trim().toLowerCase();
  const rawDays = Number(req.query.days);

  let range = "Daily";
  if (rangeParam === "daily" || rawDays === 1) {
    range = "Daily";
  } else if (rangeParam === "weekly" || rawDays === 7) {
    range = "Weekly";
  } else if (rangeParam === "monthly" || rawDays === 30) {
    range = "Monthly";
  } else if (rangeParam === "quarterly" || rawDays === 90) {
    range = "Quarterly";
  } else if (rangeParam === "yearly" || rawDays === 365) {
    range = "Yearly";
  } else if (rangeParam === "all-time" || rangeParam === "alltime" || (!rangeParam && !rawDays)) {
    range = "All-Time";
  }

  let dateWhereSql = "";
  let selectLabelSql = "";
  let groupBySql = "";
  let orderBySql = "ORDER BY day_key ASC";

  if (range === "Daily") {
    dateWhereSql = "AND o.created_at >= CURDATE()";
    selectLabelSql =
      "DATE_FORMAT(o.created_at, '%H:00') AS day_key, DATE_FORMAT(o.created_at, '%h %p') AS label, DATE_FORMAT(o.created_at, '%W, %M %d, %Y - %h:00 %p') AS full_label";
    groupBySql =
      "GROUP BY DATE_FORMAT(o.created_at, '%H:00'), DATE_FORMAT(o.created_at, '%h %p'), DATE_FORMAT(o.created_at, '%W, %M %d, %Y - %h:00 %p')";
  } else if (range === "Weekly") {
    dateWhereSql = "AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)";
    selectLabelSql =
      "DATE(o.created_at) AS day_key, DATE_FORMAT(o.created_at, '%b %d') AS label, DATE_FORMAT(o.created_at, '%W, %M %d, %Y') AS full_label";
    groupBySql =
      "GROUP BY DATE(o.created_at), DATE_FORMAT(o.created_at, '%b %d'), DATE_FORMAT(o.created_at, '%W, %M %d, %Y')";
  } else if (range === "Monthly") {
    dateWhereSql = "AND YEAR(o.created_at) = YEAR(CURDATE())";
    selectLabelSql =
      "MONTH(o.created_at) AS day_key, DATE_FORMAT(o.created_at, '%b') AS label, DATE_FORMAT(o.created_at, '%M %Y') AS full_label";
    groupBySql =
      "GROUP BY MONTH(o.created_at), DATE_FORMAT(o.created_at, '%b'), DATE_FORMAT(o.created_at, '%M %Y')";
  } else if (range === "Quarterly") {
    dateWhereSql = "AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)";
    selectLabelSql =
      "DATE_FORMAT(o.created_at, '%Y-%m') AS day_key, DATE_FORMAT(o.created_at, '%b %Y') AS label, DATE_FORMAT(o.created_at, '%M %Y') AS full_label";
    groupBySql =
      "GROUP BY DATE_FORMAT(o.created_at, '%Y-%m'), DATE_FORMAT(o.created_at, '%b %Y'), DATE_FORMAT(o.created_at, '%M %Y')";
  } else if (range === "Yearly") {
    dateWhereSql = "";
    selectLabelSql =
      "CAST(YEAR(o.created_at) AS CHAR) AS day_key, CAST(YEAR(o.created_at) AS CHAR) AS label, CONCAT('Year ', YEAR(o.created_at)) AS full_label";
    groupBySql = "GROUP BY YEAR(o.created_at)";
  } else {
    // All-Time
    dateWhereSql = "";
    selectLabelSql =
      "CAST(YEAR(o.created_at) AS CHAR) AS day_key, CAST(YEAR(o.created_at) AS CHAR) AS label, CONCAT('Year ', YEAR(o.created_at)) AS full_label";
    groupBySql = "GROUP BY YEAR(o.created_at)";
  }

  const [sales] = await pool.query(
    `SELECT COALESCE(SUM(o.total_amount), 0) AS total_sales,
            COUNT(*) AS total_orders,
            COALESCE(SUM(o.total_amount * (12 / 112)), 0) AS vat_total,
            COALESCE(SUM(o.promo_discount_amount), 0) AS discount_total
     FROM orders o
     WHERE o.order_status = 'completed' ${dateWhereSql}`,
  );

  const [byDay] = await pool.query(
    `SELECT ${selectLabelSql},
            SUM(o.total_amount) AS sales,
            COUNT(*) AS orders
     FROM orders o
     WHERE o.order_status = 'completed' ${dateWhereSql}
     ${groupBySql}
     ${orderBySql}`,
  );

  const [topProducts] = await pool.query(
    `SELECT COALESCE(m.name, p.name, 'Unknown Item') AS name,
            SUM(oi.quantity) AS qty,
            SUM(oi.quantity * oi.price) AS revenue
     FROM order_items oi
     LEFT JOIN products p ON p.id = oi.product_id
     LEFT JOIN menu_items m ON m.id = oi.menu_item_id
     JOIN orders o ON o.id = oi.order_id AND o.order_status = 'completed'
     WHERE 1=1 ${dateWhereSql}
     GROUP BY COALESCE(m.name, p.name, 'Unknown Item')
     ORDER BY revenue DESC
     LIMIT 10`,
  );

  let formattedByDay = [];
  if (range === "Weekly") {
    formattedByDay = fillWeeklySeries(byDay, 8);
  } else if (range === "Monthly") {
    formattedByDay = fillMonthlySeries(byDay);
  } else {
    formattedByDay = byDay.map((row) => ({
      day: String(row.day_key),
      label: String(row.label),
      fullLabel: String(row.full_label),
      sales: Number(row.sales),
      orders: Number(row.orders),
    }));
  }

  res.json({
    debugRange: range,
    debugRangeParam: rangeParam,
    totalSales: Number(sales[0].total_sales),
    totalOrders: Number(sales[0].total_orders),
    vatTotal: Number(sales[0].vat_total),
    discountTotal: Number(sales[0].discount_total),
    byDay: formattedByDay,
    topProducts,
  });
}

export async function generate(req, res) {
  const [sales] = await pool.query(
    `SELECT COALESCE(SUM(total_amount), 0) AS total_sales, COUNT(*) AS total_orders
     FROM orders WHERE order_status = 'completed'`,
  );
  const [result] = await pool.query(
    `INSERT INTO sales_reports (total_sales, total_orders, generated_by) VALUES (?, ?, ?)`,
    [sales[0].total_sales, sales[0].total_orders, req.user.id],
  );
  const [rows] = await pool.query(`SELECT * FROM sales_reports WHERE id = ?`, [result.insertId]);
  await logAuditFromReq(
    req,
    "Generate Report",
    "Reports",
    `Sales report #${result.insertId} — ₱${sales[0].total_sales} / ${sales[0].total_orders} orders`,
  );
  res.status(201).json(rows[0]);
}

export async function listReports(req, res) {
  const [rows] = await pool.query(
    `SELECT sr.*, u.fullname AS generated_by_name
     FROM sales_reports sr
     LEFT JOIN users u ON u.id = sr.generated_by
     ORDER BY sr.created_at DESC`,
  );
  res.json(rows);
}

export async function logExport(req, res) {
  const { reportType, details } = req.body;
  await logAuditFromReq(
    req,
    "Export Report",
    "Reports",
    details || `Exported ${reportType || "report"}`,
  );
  res.json({ success: true });
}
