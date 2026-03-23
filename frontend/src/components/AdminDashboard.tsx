import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  Box,
  Typography,
  Chip,
} from "@mui/material";
import People from "@mui/icons-material/People";
import CreditCard from "@mui/icons-material/CreditCard";
import MoreVert from "@mui/icons-material/MoreVert";
import List from "@mui/icons-material/List";
import {
  getAllConsumptionAdmin,
  getAllPaymentsAdmin,
  getAllUsers,
} from "../services/apiService";
import type { ConsumptionRecord, PaymentRecord } from "../services/apiService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [consumptionList, setConsumptionList] = useState<ConsumptionRecord[]>([]);
  const [paymentsList, setPaymentsList] = useState<PaymentRecord[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [c, p, u] = await Promise.all([
          getAllConsumptionAdmin(),
          getAllPaymentsAdmin(),
          getAllUsers(),
        ]);
        setConsumptionList(Array.isArray(c) ? c : (c?.records ?? []));
        setPaymentsList(Array.isArray(p) ? p : (p?.payments ?? []));
        setUsers(Array.isArray(u) ? u : (u?.users ?? []));
      } catch {
        setConsumptionList([]);
        setPaymentsList([]);
        setUsers([]);
      }
    };
    load();
  }, []);

  const consumptionByMonth = useMemo(() => {
    const map = new Map<string, { month: string; liters: number; amount: number; sortKey: number }>();
    const monthNum = (m: string | number): number => {
      if (typeof m === "number") return m;
      const i = MONTH_NAMES.findIndex((x) => x.toLowerCase().startsWith(String(m).slice(0, 3)));
      return i >= 0 ? i + 1 : 1;
    };
    consumptionList.forEach((r) => {
      const mn = monthNum(r.month);
      const sortKey = r.year * 12 + mn;
      const key = `${r.year}-${String(mn).padStart(2, "0")}`;
      const label = `${MONTH_NAMES[mn - 1] || r.month} ${r.year}`;
      const existing = map.get(key);
      const liters = Number(r.consumption_liters) || 0;
      const amount = Number(r.amount) || 0;
      if (existing) {
        existing.liters += liters;
        existing.amount += amount;
      } else {
        map.set(key, { month: label, liters, amount, sortKey });
      }
    });
    return Array.from(map.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ month, liters, amount }) => ({ month, liters, amount }))
      .slice(-12);
  }, [consumptionList]);

  const paymentsByMonth = useMemo(() => {
    const map = new Map<string, { month: string; amount: number }>();
    paymentsList.forEach((r) => {
      const d = new Date(r.paid_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      const existing = map.get(key);
      const amount = Number(r.amount) || 0;
      if (existing) {
        existing.amount += amount;
      } else {
        map.set(key, { month: label, amount });
      }
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
      .slice(-12);
  }, [paymentsList]);

  const totalUsers = users.length;
  const totalDueAmount = users.reduce((sum, user) => sum + (user.dueAmount || 0), 0);
  const pendingPayments = users.filter((u) => u.payment_status === "PENDING").length;
  const completedPayments = users.filter((u) => u.payment_status === "COMPLETED").length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 2, color: "text.primary" }}>
        Welcome, Admin 👋
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" }, gap: 2, mb: 2 }}>
        <Card sx={{ overflow: "hidden", borderRadius: 3, background: "linear-gradient(135deg, #1976d2, #3949ab, #7c4dff)", color: "white" }}>
          <CardContent sx={{ position: "relative", p: 3 }}>
            <Box sx={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top, rgba(255,255,255,0.25), transparent 45%)" }} />
            <Box sx={{ position: "relative", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
              <Box>
                <Typography variant="overline" sx={{ opacity: 0.8 }}>System health</Typography>
                <Typography variant="h5" fontWeight={600}>WaterBill Manager</Typography>
                <Typography sx={{ opacity: 0.9 }}>Monitor user activity, dues, and account health at a glance.</Typography>
              </Box>
              <Chip label="Live" sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }} />
            </Box>
            <Box sx={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, mt: 2, textAlign: "center" }}>
              <Box>
                <Typography variant="overline" sx={{ opacity: 0.8 }}>Users</Typography>
                <Typography variant="h4" fontWeight={600} style={{ cursor: "pointer" }} onClick={() =>  navigate("/consumers")}>{totalUsers}
              
                </Typography>
              </Box>
              <Box>
                <Typography variant="overline" sx={{ opacity: 0.8 }}>Outstanding</Typography>
                <Typography variant="h4" fontWeight={600}>₹{totalDueAmount.toLocaleString("en-IN")}</Typography>
              </Box>
              <Box>
                <Typography variant="overline" sx={{ opacity: 0.8 }}>Pending</Typography>
                <Typography variant="h4" fontWeight={600}>{pendingPayments}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 3, border: 1, borderColor: "grey.200" }}>
          <CardHeader title="Quick snapshot" subheader="Key insights for this cycle" />
          <CardContent sx={{ pt: 0 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", py: 1 }}><Typography color="text.secondary">Admins</Typography><Typography fontWeight={600}>{adminCount}</Typography></Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", py: 1 }}><Typography color="text.secondary">Completed payments</Typography><Typography fontWeight={600} color="success.main">{completedPayments}</Typography></Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", py: 1 }}><Typography color="text.secondary">Pending approvals</Typography><Typography fontWeight={600} color="warning.main">{pendingPayments}</Typography></Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", py: 1 }}><Typography color="text.secondary">Average due per user</Typography><Typography fontWeight={600}>₹{totalUsers ? Math.round(totalDueAmount / Math.max(totalUsers, 1)) : 0}</Typography></Box>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }, gap: 2, mb: 3 }}>
        {[
          { label: "New registrations", value: users.filter((u) => new Date(u.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length, sub: "This month", icon: <People />, color: "primary.main" },
          { label: "Average due", value: `₹${totalUsers ? Math.round(totalDueAmount / Math.max(totalUsers, 1)).toLocaleString("en-IN") : 0}`, sub: "Per user", icon: <CreditCard />, color: "success.main" },
          { label: "Pending verifications", value: users.filter((u) => u.status === "PENDING").length, sub: "Need admin action", icon: <MoreVert />, color: "secondary.main" },
          { label: "Inactive users", value: users.filter((u) => u.status === "INACTIVE").length, sub: "No activity in 30 days", icon: <List />, color: "warning.main" },
        ].map((item, i) => (
          <Card key={i} sx={{ borderRadius: 2, border: 1, borderColor: "grey.200" }}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2 }}>
              <Box sx={{ borderRadius: 2, bgcolor: "grey.100", p: 1.5, color: item.color }}>{item.icon}</Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase" }}>{item.label}</Typography>
                <Typography variant="h6" fontWeight={600}>{item.value}</Typography>
                <Typography variant="caption" color="text.secondary">{item.sub}</Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2, mb: 3 }}>
        <Card sx={{ borderRadius: 2, border: 1, borderColor: "grey.200" }}>
          <CardHeader title="Consumption / month" subheader="Total liters and amount by billing period" />
          <CardContent sx={{ pt: 0 }}>
            <Box sx={{ width: "100%", height: 280 }}>
              {consumptionByMonth.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>No consumption data</Typography>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consumptionByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip formatter={(value: number, name: string) => [name === "liters" ? `${value} L` : `₹${value}`, name === "liters" ? "Liters" : "Amount"]} labelFormatter={(label) => label} />
                    <Bar yAxisId="left" dataKey="liters" fill="#2196f3" name="liters" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="amount" fill="#4caf50" name="amount" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 2, border: 1, borderColor: "grey.200" }}>
          <CardHeader title="Payments / month" subheader="Total payments received by month" />
          <CardContent sx={{ pt: 0 }}>
            <Box sx={{ width: "100%", height: 280 }}>
              {paymentsByMonth.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>No payment data</Typography>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentsByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip formatter={(value: number) => [`₹${value}`, "Amount"]} labelFormatter={(label) => label} />
                    <Bar dataKey="amount" fill="#4caf50" name="amount" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
