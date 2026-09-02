import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { restoreBackupIfNeeded } from "./restoreBackup.js";

const DEFAULT_PRODUCTS = [
  { name: "V60 Single Origin (Hot)", category: "Coffee", price: 49, stock: 100 },
  { name: "Americano (Hot)", category: "Coffee", price: 65, stock: 100 },
  { name: "Cappuccino (Hot)", category: "Coffee", price: 85, stock: 100 },
  { name: "Cafe Latte (Hot)", category: "Coffee", price: 85, stock: 100 },
  { name: "Iced Choco", category: "Non-Coffee", price: 65, stock: 100 },
  { name: "Cappuccino Frappe", category: "Iced Blended", price: 120, stock: 100 },
  { name: "Fries (Plain/Cheese/Sour Cream/BBQ)", category: "Snacks", price: 90, stock: 50 },
  { name: "Shang-silog (Shanghai, Rice, Egg)", category: "Rice Meals", price: 70, stock: 30 },
];

const DEFAULT_MENU_ITEMS = [
  { name: "V60 Single Origin (Hot)", category: "Coffee", price: 49, stock: 100, icon: "coffee" },
  { name: "Americano (Hot)", category: "Coffee", price: 65, stock: 100, icon: "coffee" },
  { name: "Cappuccino (Hot)", category: "Coffee", price: 85, stock: 100, icon: "coffee" },
  { name: "Cafe Latte (Hot)", category: "Coffee", price: 85, stock: 100, icon: "coffee" },
  { name: "Cafe Mocha (Hot)", category: "Coffee", price: 95, stock: 100, icon: "coffee" },
  { name: "Caramel Macchiato (Hot)", category: "Coffee", price: 95, stock: 100, icon: "coffee" },
  { name: "Americano (Iced)", category: "Coffee", price: 65, stock: 100, icon: "coffee" },
  { name: "Cafe Latte (Iced)", category: "Coffee", price: 65, stock: 100, icon: "coffee" },
  { name: "Iced Choco", category: "Non-Coffee", price: 65, stock: 100, icon: "drinks" },
  { name: "Oreo Milk", category: "Non-Coffee", price: 65, stock: 100, icon: "drinks" },
  { name: "Strawberry Latte", category: "Non-Coffee", price: 65, stock: 100, icon: "drinks" },
  { name: "Cappuccino Frappe", category: "Iced Blended", price: 120, stock: 100, icon: "coffee" },
  { name: "Java Chip Frappe", category: "Iced Blended", price: 120, stock: 100, icon: "coffee" },
  { name: "Fries (Plain/Cheese/Sour Cream/BBQ)", category: "Snacks", price: 90, stock: 50, icon: "snacks" },
  { name: "Nachos", category: "Snacks", price: 95, stock: 50, icon: "snacks" },
  { name: "Shang-silog (Shanghai, Rice, Egg)", category: "Rice Meals", price: 70, stock: 30, icon: "rice" },
  { name: "Tapa-silog", category: "Rice Meals", price: 85, stock: 30, icon: "rice" },
  { name: "Longsilog", category: "Rice Meals", price: 80, stock: 30, icon: "rice" },
];

export async function ensureOrderItemsMenuColumn() {
  try {
    await pool.query(
      `ALTER TABLE order_items ADD COLUMN menu_item_id BIGINT NULL AFTER product_id`,
    );
    console.log("Added menu_item_id to order_items");
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
  try {
    await pool.query(`ALTER TABLE order_items MODIFY product_id BIGINT NULL`);
  } catch (err) {
    if (err.code !== "ER_BAD_FIELD_ERROR") throw err;
  }
  try {
    await pool.query(`ALTER TABLE order_items DROP FOREIGN KEY fk_orderitems_product`);
  } catch (err) {
    if (err.code !== "ER_CANT_DROP_FIELD_OR_KEY") throw err;
  }
  try {
    await pool.query(`
      ALTER TABLE order_items
      ADD CONSTRAINT fk_orderitems_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    `);
  } catch (err) {
    if (err.code !== "ER_DUP_KEYNAME" && err.code !== "ER_CANT_CREATE_TABLE") throw err;
  }
  try {
    await pool.query(`
      ALTER TABLE order_items
      ADD CONSTRAINT fk_orderitems_menu
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL
    `);
  } catch (err) {
    if (err.code !== "ER_DUP_KEYNAME" && err.code !== "ER_CANT_CREATE_TABLE") throw err;
  }
}

export async function ensureMenuPermissionColumn() {
  try {
    await pool.query(`
      ALTER TABLE employee_permissions
      ADD COLUMN can_manage_menu TINYINT(1) DEFAULT 0 AFTER can_manage_products
    `);
    console.log("Added can_manage_menu permission column");
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
}

export async function ensureAttendancePermissionColumn() {
  try {
    await pool.query(`
      ALTER TABLE employee_permissions
      ADD COLUMN can_manage_attendance TINYINT(1) DEFAULT 0 AFTER can_manage_sales
    `);
    console.log("Added can_manage_attendance permission column");
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
}

export async function ensureMenuTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      description TEXT NULL,
      price DECIMAL(10,2) NOT NULL,
      image VARCHAR(255) NULL,
      icon VARCHAR(100) NULL,
      stock INT DEFAULT 0,
      status ENUM('available','unavailable') DEFAULT 'available',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_menu_category (category),
      INDEX idx_menu_status (status),
      INDEX idx_menu_name (name)
    )
  `);
}

export async function ensureAttendanceTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      work_date DATE NOT NULL,
      clock_in DATETIME NULL,
      clock_out DATETIME NULL,
      hours_worked DECIMAL(6,2) NOT NULL DEFAULT 0,
      overtime_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
      notes VARCHAR(255) NULL,
      recorded_by BIGINT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_attendance_user_date (user_id, work_date),
      CONSTRAINT fk_attendance_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_attendance_recorded_by
        FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_attendance_work_date (work_date)
    )
  `);
}

