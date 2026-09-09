import axiosInstance from "@/utils/axiosInstance";

export const opsApi = {
  settings: () => axiosInstance.get("/admin/ops/settings").then((r) => r.data),
  saveSettings: (data: Record<string, unknown>) => axiosInstance.put("/admin/ops/settings", data).then((r) => r.data),
  billRun: (month: string, year: number) => axiosInstance.post("/admin/ops/bill-run", { month, year }).then((r) => r.data),
  lateFees: () => axiosInstance.post("/admin/ops/late-fees").then((r) => r.data),
  creditNote: (consumption_uuid: string, amount: number, note: string) =>
    axiosInstance.post("/admin/ops/credit-note", { consumption_uuid, amount, note }).then((r) => r.data),
  deposit: (user_uuid: string, amount: number, note?: string) =>
    axiosInstance.post("/admin/ops/deposit", { user_uuid, amount, note }).then((r) => r.data),
  payFromDeposit: (consumption_uuid: string) =>
    axiosInstance.post("/admin/ops/pay-from-deposit", { consumption_uuid }).then((r) => r.data),
  printPack: (ward?: string) => axiosInstance.get("/admin/ops/print-pack", { params: ward ? { ward } : {} }).then((r) => r.data),
  boardPack: () => axiosInstance.get("/admin/ops/board-pack").then((r) => r.data),
  reminders: () => axiosInstance.post("/admin/ops/reminders").then((r) => r.data),
  extraConnection: (data: { parent_user_uuid: string; address?: string; ward?: string; mobile_number: string }) =>
    axiosInstance.post("/admin/ops/extra-connection", data).then((r) => r.data),
  applications: () => axiosInstance.get("/admin/ops/applications").then((r) => r.data),
  decideApplication: (uuid: string, approve: boolean) =>
    axiosInstance.post(`/admin/ops/applications/${uuid}/decide`, { approve }).then((r) => r.data),
  connectionStatus: (user_uuid: string, status: string) =>
    axiosInstance.post("/admin/ops/connection-status", { user_uuid, status }).then((r) => r.data),
  updateTicket: (uuid: string, status: string) => axiosInstance.patch(`/admin/ops/tickets/${uuid}`, { status }).then((r) => r.data),
  leaks: () => axiosInstance.get("/ops/leaks").then((r) => r.data),
  submitReading: (data: Record<string, unknown>) => axiosInstance.post("/ops/readings", data).then((r) => r.data),
  pendingReadings: () => axiosInstance.get("/ops/readings/pending").then((r) => r.data),
  decideReading: (uuid: string, approve: boolean) =>
    axiosInstance.post(`/ops/readings/${uuid}/decide`, { approve }).then((r) => r.data),
  routes: () => axiosInstance.get("/ops/routes").then((r) => r.data),
  saveRoute: (data: Record<string, unknown>) => axiosInstance.post("/ops/routes", data).then((r) => r.data),
  myRoute: () => axiosInstance.get("/ops/my-route").then((r) => r.data),
  meters: () => axiosInstance.get("/ops/meters").then((r) => r.data),
  updateMeter: (uuid: string, data: Record<string, unknown>) => axiosInstance.put(`/ops/meters/${uuid}`, data).then((r) => r.data),
  mapPoints: () => axiosInstance.get("/ops/map").then((r) => r.data),
  tickets: () => axiosInstance.get("/tickets").then((r) => r.data),
  createTicket: (data: { category?: string; title: string; details?: string }) =>
    axiosInstance.post("/tickets", data).then((r) => r.data),
  myConnections: () => axiosInstance.get("/connections/mine").then((r) => r.data),
  applyPublic: (data: Record<string, unknown>) => axiosInstance.post("/public/connection-applications", data).then((r) => r.data),
  begin2fa: () => axiosInstance.post("/security/2fa/begin").then((r) => r.data),
  confirm2fa: (code: string) => axiosInstance.post("/security/2fa/confirm", { code }).then((r) => r.data),
  disable2fa: (code: string) => axiosInstance.post("/security/2fa/disable", { code }).then((r) => r.data),
  markRead: (uuid: string) => axiosInstance.put(`/notifications/${uuid}/read`).then((r) => r.data),
  markAllRead: () => axiosInstance.put("/notifications/mark-all-read").then((r) => r.data),
  login2fa: (pendingToken: string, code: string) => axiosInstance.post("/login/2fa", { pendingToken, code }).then((r) => r.data),
};

export function downloadJsonCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
