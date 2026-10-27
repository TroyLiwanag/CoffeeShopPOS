USE corazondb;

-- Run once on existing databases (API seed also adds this column automatically)
ALTER TABLE employee_permissions
  ADD COLUMN can_manage_menu TINYINT(1) DEFAULT 0 AFTER can_manage_products;