export async function ensurePayrollRatesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payroll_rates (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL UNIQUE,
      hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 80.00,
      updated_by BIGINT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_payroll_rates_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_payroll_rates_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
}

export async function ensureAuditTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NULL,
      user_name VARCHAR(255),
      action_type VARCHAR(100) NOT NULL,
      module_name VARCHAR(100) NOT NULL,
      description TEXT,
      ip_address VARCHAR(100),
      device_info TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_audit_user_id (user_id),
      INDEX idx_audit_action_type (action_type),
      INDEX idx_audit_module_name (module_name),
      INDEX idx_audit_created_at (created_at)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_settings (
      id INT PRIMARY KEY DEFAULT 1,
      settings_json JSON NOT NULL,
      updated_by BIGINT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_settings_user
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
}

export async function ensurePasswordResetTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_codes (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      code_hash VARCHAR(255) NOT NULL,
      code_plain VARCHAR(50) NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      generated_by BIGINT NULL,
      generated_by_name VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_reset_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_reset_user (user_id),
      INDEX idx_reset_expires (expires_at)
    )
  `);
}

export async function ensurePasswordResetColumns() {
  try {
    await pool.query(`ALTER TABLE password_reset_codes ADD COLUMN code_plain VARCHAR(50) NULL AFTER code_hash`);
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
  try {
    await pool.query(`ALTER TABLE password_reset_codes ADD COLUMN generated_by BIGINT NULL AFTER used_at`);
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
  try {
    await pool.query(`ALTER TABLE password_reset_codes ADD COLUMN generated_by_name VARCHAR(255) NULL AFTER generated_by`);
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
}

export async function ensureVerificationCodePermissionColumn() {
  try {
    await pool.query(`
      ALTER TABLE employee_permissions
      ADD COLUMN can_manage_verification_codes TINYINT(1) DEFAULT 0 AFTER can_manage_promos
    `);
    console.log("Added can_manage_verification_codes permission column");
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
}

export async function ensurePromosPermissionColumn() {
  try {
    await pool.query(`
      ALTER TABLE employee_permissions
      ADD COLUMN can_manage_promos TINYINT(1) DEFAULT 1 AFTER can_export_reports
    `);
    console.log("Added can_manage_promos permission column");
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
}

export async function ensureOrderPromoColumns() {
  try {
    await pool.query(`ALTER TABLE orders ADD COLUMN promo_id BIGINT NULL AFTER payment_method`);
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
  try {
    await pool.query(`ALTER TABLE orders ADD COLUMN promo_name VARCHAR(255) NULL AFTER promo_id`);
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
  try {
    await pool.query(`ALTER TABLE orders ADD COLUMN promo_discount_amount DECIMAL(10,2) DEFAULT 0.00 AFTER promo_name`);
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
}

export async function ensurePromosTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS promos (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      promo_name VARCHAR(191) NOT NULL UNIQUE,
      description TEXT NULL,
      discount_type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
      discount_value DECIMAL(10,2) NOT NULL,
      eligible_customer VARCHAR(100) NOT NULL DEFAULT 'Everyone',
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      start_time TIME NULL,
      end_time TIME NULL,
      status ENUM('Active', 'Inactive', 'Expired', 'Scheduled', 'Disabled') NOT NULL DEFAULT 'Active',
      created_by BIGINT NULL,
      created_by_name VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_promo_status (status),
      INDEX idx_promo_dates (start_date, end_date)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS promo_history (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      promo_id BIGINT NULL,
      promo_name VARCHAR(255) NOT NULL,
      action VARCHAR(100) NOT NULL,
      performed_by BIGINT NULL,
      performed_by_name VARCHAR(255) NULL,
      order_id BIGINT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ph_promo_id (promo_id),
      INDEX idx_ph_order_id (order_id),
      INDEX idx_ph_created_at (created_at)
    )
  `);
}

