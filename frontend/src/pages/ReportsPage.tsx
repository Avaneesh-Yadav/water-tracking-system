import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  LinearProgress,
  Chip,
} from "@mui/material";
import Download from "@mui/icons-material/Download";
import TrendingUp from "@mui/icons-material/TrendingUp";
import WaterDrop from "@mui/icons-material/WaterDrop";
import Payment from "@mui/icons-material/Payment";
import Percent from "@mui/icons-material/Percent";
import {
  getRevenueReport,
  getConsumptionReport,
  getOutstandingReport,
  getAuditLog,
  getConsumptionTrends,
  getPaymentMethodStats,
  getCollectionEfficiency,
  getAllUsers,
} from "@/services/apiService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type TabId = "revenue" | "consumption" | "outstanding" | "audit" | "analytics" | "downloads";

const ReportsPage = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>("revenue");
  const [revenue, setRevenue] = useState<any[]>([]);
  const [consumption, setConsumption] = useState<any[]>([]);
  const [outstanding, setOutstanding] = useState<any[]>([]);
  const [audit, setAudit] = useState<{ logs: any[]; total: number }>({ logs: [], total: 0 });
  const [trends, setTrends] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [efficiency, setEfficiency] = useState<any[]>([]);
  /** Consumers only (role USER) – shown on Download reports tab; Export CSV above exports this table */
  const [consumerUsers, setConsumerUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      if (activeTab === "revenue") {
        const r = await getRevenueReport();
        setRevenue(r.report || []);
      } else if (activeTab === "consumption") {
        const c = await getConsumptionReport();
        setConsumption(c.report || []);
      } else if (activeTab === "outstanding") {
        const o = await getOutstandingReport();
        setOutstanding(o.report || []);
      } else if (activeTab === "audit") {
        const a = await getAuditLog({ page: 1, limit: 100 });
        setAudit({ logs: a.logs || [], total: a.total || 0 });
      } else if (activeTab === "analytics") {
        const [t, pm, eff] = await Promise.all([
          getConsumptionTrends(),
          getPaymentMethodStats(),
          getCollectionEfficiency(),
        ]);
        setTrends(t.trends || []);
        setPaymentMethods(pm.byMethod || []);
        setEfficiency(eff.byMonth || []);
      } else if (activeTab === "downloads") {
        const u = await getAllUsers();
        const users = Array.isArray(u) ? u : (u?.users ?? []);
        const consumers = users.filter((x: any) => (x.role || "").toUpperCase() === "USER");
        setConsumerUsers(consumers);
        return;
      }
    } catch {
      setRevenue([]);
      setConsumption([]);
      setOutstanding([]);
      setAudit({ logs: [], total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activeTab]);

  const formatCurrency = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

  const exportCsv = (headers: string[], rows: (string | number)[][], filename: string) => {
    const line = (arr: (string | number)[]) => arr.map((c) => (typeof c === "string" && c.includes(",") ? `"${c}"` : c)).join(",");
    const csv = [headers.join(","), ...rows.map((r) => line(r))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const consumerRowsForCsv = (rows: any[]) =>
    rows.map((r: any) => [
      r.connection_id ?? "",
      r.full_name ?? "",
      r.mobile_number ?? "",
      r.address ?? "",
      r.status ?? "",
      r.role ?? "USER",
      r.dueAmount ?? 0,
      r.payment_status ?? "",
    ]);

  const handleExport = () => {
    if (activeTab === "revenue") {
      exportCsv(
        ["Period", "Billed", "Collected", "Outstanding"],
        revenue.map((r) => [r.period, r.billed, r.collected, r.outstanding]),
        "revenue-report.csv"
      );
    } else if (activeTab === "consumption") {
      exportCsv(
        ["Period", "Liters", "Amount", "Connections"],
        consumption.map((r) => [r.period, r.total_liters, r.total_amount, r.connections]),
        "consumption-report.csv"
      );
    } else if (activeTab === "outstanding") {
      exportCsv(
        ["Connection ID", "Name", "Mobile", "Due Amount", "Unpaid Count"],
        outstanding.map((r) => [r.connection_id, r.full_name, r.mobile_number, r.due_amount, r.unpaid_count]),
        "outstanding-report.csv"
      );
    } else if (activeTab === "downloads") {
      exportCsv(
        ["Connection ID", "Name", "Mobile", "Address", "Status", "Role", "Due Amount", "Payment Status"],
        consumerRowsForCsv(consumerUsers),
        `consumers-report-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } else {
      exportCsv(
        ["Date", "User", "Action", "Entity", "Details"],
        audit.logs.map((l) => [
          l.created_at,
          l.user_uuid,
          l.action,
          [l.entity_type, l.entity_id].filter(Boolean).join(" "),
          l.details ? JSON.stringify(l.details) : "",
        ]),
        "audit-log.csv"
      );
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 2 }}>
        <Typography variant="h5" fontWeight={600} color="text.primary">
          Reports
        </Typography>
        <Button variant="outlined" startIcon={<Download />} onClick={handleExport} disabled={loading || (activeTab === "downloads" && consumerUsers.length === 0)}>
          Export CSV
        </Button>
      </Box>

      <Card variant="outlined">
        <Tabs value={activeTab} onChange={(_, v: TabId) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
          <Tab label="Revenue" value="revenue" />
          <Tab label="Consumption" value="consumption" />
          <Tab label="Outstanding" value="outstanding" />
          <Tab label="Audit log" value="audit" />
          <Tab label="Analytics" value="analytics" />
          <Tab label="Download reports" value="downloads" />
        </Tabs>
        <CardContent sx={{ pt: 0 }}>
          {loading ? (
            <Typography color="text.secondary">Loading…</Typography>
          ) : activeTab === "revenue" ? (
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 440 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Period</TableCell>
                    <TableCell align="right">Billed</TableCell>
                    <TableCell align="right">Collected</TableCell>
                    <TableCell align="right">Outstanding</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {revenue.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center">No data</TableCell></TableRow>
                  ) : (
                    revenue.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.period}</TableCell>
                        <TableCell align="right">{formatCurrency(r.billed)}</TableCell>
                        <TableCell align="right">{formatCurrency(r.collected)}</TableCell>
                        <TableCell align="right">{formatCurrency(r.outstanding)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : activeTab === "consumption" ? (
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 440 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Period</TableCell>
                    <TableCell align="right">Liters</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Connections</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {consumption.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center">No data</TableCell></TableRow>
                  ) : (
                    consumption.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.period}</TableCell>
                        <TableCell align="right">{Number(r.total_liters).toLocaleString()} L</TableCell>
                        <TableCell align="right">{formatCurrency(r.total_amount)}</TableCell>
                        <TableCell align="right">{r.connections}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : activeTab === "outstanding" ? (
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 440 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Connection</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Mobile</TableCell>
                    <TableCell align="right">Due</TableCell>
                    <TableCell align="right">Unpaid bills</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {outstanding.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center">No outstanding dues</TableCell></TableRow>
                  ) : (
                    outstanding.map((r) => (
                      <TableRow key={r.user_uuid}>
                        <TableCell>{r.connection_id}</TableCell>
                        <TableCell>{r.full_name}</TableCell>
                        <TableCell>{r.mobile_number}</TableCell>
                        <TableCell align="right">{formatCurrency(r.due_amount)}</TableCell>
                        <TableCell align="right">{r.unpaid_count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : activeTab === "audit" ? (
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 440 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Entity</TableCell>
                    <TableCell>User</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {audit.logs.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center">No audit entries</TableCell></TableRow>
                  ) : (
                    audit.logs.map((l) => (
                      <TableRow key={l.uuid || l.id}>
                        <TableCell>{new Date(l.created_at).toLocaleString()}</TableCell>
                        <TableCell>{l.action}</TableCell>
                        <TableCell>{[l.entity_type, l.entity_id].filter(Boolean).join(" ")}</TableCell>
                        <TableCell>{l.user_uuid?.slice(0, 8)}…</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : activeTab === "analytics" ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Summary chips */}
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                <Chip
                  icon={<WaterDrop />}
                  label={`Total usage: ${trends.reduce((s, r) => s + (r.liters || 0), 0).toLocaleString()} L`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  icon={<Payment />}
                  label={`Payments: ${paymentMethods.reduce((s, r) => s + r.count, 0)} txns`}
                  color="secondary"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
                <Chip
                  icon={<Percent />}
                  label={`Avg efficiency: ${efficiency.length ? Math.round(efficiency.reduce((s, r) => s + r.efficiency, 0) / efficiency.length) : 0}%`}
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              {/* Consumption trends – bar chart */}
              <Card variant="outlined" sx={{ overflow: "hidden", borderRadius: 2, borderColor: "primary.200", bgcolor: "primary.50", boxShadow: "0 2px 12px rgba(25, 118, 210, 0.08)" }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <TrendingUp sx={{ color: "primary.main", fontSize: 22 }} />
                    <Typography variant="subtitle1" fontWeight={600} color="primary.dark">Consumption trends</Typography>
                  </Box>
                  <Box sx={{ width: "100%", height: 280 }}>
                    {trends.length === 0 ? (
                      <Typography color="text.secondary" textAlign="center" py={4}>No data</Typography>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[...trends].reverse()} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                          <YAxis yAxisId="L" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}L`} />
                          <YAxis yAxisId="R" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                          <Tooltip formatter={(value: number, name: string) => [name === "liters" ? `${Number(value).toLocaleString()} L` : formatCurrency(value), name === "liters" ? "Liters" : "Amount"]} />
                          <Bar yAxisId="L" dataKey="liters" fill="#2196f3" name="liters" radius={[4, 4, 0, 0]} />
                          <Bar yAxisId="R" dataKey="amount" fill="#4caf50" name="amount" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Box>
                </CardContent>
              </Card>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
                {/* Payment methods – pie */}
                <Card variant="outlined" sx={{ overflow: "hidden", borderRadius: 2, borderColor: "secondary.200", bgcolor: "secondary.50", boxShadow: "0 2px 12px rgba(156, 39, 176, 0.08)" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                      <Payment sx={{ color: "secondary.main", fontSize: 22 }} />
                      <Typography variant="subtitle1" fontWeight={600} color="secondary.dark">Payment methods</Typography>
                    </Box>
                    <Box sx={{ width: "100%", height: 260 }}>
                      {paymentMethods.length === 0 ? (
                        <Typography color="text.secondary" textAlign="center" py={4}>No data</Typography>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={paymentMethods.map((r) => ({ name: r.method || "Other", value: r.total }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={56}
                              outerRadius={88}
                              paddingAngle={2}
                              dataKey="value"
                              nameKey="name"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {paymentMethods.map((_, i) => (
                                <Cell key={i} fill={["#9c27b0", "#2196f3", "#4caf50", "#ff9800", "#795548"][i % 5]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </Box>
                  </CardContent>
                </Card>

                {/* Collection efficiency – progress bars */}
                <Card variant="outlined" sx={{ overflow: "hidden", borderRadius: 2, borderColor: "success.200", bgcolor: "success.50", boxShadow: "0 2px 12px rgba(76, 175, 80, 0.08)" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                      <Percent sx={{ color: "success.main", fontSize: 22 }} />
                      <Typography variant="subtitle1" fontWeight={600} color="success.dark">Collection efficiency</Typography>
                    </Box>
                    {efficiency.length === 0 ? (
                      <Typography color="text.secondary" textAlign="center" py={4}>No data</Typography>
                    ) : (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {efficiency.slice(0, 8).map((r, i) => (
                          <Box key={i}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                              <Typography variant="caption" fontWeight={600}>{r.period}</Typography>
                              <Typography variant="caption" color="text.secondary">{r.efficiency}%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(100, r.efficiency)}
                              sx={{
                                height: 8,
                                borderRadius: 1,
                                bgcolor: "success.100",
                                "& .MuiLinearProgress-bar": {
                                  bgcolor: r.efficiency >= 80 ? "success.main" : r.efficiency >= 50 ? "warning.main" : "error.main",
                                },
                              }}
                            />
                          </Box>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Box>
            </Box>
          ) : activeTab === "downloads" ? (
            <Box sx={{ py: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Consumer users</Typography>
                <Typography variant="body2" color="text.secondary">Role USER only (admins excluded). Use Export CSV above to download this table.</Typography>
              </Box>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 480 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Connection ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Mobile</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell align="right">Due amount</TableCell>
                      <TableCell>Payment status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {consumerUsers.length === 0 ? (
                      <TableRow><TableCell colSpan={8} align="center">No consumer users</TableCell></TableRow>
                    ) : (
                      consumerUsers.map((r) => (
                        <TableRow key={r.uuid}>
                          <TableCell>{r.connection_id}</TableCell>
                          <TableCell>{r.full_name}</TableCell>
                          <TableCell>{r.mobile_number}</TableCell>
                          <TableCell sx={{ maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.address}>{r.address}</TableCell>
                          <TableCell>{r.status}</TableCell>
                          <TableCell>{r.role}</TableCell>
                          <TableCell align="right">{formatCurrency(Number(r.dueAmount) || 0)}</TableCell>
                          <TableCell><Chip size="small" label={r.payment_status || "—"} color={r.payment_status === "PENDING" ? "warning" : "success"} variant="outlined" /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : null}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ReportsPage;
