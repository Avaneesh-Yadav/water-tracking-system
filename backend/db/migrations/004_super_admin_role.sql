-- Add SUPER_ADMIN to users.role
-- Usage: mysql -u USER -p DATABASE < backend/db/migrations/004_super_admin_role.sql

ALTER TABLE users
    MODIFY role ENUM('ADMIN', 'USER', 'SUPER_ADMIN') NOT NULL DEFAULT 'USER';
