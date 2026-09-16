-- Café Corazon POS - Safe Production Database Schema-Only Migration
-- Created: 2026-09-14
-- IMPORTANT: THIS SCRIPT ONLY ADDS/MODIFIES STRUCTURE AND DOES NOT DELETE ANY DATA.

START TRANSACTION;

-- 1. Create New Tables if they don't exist
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  INDEX idx_attendance_work_date (work_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payroll_rates (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 80.00,
  updated_by BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  INDEX idx_audit_user_id (user_id),
  INDEX idx_audit_action_type (action_type),
  INDEX idx_audit_module_name (module_name),
  INDEX idx_audit_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS shop_settings (
  id INT PRIMARY KEY DEFAULT 1,
  settings_json JSON NOT NULL,
  updated_by BIGINT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  INDEX idx_reset_user (user_id),
  INDEX idx_reset_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Add New Columns to Existing Tables (Stored Procedure Strategy for Safe Idempotency)

DELIMITER $$

DROP PROCEDURE IF EXISTS PerformSafeSchemaMigration $$
CREATE PROCEDURE PerformSafeSchemaMigration()
BEGIN
  -- Add promo columns to orders
  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'promo_id') THEN
    ALTER TABLE orders ADD COLUMN promo_id BIGINT NULL AFTER payment_method;
  END IF;

  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'promo_name') THEN
    ALTER TABLE orders ADD COLUMN promo_name VARCHAR(255) NULL AFTER promo_id;
  END IF;

  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'promo_discount_amount') THEN
    ALTER TABLE orders ADD COLUMN promo_discount_amount DECIMAL(10,2) DEFAULT 0.00 AFTER promo_name;
  END IF;

  -- Add discount details to orders
  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'discount_type') THEN
    ALTER TABLE orders ADD COLUMN discount_type VARCHAR(50) DEFAULT 'None';
  END IF;

  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'discount_amount') THEN
    ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'discount_rate') THEN
    ALTER TABLE orders ADD COLUMN discount_rate DECIMAL(5,2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'discount_id_number') THEN
    ALTER TABLE orders ADD COLUMN discount_id_number VARCHAR(100) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'beneficiary_name') THEN
    ALTER TABLE orders ADD COLUMN beneficiary_name VARCHAR(255) DEFAULT NULL;
  END IF;

  -- Modify order_status and payment_status to VARCHAR so 'voided' status is never truncated
  ALTER TABLE orders MODIFY COLUMN order_status VARCHAR(50) DEFAULT 'completed';
  ALTER TABLE orders MODIFY COLUMN payment_status VARCHAR(50) DEFAULT 'paid';

  -- Add void audit columns to orders
  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'voided_by') THEN
    ALTER TABLE orders ADD COLUMN voided_by BIGINT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'voided_by_name') THEN
    ALTER TABLE orders ADD COLUMN voided_by_name VARCHAR(255) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'voided_at') THEN
    ALTER TABLE orders ADD COLUMN voided_at DATETIME DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'void_reason') THEN
    ALTER TABLE orders ADD COLUMN void_reason TEXT DEFAULT NULL;
  END IF;

  -- Add menu_item_id, options_json, base_price, item_total to order_items
  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'order_items' AND column_name = 'menu_item_id') THEN
    ALTER TABLE order_items ADD COLUMN menu_item_id BIGINT NULL AFTER product_id;
  END IF;

  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'order_items' AND column_name = 'options_json') THEN
    ALTER TABLE order_items ADD COLUMN options_json TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'order_items' AND column_name = 'base_price') THEN
    ALTER TABLE order_items ADD COLUMN base_price DECIMAL(10,2) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'order_items' AND column_name = 'item_total') THEN
    ALTER TABLE order_items ADD COLUMN item_total DECIMAL(10,2) DEFAULT NULL;
  END IF;

  -- Add permission columns to employee_permissions
  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employee_permissions' AND column_name = 'can_manage_menu') THEN
    ALTER TABLE employee_permissions ADD COLUMN can_manage_menu TINYINT(1) DEFAULT 0 AFTER can_manage_products;
  END IF;

  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employee_permissions' AND column_name = 'can_manage_attendance') THEN
    ALTER TABLE employee_permissions ADD COLUMN can_manage_attendance TINYINT(1) DEFAULT 0 AFTER can_manage_sales;
  END IF;

  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employee_permissions' AND column_name = 'can_manage_promos') THEN
    ALTER TABLE employee_permissions ADD COLUMN can_manage_promos TINYINT(1) DEFAULT 1 AFTER can_export_reports;
  END IF;

  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'employee_permissions' AND column_name = 'can_manage_verification_codes') THEN
    ALTER TABLE employee_permissions ADD COLUMN can_manage_verification_codes TINYINT(1) DEFAULT 0 AFTER can_manage_promos;
  END IF;

  -- Add batch_no to inventory_items
  IF NOT EXISTS (SELECT * FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'inventory_items' AND column_name = 'batch_no') THEN
    ALTER TABLE inventory_items ADD COLUMN batch_no VARCHAR(100) NULL AFTER category;
  END IF;
END $$

DELIMITER ;

CALL PerformSafeSchemaMigration();

DROP PROCEDURE IF EXISTS PerformSafeSchemaMigration;

COMMIT;
