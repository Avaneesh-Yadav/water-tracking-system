import pool from "../db/connection/connection";

export function dbq<T = any>(sql: string, params: any[] = []): Promise<T> {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T);
    });
  });
}

export function settingGet(key: string): Promise<string | null> {
  return dbq<any[]>("SELECT setting_value FROM app_settings WHERE setting_key = ?", [key]).then(
    (rows) => (rows[0]?.setting_value != null ? String(rows[0].setting_value) : null)
  );
}

export async function settingSet(key: string, value: string): Promise<void> {
  const now = new Date();
  await dbq(
    `INSERT INTO app_settings (setting_key, setting_value, updated_at)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = ?`,
    [key, value, now, value, now]
  );
}