export async function seedSamplePromo() {
  const [existing] = await pool.query("SELECT id FROM promos WHERE promo_name = ?", ["Happy Father's Day"]);
  if (existing.length === 0) {
    const [res] = await pool.query(`
      INSERT INTO promos (
        promo_name, description, discount_type, discount_value, eligible_customer,
        start_date, end_date, start_time, end_time, status, created_by_name
      ) VALUES (?, ?, 'percentage', 20.00, 'Fathers', '2026-06-01', '2026-12-31', '08:00:00', '22:00:00', 'Active', 'Administrator')
    `, ["Happy Father's Day", "Celebrate Father's Day with a special discount."]);

    await pool.query(`
      INSERT INTO promo_history (promo_id, promo_name, action, performed_by_name)
      VALUES (?, ?, 'Promo Created', 'Administrator')
    `, [res.insertId, "Happy Father's Day"]);

    console.log("Sample promo 'Happy Father\\'s Day' seeded successfully");
  }
}

export async function ensureUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      fullname VARCHAR(255) NOT NULL,
      email VARCHAR(191) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin','staff') NOT NULL DEFAULT 'staff',
      status ENUM('active','inactive') DEFAULT 'active',
      profile_image TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

export async function ensureEmployeePermissionsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employee_permissions (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      can_view_dashboard TINYINT(1) DEFAULT 1,
      can_manage_users TINYINT(1) DEFAULT 0,
      can_manage_products TINYINT(1) DEFAULT 0,
      can_manage_menu TINYINT(1) DEFAULT 0,
      can_manage_orders TINYINT(1) DEFAULT 0,
      can_manage_inventory TINYINT(1) DEFAULT 0,
      can_manage_sales TINYINT(1) DEFAULT 0,
      can_manage_attendance TINYINT(1) DEFAULT 0,
      can_manage_reports TINYINT(1) DEFAULT 0,
      can_manage_settings TINYINT(1) DEFAULT 0,
      can_export_reports TINYINT(1) DEFAULT 0,
      can_manage_promos TINYINT(1) DEFAULT 0,
      can_manage_verification_codes TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_permissions_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

export async function ensureProductsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(255),
      price DECIMAL(10,2) NOT NULL,
      stock INT DEFAULT 0,
      image TEXT NULL,
      status ENUM('available','unavailable') DEFAULT 'available',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

export async function ensureOrdersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(255),
      total_amount DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(100),
      order_status ENUM('pending','completed','cancelled') DEFAULT 'pending',
      created_by BIGINT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_order_user
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
}

export async function ensureOrderItemsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT NOT NULL,
      product_id BIGINT NULL,
      menu_item_id BIGINT NULL,
      quantity INT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      CONSTRAINT fk_orderitems_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);
}

export async function ensureInventoryLogsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      product_id BIGINT NOT NULL,
      action_type VARCHAR(100),
      quantity INT,
      performed_by BIGINT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_inventory_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      CONSTRAINT fk_inventory_user
        FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
}

export async function ensureSalesReportsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales_reports (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      total_sales DECIMAL(10,2),
      total_orders INT,
      generated_by BIGINT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_reports_user
        FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
}

