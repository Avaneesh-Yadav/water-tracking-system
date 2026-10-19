import { dbq, settingGet } from "./dbq";

export async function nextBillNumber(): Promise<string> {
  const prefix = (await settingGet("bill_prefix")) || "WB";
  const now = new Date();
  const period = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const key = period;
  // LAST_INSERT_ID() is per-connection, so the increment and the read must share
  // one statement — two queries let concurrent callers read the same value.
  await dbq(
    `INSERT INTO bill_sequences (period_key, last_n) VALUES (?, LAST_INSERT_ID(1))
     ON DUPLICATE KEY UPDATE last_n = LAST_INSERT_ID(last_n + 1)`,
    [key]
  );
  const rows = await dbq<any[]>("SELECT LAST_INSERT_ID() AS n");
  const n = Number(rows[0]?.n) || 1;
  return `${prefix}/${period}/${String(n).padStart(5, "0")}`;
}
