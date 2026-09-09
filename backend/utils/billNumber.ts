import { dbq, settingGet } from "./dbq";

export async function nextBillNumber(): Promise<string> {
  const prefix = (await settingGet("bill_prefix")) || "WB";
  const now = new Date();
  const period = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const key = period;
  await dbq(
    `INSERT INTO bill_sequences (period_key, last_n) VALUES (?, 1)
     ON DUPLICATE KEY UPDATE last_n = last_n + 1`,
    [key]
  );
  const rows = await dbq<any[]>("SELECT last_n FROM bill_sequences WHERE period_key = ?", [key]);
  const n = Number(rows[0]?.last_n) || 1;
  return `${prefix}/${period}/${String(n).padStart(5, "0")}`;
}
