import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from "@mui/material";
import {
  getAllConsumptionAdmin,
  getAllPaymentsAdmin,
  getAllUsers,
  getAdminKPIs,
  exportConsumersExcel,
  getAllUnpaidConsumptionAdmin,
  getPaymentsThisMonthAdmin,
  type AdminKPIs,
} from "../services/apiService";
import { toast } from "@/hooks/use-toast";
import Download from "@mui/icons-material/Download";
import Close from "@mui/icons-material/Close";
import HowToReg from "@mui/icons-material/HowToReg";
import AdminPanelSettings from "@mui/icons-material/AdminPanelSettings";
import CurrencyRupee from "@mui/icons-material/CurrencyRupee";
import ReceiptLong from "@mui/icons-material/ReceiptLong";
import Payments from "@mui/icons-material/Payments";
import type { ConsumptionRecord, PaymentRecord } from "../services/apiService";
import { ConsumptionMonthCard, PaymentsMonthCard } from "./DashboardTrendCharts";
import { DashboardHero, DashboardPanel, AdminKpiTile } from "./DashboardChrome";
import { isStaffRole } from "@/utils/roles";
import { BillPreviewDialog } from "@/components/bill/BillPreviewDialog";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [consumptionList, setConsumptionList] = useState<ConsumptionRecord[]>([]);
  const [paymentsList, setPaymentsList] = useState<PaymentRecord[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [kpis, setKpis] = useState<AdminKPIs | null>(null);
  const [exporting, setExporting] = useState(false);
  const [unpaidDialogOpen, setUnpaidDialogOpen] = useState(false);
  const [unpaidRows, setUnpaidRows] = useState<ConsumptionRecord[]>([]);
  const [unpaidLoading, setUnpaidLoading] = useState(false);
  const [monthPayDialogOpen, setMonthPayDialogOpen] = useState(false);
  const [monthPayRows, setMonthPayRows] = useState<PaymentRecord[]>([]);
  const [monthPayLoading, setMonthPayLoading] = useState(false);
  const [previewUuid, setPreviewUuid] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [c, p, u, k] = await Promise.all([
          getAllConsumptionAdmin(),
          getAllPaymentsAdmin(),
          getAllUsers(),
          getAdminKPIs(),
        ]);
        setConsumptionList(Array.isArray(c) ? c : (c?.records ?? []));
        setPaymentsList(Array.isArray(p) ? p : (p?.payments ?? []));
        setUsers(Array.isArray(u) ? u : (u?.users ?? []));
        setKpis(k);
      } catch {
        setConsumptionList([]);
        setPaymentsList([]);
        setUsers([]);
        setKpis(null);
      }
    };
    load();
  }, []);

  const handleExportConsumers = async () => {
    setExporting(true);
    try {
      await exportConsumersExcel();
      toast({ title: "Download started", description: "Consumers spreadsheet (Excel) is downloading." });
    } catch {
      toast({ title: "Export failed", description: "Could not download the file.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

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

  const pendingPayments = users.filter((u) => u.payment_status === "PENDING").length;
  const completedPayments = users.filter((u) => u.payment_status === "COMPLETED").length;
  const adminCount = users.filter((u) => isStaffRole(u.role)).length;

  const signupsThisMonth = users.filter((u) => new Date(u.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length;

  const openUnpaidDialog = async () => {
    setUnpaidDialogOpen(true);
    setUnpaidLoading(true);
    try {
      const rows = await getAllUnpaidConsumptionAdmin();
      setUnpaidRows(rows);
    } catch {
      setUnpaidRows([]);
      toast({ title: "Could not load unpaid bills", variant: "destructive" });
    } finally {
      setUnpaidLoading(false);
    }
  };

  const openMonthPaymentsDialog = async () => {
    setMonthPayDialogOpen(true);
    setMonthPayLoading(true);
    try {
      const rows = await getPaymentsThisMonthAdmin();
      setMonthPayRows(rows);
    } catch {
      setMonthPayRows([]);
      toast({ title: "Could not load payments", variant: "destructive" });
    } finally {
      setMonthPayLoading(false);
    }
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 1280, mx: "auto" }}>
      <DashboardHero
        eyebrow="Operations"
        title="Water utility dashboard"
        subtitle="Monitor consumers, collections, and billing health across the system. Export consumer data when you need a spreadsheet."
        action={
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExportConsumers}
            disabled={exporting}
            sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700, px: 2.5, boxShadow: "none" }}
          >
            {exporting ? "Exporting…" : "Export consumers"}
          </Button>
        }
      />

      {kpis ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", lg: "repeat(5, 1fr)" }, gap: 2, mb: 3 }}>
          <AdminKpiTile
            icon={<HowToReg sx={{ fontSize: 20 }} />}
            label="Active consumers"
            value={kpis.active_consumers}
            hint="Open list →"
            onClick={() => navigate("/consumers")}
            accent="success"
          />
          <AdminKpiTile
            icon={<AdminPanelSettings sx={{ fontSize: 20 }} />}
            label="Admins"
            value={adminCount}
            hint="Employee(s) →"
            onClick={() => navigate("/employees")}
            accent="info"
          />
          <AdminKpiTile
            icon={<CurrencyRupee sx={{ fontSize: 20 }} />}
            label="Total outstanding"
            value={`₹${kpis.total_outstanding.toLocaleString("en-IN")}`}
            hint="Consumption →"
            onClick={() => navigate("/consumption")}
            accent="warning"
          />
          <AdminKpiTile
            icon={<ReceiptLong sx={{ fontSize: 20 }} />}
            label="Unpaid bills"
            value={kpis.unpaid_bill_count}
            hint="View details"
            onClick={() => openUnpaidDialog()}
            accent="error"
          />
          <AdminKpiTile
            icon={<Payments sx={{ fontSize: 20 }} />}
            label="Collected (this month)"
            value={`₹${kpis.collected_this_month.toLocaleString("en-IN")}`}
            hint={`${kpis.payment_count_this_month} payment(s) · details`}
            onClick={() => openMonthPaymentsDialog()}
            accent="success"
          />
        </Box>
      ) : (
        <Card variant="outlined" sx={{ borderRadius: 3, mb: 3, borderColor: "divider" }}>
          <CardContent sx={{ py: 2.5 }}>
            <Typography variant="body2" color="text.secondary">
              KPIs unavailable. Check API and database connection.
            </Typography>
          </CardContent>
        </Card>
      )}

      <DashboardPanel
        accent="neutral"
        title="Activity snapshot"
        subheader="Quick signals — use Consumers, Employee(s), Consumption, and Payments for full detail"
        sx={{ mb: 3 }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25 }}>
          <Chip label={`Pending balance (users): ${pendingPayments}`} color="warning" variant="outlined" sx={{ fontWeight: 600, borderRadius: 2 }} />
          <Chip label={`No pending due: ${completedPayments}`} color="success" variant="outlined" sx={{ fontWeight: 600, borderRadius: 2 }} />
          <Chip label={`New sign-ups (month): ${signupsThisMonth}`} variant="outlined" sx={{ fontWeight: 600, borderRadius: 2 }} />
          <Chip
            label={`Consumption records: ${kpis?.total_consumption_records ?? consumptionList.length}`}
            variant="outlined"
            sx={{ fontWeight: 600, borderRadius: 2 }}
          />
        </Box>
      </DashboardPanel>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2.5, mb: 3 }}>
        <ConsumptionMonthCard
          title="Consumption / month"
          subheader="Aggregated liters and billed amount across all consumers — hover for values"
          data={consumptionByMonth}
        />
        <PaymentsMonthCard
          title="Payments / month"
          subheader="Total payments received (₹) per calendar month (all users)"
          data={paymentsByMonth}
        />
      </Box>

      <Dialog open={unpaidDialogOpen} onClose={() => setUnpaidDialogOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          Unpaid bills ({unpaidRows.length})
          <IconButton aria-label="Close" onClick={() => setUnpaidDialogOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 1 }}>
          {unpaidLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : unpaidRows.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>No unpaid bills.</Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Consumer</TableCell>
                    <TableCell>Connection</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell align="right">Liters</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Bill</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {unpaidRows.map((r) => (
                    <TableRow key={r.uuid}>
                      <TableCell>{r.full_name ?? "—"}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{r.connection_id ?? "—"}</TableCell>
                      <TableCell>
                        {r.month} {r.year}
                      </TableCell>
                      <TableCell align="right">{Number(r.consumption_liters).toLocaleString("en-IN")}</TableCell>
                      <TableCell align="right">₹{Number(r.amount).toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => setPreviewUuid(r.uuid)}>
                          Print
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={monthPayDialogOpen} onClose={() => setMonthPayDialogOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          Payments this month ({monthPayRows.length})
          <IconButton aria-label="Close" onClick={() => setMonthPayDialogOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 1 }}>
          {monthPayLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : monthPayRows.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>No payments recorded this month.</Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Paid at</TableCell>
                    <TableCell>Consumer</TableCell>
                    <TableCell>Connection</TableCell>
                    <TableCell>Bill period</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monthPayRows.map((r) => (
                    <TableRow key={r.uuid}>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {r.paid_at ? new Date(r.paid_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                      </TableCell>
                      <TableCell>{r.full_name ?? "—"}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{r.connection_id ?? "—"}</TableCell>
                      <TableCell>
                        {r.month != null && r.year != null ? `${r.month} ${r.year}` : "—"}
                      </TableCell>
                      <TableCell>{r.payment_method ?? "—"}</TableCell>
                      <TableCell align="right">₹{Number(r.amount).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>
      <BillPreviewDialog
        open={!!previewUuid}
        consumptionUuid={previewUuid}
        onClose={() => setPreviewUuid(null)}
      />
    </Box>
  );
};

export default AdminDashboard;
