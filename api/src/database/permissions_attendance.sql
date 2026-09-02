-- Run once on existing databases
ALTER TABLE employee_permissions
  ADD COLUMN can_manage_attendance TINYINT(1) DEFAULT 0 AFTER can_manage_sales;
