import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
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
  alpha,
  Link as MuiLink,
} from "@mui/material";
import Download from "@mui/icons-material/Download";
import WaterDrop from "@mui/icons-material/WaterDrop";
import Payment from "@mui/icons-material/Payment";
import Percent from "@mui/icons-material/Percent";
import Assessment from "@mui/icons-material/Assessment";
import ReceiptLong from "@mui/icons-material/ReceiptLong";
import WarningAmber from "@mui/icons-material/WarningAmber";
import History from "@mui/icons-material/History";
import ShowChart from "@mui/icons-material/ShowChart";
import TableChart from "@mui/icons-material/TableChart";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
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
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { DashboardHero } from "@/components/DashboardChrome";
import { ConsumptionMonthCard } from "@/components/DashboardTrendCharts";

type TabId = "revenue" | "consumption" | "outstanding" | "audit" | "analytics" | "downloads";

type RevenueRow = { period: string; billed: number; collected: number; outstanding: number };
type ConsumptionRow = { period: string; total_liters: number; total_amount: number; connections: number };
type OutstandingRow = {
  user_uuid: string;
  connection_id: string;
  full_name: string;
  mobile_number: string;
  due_amount: number;
  unpaid_count: number;
};
type AuditLogRow = {
  uuid?: string;
  id?: string;
  created_at: string;
  user_uuid?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: unknown;
};
type ConsumerExportRow = {
  uuid: string;
  connection_id?: string;
  full_name?: string;
  mobile_number?: string;
  address?: string;
  status?: string;
  role?: string;
  dueAmount?: number;
  payment_status?: string;
};

const TAB_LABELS: Record<TabId, string> = {
  revenue: "Revenue",
  consumption: "Consumption",
  outstanding: "Outstanding",
  audit: "Audit log",
  analytics: "Analytics",
  downloads: "Download reports",
};

const TAB_ICONS: Record<TabId, React.ReactElement> = {
  revenue: <ReceiptLong fontSize="small" />,
  consumption: <WaterDrop fontSize="small" />,
  outstanding: <WarningAmber fontSize="small" />,
  audit: <History fontSize="small" />,
  analytics: <ShowChart fontSize="small" />,
  downloads: <TableChart fontSize="small" />,
};

const profileLinkSx = {
  fontWeight: 600,
  textDecoration: "none",
  "&:hover": { textDecoration: "underline" },
} as const;

const TAB_HELP: Record<TabId, string> = {
  revenue: "Compare billed amounts, collections, and remaining outstanding by billing period.",
  consumption: "Water usage (liters), billed amounts, and number of connections per period.",
  outstanding: "Consumers with unpaid bills — due totals and count of open invoices.",
  audit: "Recent administrative actions (last 100 entries). Export includes full JSON details.",
  analytics: "Visual trends: system-wide usage, payment mix, and monthly collection efficiency.",
  downloads: "Preview consumer accounts (role USER) before exporting to CSV.",
};

const tablePaperSx = {
  borderRadius: 2,
  border: "1px solid",
  borderColor: "divider",
  maxHeight: 460,
} as const;

const headCellSx = { fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", bgcolor: "action.hover" };

function ReportsEmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} sx={{ py: 0, border: "none" }}>
        <Box
          sx={{
            py: 5,
            px: 2,
            my: 0.5,
            borderRadius: 2,
            border: "1px dashed",
            borderColor: "divider",
            bgcolor: (t) => alpha(t.palette.action.hover, t.palette.mode === "dark" ? 0.25 : 0.5),
            textAlign: "center",
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: "auto", lineHeight: 1.6 }}>
            {message}
          </Typography>
        </Box>
      </TableCell>
    </TableRow>
  );
}