export async function ensureInventoryItemsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      stock DECIMAL(10,2) NOT NULL DEFAULT 0,
      min DECIMAL(10,2) NOT NULL DEFAULT 0,
      unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
      category VARCHAR(50) NOT NULL DEFAULT 'Ingredient',
      batch_no VARCHAR(100) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const [rows] = await pool.query("SELECT id FROM inventory_items LIMIT 1");
  if (rows.length === 0) {
    const defaultItems = [
      { id: "i1", name: "Coffee Beans", stock: 4200, min: 1500, unit: "g", category: "Ingredient", batchNo: "2026-12-31" },
      { id: "i2", name: "Whole Milk", stock: 8, min: 5, unit: "L", category: "Ingredient", batchNo: "2026-09-15" },
      { id: "i3", name: "Oat Milk", stock: 2, min: 4, unit: "L", category: "Ingredient", batchNo: "2026-09-20" },
      { id: "i4", name: "Almond Milk", stock: 3, min: 4, unit: "L", category: "Ingredient", batchNo: "2026-09-25" },
      { id: "i5", name: "Sugar", stock: 5200, min: 1000, unit: "g", category: "Ingredient", batchNo: "2027-01-01" },
      { id: "i6", name: "Chocolate Syrup", stock: 1.2, min: 1, unit: "L", category: "Ingredient", batchNo: "2026-11-30" },
      { id: "i7", name: "Matcha Powder", stock: 180, min: 200, unit: "g", category: "Ingredient", batchNo: "2026-10-15" },
      { id: "i8", name: "Tea Bags", stock: 320, min: 100, unit: "pcs", category: "Ingredient", batchNo: "2026-12-01" },
      { id: "i9", name: "Pastries", stock: 24, min: 10, unit: "pcs", category: "Ingredient", batchNo: "2026-08-30" },
      { id: "f1", name: "Dining Tables", stock: 8, min: 8, unit: "units", category: "Furniture", batchNo: null },
      { id: "f2", name: "Dining Chairs", stock: 24, min: 20, unit: "units", category: "Furniture", batchNo: null },
      { id: "f3", name: "Bar Stools", stock: 6, min: 4, unit: "units", category: "Furniture", batchNo: null },
      { id: "f4", name: "Display Shelves", stock: 3, min: 2, unit: "units", category: "Furniture", batchNo: null },
      { id: "u1u", name: "Ceramic Cups", stock: 48, min: 30, unit: "pcs", category: "Utensil", batchNo: null },
      { id: "u2u", name: "Glass Mugs", stock: 36, min: 24, unit: "pcs", category: "Utensil", batchNo: null },
      { id: "u3u", name: "Spoons", stock: 60, min: 30, unit: "pcs", category: "Utensil", batchNo: null },
      { id: "u4u", name: "Forks", stock: 60, min: 30, unit: "pcs", category: "Utensil", batchNo: null },
      { id: "u5u", name: "Serving Trays", stock: 12, min: 8, unit: "pcs", category: "Utensil", batchNo: null },
    ];
    for (const item of defaultItems) {
      await pool.query(
        `INSERT INTO inventory_items (id, name, stock, min, unit, category, batch_no)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [item.id, item.name, item.stock, item.min, item.unit, item.category, item.batchNo || null],
      );
    }
    console.log("Default inventory items seeded");
  }
}

export async function seedDatabase() {
  await ensureUsersTable();
  await ensureEmployeePermissionsTable();
  await ensureProductsTable();
  await ensureOrdersTable();
  await ensureOrderItemsTable();
  await ensureInventoryLogsTable();
  await ensureInventoryItemsTable();

  await ensureSalesReportsTable();
  await ensureAuditTable();
  await ensureMenuPermissionColumn();
  await ensureAttendancePermissionColumn();
  await ensurePromosPermissionColumn();
  await ensureVerificationCodePermissionColumn();
  await ensureOrderPromoColumns();
  await ensurePromosTables();
  await ensureMenuTable();
  await ensurePayrollRatesTable();
  await ensureAttendanceTable();
  await ensureOrderItemsMenuColumn();
  await ensurePasswordResetTable();
  await ensurePasswordResetColumns();
  await seedSamplePromo();

  const [users] = await pool.query("SELECT id FROM users WHERE email = ?", [
    "admin@gmail.com",
  ]);
  if (users.length === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    const [result] = await pool.query(
      `INSERT INTO users (fullname, email, password, role, status)
       VALUES (?, ?, ?, 'admin', 'active')`,
      ["Administrator", "admin@gmail.com", hash],
    );
    const adminId = result.insertId;
    await pool.query(
      `INSERT INTO employee_permissions (
        user_id, can_view_dashboard, can_manage_users, can_manage_products,
        can_manage_menu, can_manage_orders, can_manage_inventory, can_manage_sales,
        can_manage_reports, can_manage_settings, can_export_reports, can_manage_promos,
        can_manage_verification_codes
      ) VALUES (?, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)`,
      [adminId],
    );
    console.log("Default admin created: admin@gmail.com / admin123");
  }

  const [products] = await pool.query("SELECT id FROM products LIMIT 1");
  if (products.length === 0) {
    for (const p of DEFAULT_PRODUCTS) {
      await pool.query(
        `INSERT INTO products (name, category, price, stock, status) VALUES (?, ?, ?, ?, 'available')`,
        [p.name, p.category, p.price, p.stock],
      );
    }
    console.log("Sample products seeded");
  }

  const [menu] = await pool.query("SELECT id FROM menu_items LIMIT 1");
  if (menu.length === 0) {
    for (const m of DEFAULT_MENU_ITEMS) {
      await pool.query(
        `INSERT INTO menu_items (name, category, price, stock, icon, status)
         VALUES (?, ?, ?, ?, ?, 'available')`,
        [m.name, m.category, m.price, m.stock, m.icon],
      );
    }
    console.log("Sample menu items seeded");
  }

  await restoreBackupIfNeeded();
}
