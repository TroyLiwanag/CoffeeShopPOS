USE corazondb;

CREATE TABLE IF NOT EXISTS shop_settings (
  id INT PRIMARY KEY DEFAULT 1,
  settings_json JSON NOT NULL,
  updated_by BIGINT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_settings_user
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

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
);
