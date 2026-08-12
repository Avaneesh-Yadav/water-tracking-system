-- Password reset OTP storage (replaces in-memory Map)
-- Usage: mysql -u USER -p DATABASE < backend/db/migrations/003_password_reset_otps.sql

CREATE TABLE IF NOT EXISTS password_reset_otps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mobile_number VARCHAR(15) NOT NULL,
    user_uuid VARCHAR(36) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    reset_key VARCHAR(64) NULL DEFAULT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    is_verified TINYINT(1) NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_password_reset_mobile (mobile_number),
    INDEX idx_password_reset_expires (expires_at),
    INDEX idx_password_reset_user (user_uuid),
    CONSTRAINT fk_password_reset_user
        FOREIGN KEY (user_uuid) REFERENCES users(uuid)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;
