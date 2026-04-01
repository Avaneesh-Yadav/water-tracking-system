-- Meter readings + optional photo path for water_consumption.
-- Run once: mysql -u USER -p DB_NAME < backend/db/migrations/002_meter_readings.sql
-- If a column already exists, remove that line and re-run.

ALTER TABLE water_consumption
  ADD COLUMN previous_meter_reading DECIMAL(14,3) NULL DEFAULT NULL,
  ADD COLUMN current_meter_reading DECIMAL(14,3) NULL DEFAULT NULL,
  ADD COLUMN meter_photo_path VARCHAR(512) NULL DEFAULT NULL;