const ReportsPage = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>("revenue");
  const activeTabRef = useRef<TabId>(activeTab);
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [consumption, setConsumption] = useState<ConsumptionRow[]>([]);
  const [outstanding, setOutstanding] = useState<OutstandingRow[]>([]);
  const [audit, setAudit] = useState<{ logs: AuditLogRow[]; total: number }>({ logs: [], total: 0 });
  const [trends, setTrends] = useState<{ period: string; liters?: number; amount?: number }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ method?: string; total?: number; count?: number }[]>([]);
  const [efficiency, setEfficiency] = useState<{ period: string; efficiency: number }[]>([]);
  const [consumerUsers, setConsumerUsers] = useState<ConsumerExportRow[]>([]);
  const [loading, setLoading] = useState(true);
  /** Background refetch on tab revisit — thin progress only, content stays visible */
  const [refreshing, setRefreshing] = useState(false);
  /** Avoid full-panel loading (flicker) when revisiting a tab that already loaded once */
  const tabFetchedRef = useRef<Record<TabId, boolean>>({
    revenue: false,
    consumption: false,
    outstanding: false,
    audit: false,
    analytics: false,
    downloads: false,
  });

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const pieColors = useMemo(
    () => [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.error.main,
      alpha(theme.palette.info.main, 0.85),
    ],
    [theme]
  );

  const revenueTotals = useMemo(() => {
    const billed = revenue.reduce((s, r) => s + (Number(r.billed) || 0), 0);
    const collected = revenue.reduce((s, r) => s + (Number(r.collected) || 0), 0);
    const out = revenue.reduce((s, r) => s + (Number(r.outstanding) || 0), 0);
    return { billed, collected, outstanding: out };
  }, [revenue]);

  const consumptionTotals = useMemo(() => {
    const liters = consumption.reduce((s, r) => s + (Number(r.total_liters) || 0), 0);
    const amount = consumption.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
    return { liters, amount };
  }, [consumption]);

  const outstandingTotals = useMemo(() => {
    const due = outstanding.reduce((s, r) => s + (Number(r.due_amount) || 0), 0);
    const bills = outstanding.reduce((s, r) => s + (Number(r.unpaid_count) || 0), 0);
    return { due, bills };
  }, [outstanding]);

  const trendsChartData = useMemo(
    () =>
      [...trends]
        .reverse()
        .map((t) => ({
          month: t.period,
          liters: Number(t.liters) || 0,
          amount: Number(t.amount) || 0,
        })),
    [trends]
  );

  const load = useCallback(async () => {
    const tab = activeTab;
    const firstVisit = !tabFetchedRef.current[tab];
    if (firstVisit) {
      setLoading(true);
      setRefreshing(false);
    } else {
      setLoading(false);
      setRefreshing(true);
    }
    const stillActive = () => activeTabRef.current === tab;
    try {
      if (tab === "revenue") {
        const r = await getRevenueReport();
        if (!stillActive()) return;
        setRevenue((r.report || []) as RevenueRow[]);
        tabFetchedRef.current.revenue = true;
      } else if (tab === "consumption") {
        const c = await getConsumptionReport();
        if (!stillActive()) return;
        setConsumption((c.report || []) as ConsumptionRow[]);
        tabFetchedRef.current.consumption = true;
      } else if (tab === "outstanding") {
        const o = await getOutstandingReport();
        if (!stillActive()) return;
        setOutstanding((o.report || []) as OutstandingRow[]);
        tabFetchedRef.current.outstanding = true;
      } else if (tab === "audit") {
        const a = await getAuditLog({ page: 1, limit: 100 });
        if (!stillActive()) return;
        setAudit({ logs: (a.logs || []) as AuditLogRow[], total: a.total || 0 });
        tabFetchedRef.current.audit = true;
      } else if (tab === "analytics") {
        const [t, pm, eff] = await Promise.all([
          getConsumptionTrends(),
          getPaymentMethodStats(),
          getCollectionEfficiency(),
        ]);
        if (!stillActive()) return;
        setTrends(t.trends || []);
        setPaymentMethods(pm.byMethod || []);
        setEfficiency(eff.byMonth || []);
        tabFetchedRef.current.analytics = true;
      } else if (tab === "downloads") {
        const u = await getAllUsers();
        if (!stillActive()) return;
        const raw = Array.isArray(u) ? u : (u?.users ?? []);
        const consumers = (raw as unknown as ConsumerExportRow[]).filter((x) => (x.role || "").toUpperCase() === "USER");
        setConsumerUsers(consumers);
        tabFetchedRef.current.downloads = true;
      }
    } catch {
      if (!stillActive()) return;
      tabFetchedRef.current[tab] = false;
      toast({
        title: "Could not load report",
        description: `Failed to refresh ${TAB_LABELS[tab]}. Check your connection and try again.`,
        variant: "destructive",
      });
      switch (tab) {
        case "revenue":
          setRevenue([]);
          break;
        case "consumption":
          setConsumption([]);
          break;
        case "outstanding":
          setOutstanding([]);
          break;
        case "audit":
          setAudit({ logs: [], total: 0 });
          break;
        case "analytics":
          setTrends([]);
          setPaymentMethods([]);
          setEfficiency([]);
          break;
        case "downloads":
          setConsumerUsers([]);
          break;
        default:
          break;
      }
    } finally {
      if (stillActive()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [activeTab]);

  useEffect(() => {
    load();
  }, [load]);

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

  const consumerRowsForCsv = (rows: ConsumerExportRow[]) =>
    rows.map((r) => [
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
    if (activeTab === "analytics") return;
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
    toast({ title: "Export ready", description: "Check your downloads folder for the CSV file." });
  };

  const exportDisabled =
    loading ||
    activeTab === "analytics" ||
    (activeTab === "downloads" && consumerUsers.length === 0) ||
    (activeTab === "audit" && audit.logs.length === 0) ||
    (activeTab === "revenue" && revenue.length === 0) ||
    (activeTab === "consumption" && consumption.length === 0) ||
    (activeTab === "outstanding" && outstanding.length === 0);

  return (
    <Box sx={{ width: "100%", maxWidth: 1280, mx: "auto" }}>
      <DashboardHero
        eyebrow="Reports & exports"
        title="Reports"
        subtitle="Switch categories below to explore billing, usage, arrears, audit history, and analytics. Export CSV from any tab that shows a table (not the charts tab)."
        action={
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={exportDisabled}
            sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700, px: 2.5, boxShadow: "none" }}
          >
            Export CSV
          </Button>
        }
      />

      <Card
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 4px 24px rgba(0,0,0,0.28)"
              : "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px rgba(15,23,42,0.08)",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v: TabId) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="Report categories"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            px: { xs: 1, sm: 2 },
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.08 : 0.04),
            "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 48 },
          }}
        >
          {(Object.keys(TAB_LABELS) as TabId[]).map((id) => (
            <Tab
              key={id}
              id={`reports-tab-${id}`}
              aria-controls="reports-panel"
              icon={TAB_ICONS[id]}
              iconPosition="start"
              label={TAB_LABELS[id]}
              value={id}
            />
          ))}
        </Tabs>

        <CardContent
          component="div"
          role="tabpanel"
          id="reports-panel"
          aria-labelledby={`reports-tab-${activeTab}`}
          aria-busy={loading || refreshing}
          sx={{ pt: 2.5, px: { xs: 2, sm: 3 }, pb: 3, position: "relative" }}
        >
          {refreshing ? (
            <LinearProgress
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                borderRadius: 0,
                zIndex: 1,
              }}
            />
          ) : null}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 2.5 }}>
            <Assessment sx={{ color: "primary.main", mt: 0.25, fontSize: 22 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={700} letterSpacing="-0.02em">
                {TAB_LABELS[activeTab]}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, lineHeight: 1.5 }}>
                {TAB_HELP[activeTab]}
                {activeTab === "analytics" && " (CSV export is not available for this view.)"}
              </Typography>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ py: 1 }}>
              <LinearProgress sx={{ borderRadius: 1, height: 6 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Loading {TAB_LABELS[activeTab].toLowerCase()}…
              </Typography>
            </Box>
          ) : activeTab === "revenue" ? (
            <Box>
              {revenue.length > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
                  <Chip size="small" variant="outlined" color="primary" label={`Total billed ${formatCurrency(revenueTotals.billed)}`} sx={{ fontWeight: 600 }} />
                  <Chip size="small" variant="outlined" color="success" label={`Collected ${formatCurrency(revenueTotals.collected)}`} sx={{ fontWeight: 600 }} />
                  <Chip size="small" variant="outlined" color="warning" label={`Outstanding ${formatCurrency(revenueTotals.outstanding)}`} sx={{ fontWeight: 600 }} />
                </Box>
              )}
              <TableContainer component={Paper} variant="outlined" sx={tablePaperSx}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headCellSx}>Period</TableCell>
                      <TableCell sx={headCellSx} align="right">Billed</TableCell>
                      <TableCell sx={headCellSx} align="right">Collected</TableCell>
                      <TableCell sx={headCellSx} align="right">Outstanding</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {revenue.length === 0 ? (
                      <ReportsEmptyRow colSpan={4} message="No revenue data for this report yet. Data appears after billing periods are recorded." />
                    ) : (
                      revenue.map((r) => (
                        <TableRow key={r.period} hover>
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
            </Box>
          ) : activeTab === "consumption" ? (
            <Box>
              {consumption.length > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
                  <Chip size="small" variant="outlined" color="primary" label={`${consumptionTotals.liters.toLocaleString("en-IN")} L (sum)`} sx={{ fontWeight: 600 }} icon={<WaterDrop />} />
                  <Chip size="small" variant="outlined" color="success" label={formatCurrency(consumptionTotals.amount)} sx={{ fontWeight: 600 }} />
                </Box>
              )}
              <TableContainer component={Paper} variant="outlined" sx={tablePaperSx}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headCellSx}>Period</TableCell>
                      <TableCell sx={headCellSx} align="right">Liters</TableCell>
                      <TableCell sx={headCellSx} align="right">Amount</TableCell>
                      <TableCell sx={headCellSx} align="right">Connections</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {consumption.length === 0 ? (
                      <ReportsEmptyRow colSpan={4} message="No consumption aggregates yet. Readings and billing runs will populate this table." />
                    ) : (
                      consumption.map((r) => (
                        <TableRow key={r.period} hover>
                          <TableCell>{r.period}</TableCell>
                          <TableCell align="right">{Number(r.total_liters).toLocaleString("en-IN")} L</TableCell>
                          <TableCell align="right">{formatCurrency(r.total_amount)}</TableCell>
                          <TableCell align="right">{r.connections}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : activeTab === "outstanding" ? (
            <Box>
              {outstanding.length > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
                  <Chip size="small" variant="outlined" color="error" label={`${outstanding.length} account(s)`} sx={{ fontWeight: 600 }} />
                  <Chip size="small" variant="outlined" color="warning" label={`Due ${formatCurrency(outstandingTotals.due)}`} sx={{ fontWeight: 600 }} />
                  <Chip size="small" variant="outlined" label={`${outstandingTotals.bills} unpaid bill(s)`} sx={{ fontWeight: 600 }} />
                </Box>
              )}
              <TableContainer component={Paper} variant="outlined" sx={tablePaperSx}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headCellSx}>Connection</TableCell>
                      <TableCell sx={headCellSx}>Name</TableCell>
                      <TableCell sx={headCellSx}>Mobile</TableCell>
                      <TableCell sx={headCellSx} align="right">Due</TableCell>
                      <TableCell sx={headCellSx} align="right">Unpaid bills</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {outstanding.length === 0 ? (
                      <ReportsEmptyRow colSpan={5} message="No outstanding dues — all consumer accounts are caught up." />
                    ) : (
                      outstanding.map((r) => (
                        <TableRow key={r.user_uuid} hover>
                          <TableCell>
                            <MuiLink component={RouterLink} to={`/${r.user_uuid}`} color="inherit" sx={profileLinkSx}>
                              {r.connection_id}
                            </MuiLink>
                          </TableCell>
                          <TableCell>
                            <MuiLink component={RouterLink} to={`/${r.user_uuid}`} color="inherit" sx={profileLinkSx}>
                              {r.full_name}
                            </MuiLink>
                          </TableCell>
                          <TableCell>{r.mobile_number}</TableCell>
                          <TableCell align="right">{formatCurrency(r.due_amount)}</TableCell>
                          <TableCell align="right">{r.unpaid_count}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : activeTab === "audit" ? (
            <Box>
              {audit.logs.length > 0 && (
                <Chip size="small" variant="outlined" sx={{ mb: 2, fontWeight: 600 }} label={`Showing ${audit.logs.length} of ${audit.total || audit.logs.length} entries`} />
              )}
              <TableContainer component={Paper} variant="outlined" sx={tablePaperSx}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headCellSx}>Time</TableCell>
                      <TableCell sx={headCellSx}>Action</TableCell>
                      <TableCell sx={headCellSx}>Entity</TableCell>
                      <TableCell sx={headCellSx}>User</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {audit.logs.length === 0 ? (
                      <ReportsEmptyRow colSpan={4} message="No audit entries to show. Admin actions will appear here as they occur." />
                    ) : (
                      audit.logs.map((l, idx) => (
                        <TableRow key={l.uuid || l.id || `audit-${idx}`} hover>
                          <TableCell sx={{ whiteSpace: "nowrap", fontSize: "0.8125rem" }}>{new Date(l.created_at).toLocaleString("en-IN")}</TableCell>
                          <TableCell>
                            <Chip size="small" label={l.action} variant="outlined" sx={{ fontWeight: 600 }} />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 220 }}>{[l.entity_type, l.entity_id].filter(Boolean).join(" · ")}</TableCell>
                          <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{l.user_uuid?.slice(0, 8)}…</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : activeTab === "analytics" ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                <Chip
                  icon={<WaterDrop />}
                  label={`Total usage (chart range): ${trends.reduce((s, r) => s + (Number(r.liters) || 0), 0).toLocaleString("en-IN")} L`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 600, borderRadius: 2 }}
                />
                <Chip
                  icon={<Payment />}
                  label={`Payments: ${paymentMethods.reduce((s, r) => s + (Number(r.count) || 0), 0)} txns`}
                  color="secondary"
                  variant="outlined"
                  sx={{ fontWeight: 600, borderRadius: 2 }}
                />
                <Chip
                  icon={<Percent />}
                  label={`Avg efficiency: ${efficiency.length ? Math.round(efficiency.reduce((s, r) => s + (Number(r.efficiency) || 0), 0) / efficiency.length) : 0}%`}
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 600, borderRadius: 2 }}
                />
              </Box>

              <ConsumptionMonthCard
                title="Consumption trends"
                subheader="System-wide liters and billed amount by period — same style as your dashboard charts"
                data={trendsChartData}
              />

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 3,
                    borderColor: "divider",
                    overflow: "hidden",
                    boxShadow: theme.palette.mode === "dark" ? "none" : "0 1px 2px rgba(15,23,42,0.04)",
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                      <Payment sx={{ color: "secondary.main", fontSize: 24 }} />
                      <Typography variant="subtitle1" fontWeight={700} letterSpacing="-0.02em">
                        Payment methods
                      </Typography>
                    </Box>
                    <Box sx={{ width: "100%", height: 280 }}>
                      {paymentMethods.length === 0 ? (
                        <Typography color="text.secondary" textAlign="center" py={4}>
                          No payment data
                        </Typography>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={paymentMethods.map((r) => ({ name: r.method || "Other", value: r.total }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={58}
                              outerRadius={92}
                              paddingAngle={2}
                              dataKey="value"
                              nameKey="name"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {paymentMethods.map((pm, i) => (
                                <Cell
                                  key={pm.method || `slice-${i}`}
                                  fill={pieColors[i % pieColors.length]}
                                  stroke={theme.palette.background.paper}
                                  strokeWidth={2}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend wrapperStyle={{ paddingTop: 8 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </Box>
                  </CardContent>
                </Card>

                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 3,
                    borderColor: "divider",
                    overflow: "hidden",
                    boxShadow: theme.palette.mode === "dark" ? "none" : "0 1px 2px rgba(15,23,42,0.04)",
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                      <Percent sx={{ color: "success.main", fontSize: 24 }} />
                      <Typography variant="subtitle1" fontWeight={700} letterSpacing="-0.02em">
                        Collection efficiency
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                      Share of billed amount collected per month (recent periods).
                    </Typography>
                    {efficiency.length === 0 ? (
                      <Typography color="text.secondary" textAlign="center" py={4}>
                        No efficiency data
                      </Typography>
                    ) : (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {efficiency.slice(0, 10).map((r, i) => (
                          <Box key={i}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                              <Typography variant="caption" fontWeight={700}>
                                {r.period}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                {Number(r.efficiency) || 0}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(100, Number(r.efficiency) || 0)}
                              sx={{
                                height: 10,
                                borderRadius: 1,
                                bgcolor: alpha(theme.palette.success.main, 0.12),
                                "& .MuiLinearProgress-bar": {
                                  borderRadius: 1,
                                  bgcolor:
                                    (Number(r.efficiency) || 0) >= 80
                                      ? "success.main"
                                      : (Number(r.efficiency) || 0) >= 50
                                        ? "warning.main"
                                        : "error.main",
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
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {consumerUsers.length} consumer account(s). Export matches this table.
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={tablePaperSx}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headCellSx}>Connection ID</TableCell>
                      <TableCell sx={headCellSx}>Name</TableCell>
                      <TableCell sx={headCellSx}>Mobile</TableCell>
                      <TableCell sx={headCellSx}>Address</TableCell>
                      <TableCell sx={headCellSx}>Status</TableCell>
                      <TableCell sx={headCellSx}>Role</TableCell>
                      <TableCell sx={headCellSx} align="right">Due amount</TableCell>
                      <TableCell sx={headCellSx}>Payment status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {consumerUsers.length === 0 ? (
                      <ReportsEmptyRow colSpan={8} message="No consumer (USER) accounts found. Create users with role USER to list them here." />
                    ) : (
                      consumerUsers.map((r) => (
                        <TableRow key={r.uuid} hover>
                          <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>{r.connection_id}</TableCell>
                          <TableCell>
                            <MuiLink component={RouterLink} to={`/${r.uuid}`} color="inherit" sx={profileLinkSx}>
                              {r.full_name}
                            </MuiLink>
                          </TableCell>
                          <TableCell>{r.mobile_number}</TableCell>
                          <TableCell sx={{ maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.address}>
                            {r.address}
                          </TableCell>
                          <TableCell>{r.status}</TableCell>
                          <TableCell>{r.role}</TableCell>
                          <TableCell align="right">{formatCurrency(Number(r.dueAmount) || 0)}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={r.payment_status || "—"}
                              color={r.payment_status === "PENDING" ? "warning" : "success"}
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
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
