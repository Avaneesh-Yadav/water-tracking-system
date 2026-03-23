# Database migrations

## Fresh install (empty database)

Run **000_initial_full.sql** to create all tables and default settings in one go:

```bash
mysql -u YOUR_USER -p YOUR_DATABASE < backend/db/migrations/000_initial_full.sql
```

This creates:

| Table              | Model / purpose |
|--------------------|------------------|
| `users`            | User (id, uuid, full_name, mobile_number, password, role, address, status, connection_id, refresh_token, timestamps). `status` is VARCHAR(20) so ACTIVE/INACTIVE/PENDING work. |
| `water_consumption`| WaterConsumption (uuid, user_uuid, month, year, consumption_liters, rate_per_liter, amount, payment_status, timestamps). |
| `payments`         | Payment (uuid, user_uuid, consumption_uuid, amount, payment_method, transaction_id, upi_id, paid_at, created_at). |
| `app_settings`     | Settings (setting_key, setting_value, description, updated_at) + default rows (rate_per_liter, payee_name, organization_name, support_email, support_phone, bill_due_day, currency_display, unit_label, upi_id). |
| `audit_log`        | AuditLog (uuid, user_uuid, user_role, action, entity_type, entity_id, details, ip_address, created_at). |

---

## Existing database (incremental)

Use these only if you already have tables and need to add or fix something.

1. **001_audit_log.sql** – Creates only `audit_log` (if you don’t use 000_initial_full).

2. **002_users_status_inactive.sql** – If bulk status update fails with "Data truncated for column 'status'", run this so `users.status` accepts INACTIVE:

   ```bash
   mysql -u YOUR_USER -p YOUR_DATABASE < backend/db/migrations/002_users_status_inactive.sql
   ```
