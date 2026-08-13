-- =============================================================================
-- AquaFlow Water Management – FULL INITIAL SCHEMA
-- Run this on an EMPTY database to create all tables and default settings.
-- Usage: mysql -u USER -p DATABASE_NAME < backend/db/migrations/000_initial_full.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. USERS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(15) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'USER', 'SUPER_ADMIN') NOT NULL DEFAULT 'USER',
    address TEXT,
    status ENUM('ACTIVE', 'DELETED', 'REVOKE') NOT NULL DEFAULT 'ACTIVE',
    connection_id VARCHAR(36) UNIQUE,
    refresh_token TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_uuid (uuid),
    INDEX idx_mobile (mobile_number),
    INDEX idx_connection_id (connection_id),
    INDEX idx_updated_at (updated_at)
);

-- -----------------------------------------------------------------------------
-- 2. WATER_CONSUMPTION
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS water_consumption (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    user_uuid VARCHAR(36) NOT NULL,
    month VARCHAR(20) NOT NULL,
    year INT NOT NULL,
    consumption_liters DECIMAL(12,2) NOT NULL,
    previous_meter_reading DECIMAL(14,3) NULL DEFAULT NULL,
    current_meter_reading DECIMAL(14,3) NULL DEFAULT NULL,
    meter_photo_path VARCHAR(512) NULL DEFAULT NULL,
    rate_per_liter DECIMAL(10,2) NOT NULL DEFAULT 20.00,
    amount DECIMAL(12,2) NOT NULL,
    payment_status ENUM('PAID', 'UNPAID') NOT NULL DEFAULT 'UNPAID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_uuid) REFERENCES users(uuid) ON DELETE CASCADE,
    INDEX idx_user_uuid (user_uuid),
    INDEX idx_payment_status (payment_status),
    INDEX idx_year_month (year, month),
    INDEX idx_created_at (created_at)
);

-- -----------------------------------------------------------------------------
-- 3. PAYMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    user_uuid VARCHAR(36) NOT NULL,
    consumption_uuid VARCHAR(36) NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'UPI',
    transaction_id VARCHAR(100) NULL,
    upi_id VARCHAR(100) NULL,
    paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_uuid) REFERENCES users(uuid) ON DELETE CASCADE,
    FOREIGN KEY (consumption_uuid) REFERENCES water_consumption(uuid) ON DELETE SET NULL,
    INDEX idx_user_uuid (user_uuid),
    INDEX idx_consumption_uuid (consumption_uuid),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_paid_at (paid_at)
);

-- -----------------------------------------------------------------------------
-- 4. APP_SETTINGS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description VARCHAR(255) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Default settings (safe to run multiple times)
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
('rate_per_liter', '20.00', 'Default rate per liter in INR'),
('payee_name', 'Water Supply', 'Name displayed on UPI payment screen'),
('organization_name', 'Water Supply', 'Organization name for bills and app'),
('support_email', '', 'Support email for customers'),
('support_phone', '', 'Support phone for customers'),
('bill_due_day', '10', 'Day of month by which bill is due (1-28)'),
('currency_display', 'INR', 'Currency code or symbol for display'),
('unit_label', 'Liters', 'Unit label for consumption (e.g. Liters, Gallons)'),
('upi_id', '', 'UPI ID for receiving payments')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- -----------------------------------------------------------------------------
-- 5. AUDIT_LOG
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL,
    user_uuid VARCHAR(36) NOT NULL,
    user_role VARCHAR(20) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NULL,
    entity_id VARCHAR(36) NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_user (user_uuid),
    INDEX idx_audit_action (action),
    INDEX idx_audit_created (created_at)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  user_id VARCHAR(36) NOT NULL,
  notification_details TEXT NOT NULL,
  related_to VARCHAR(64) NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_related_to (related_to),
  INDEX idx_notifications_is_read (is_read),
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(uuid)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

ALTER TABLE water_consumption
  ADD COLUMN previous_meter_reading DECIMAL(14,3) NULL DEFAULT NULL,
  ADD COLUMN current_meter_reading DECIMAL(14,3) NULL DEFAULT NULL,
  ADD COLUMN meter_photo_path VARCHAR(512) NULL DEFAULT NULL;
-- =============================================================================
-- END – All models (users, water_consumption, payments, app_settings, audit_log)
-- are now created with default data in app_settings.
-- =============================================================================
