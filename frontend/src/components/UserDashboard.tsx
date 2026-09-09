import React, { useState, useEffect, useMemo } from "react";
import {
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  Chip,
} from "@mui/material";
import Refresh from "@mui/icons-material/Refresh";
import PersonOutline from "@mui/icons-material/PersonOutline";
import AccountBalanceWallet from "@mui/icons-material/AccountBalanceWallet";
import WaterDrop from "@mui/icons-material/WaterDrop";
import {
  getUserByUUID,
  getConsumptionHistory,
  getPaymentHistory,
  getDueAmount,
  getDueSummary,
  generatePaymentQR,
  notifyPaymentCompleted,
  ConsumptionRecord,
  PaymentRecord,
  QRData,
  type DueSummary,
} from "@/services/apiService";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { BillPreviewDialog } from "@/components/bill/BillPreviewDialog";
import PaymentDialog from "@/components/PaymentDialog";
import { ConsumptionMonthCard, PaymentsMonthCard } from "@/components/DashboardTrendCharts";
import { DashboardHero, DashboardPanel, DashboardMetricRow } from "@/components/DashboardChrome";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const UserDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [selectedBill, setSelectedBill] = useState<ConsumptionRecord | null>(null);
  /** When paying "total due", list of unpaid consumption UUIDs to mark PAID so due amount updates */
  const [unpaidBillUuidsForPayment, setUnpaidBillUuidsForPayment] = useState<string[]>([]);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [previewUuid, setPreviewUuid] = useState<string | null>(null);

  const [userData, setUserData] = useState({
    name: "",
    mobileNumber: "",
    address: "",
    connectionId: "",
    status: "",
    uuid: "",
  });
  const [consumptionData, setConsumptionData] = useState<ConsumptionRecord[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [dueAmount, setDueAmount] = useState(0);
  const [dueSummary, setDueSummary] = useState<DueSummary | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (!qrData) return;
    // In future we could add a timer/expiry here if needed.
  }, [qrData]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        navigate("/login");
        return;
      }
      const user = JSON.parse(storedUser);
      const userDetails = await getUserByUUID(user.uuid);
      setUserData({
        name: userDetails.full_name,
        mobileNumber: userDetails.mobile_number,
        address: userDetails.address,
        connectionId: userDetails.connection_id,
        status: userDetails.status,
        uuid: userDetails.uuid,
      });
      const consumption = await getConsumptionHistory();
      setConsumptionData(Array.isArray(consumption) ? consumption : (consumption?.history ?? []));
      const payments = await getPaymentHistory();
      setPaymentHistory(Array.isArray(payments) ? payments : (payments?.history ?? []));
      const [due, summary] = await Promise.all([getDueAmount(), getDueSummary()]);
      setDueAmount(parseFloat(String(due)) || 0);
      setDueSummary(summary);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load dashboard data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (bill: ConsumptionRecord) => {
    try {
      setSelectedBill(bill);
      setUnpaidBillUuidsForPayment([]);
      const qr = await generatePaymentQR(bill.uuid);
      setQrData(qr);
      toast({ title: "Payment Initiated", description: `Generating QR code for ₹${bill.amount} - ${bill.month} ${bill.year}` });
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? error?.message ?? "Failed to generate QR code";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handlePayDue = async () => {
    if (dueAmount <= 0) {
      toast({ title: "No Due", description: "You have no pending dues" });
      return;
    }
    const unpaidUuids = consumptionData.filter((c) => c.status === "UNPAID").map((c) => c.uuid);
    if (unpaidUuids.length === 0) {
      toast({ title: "No unpaid bills", description: "Refresh to see latest.", variant: "destructive" });
      return;
    }
    try {
      const qr = await generatePaymentQR("due");
      setQrData(qr);
      setSelectedBill(null);
      setUnpaidBillUuidsForPayment(unpaidUuids);
      toast({ title: "Payment Initiated", description: `Generating QR code for total due ₹${dueAmount}` });
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? error?.message ?? "Failed to generate QR code";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const markAsPaid = async (message: string) => {
    if (!qrData) return;
    setProcessingPayment(true);
    try {
      await notifyPaymentCompleted({
        consumption_uuid: selectedBill?.uuid,
        consumption_uuids: unpaidBillUuidsForPayment.length > 0 ? unpaidBillUuidsForPayment : undefined,
        amount: qrData.amount,
        payment_method: "UPI",
        upi_id: qrData.upi_id,
        message,
      });
      toast({ title: "Payment Submitted", description: "Your payment request was sent to admin for verification." });
      setQrData(null);
      setSelectedBill(null);
      setUnpaidBillUuidsForPayment([]);
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to submit payment notification", variant: "destructive" });
    } finally {
      setProcessingPayment(false);
    }
  };

  const consumptionByMonth = useMemo(() => {
    const map = new Map<string, { month: string; liters: number; amount: number; sortKey: number }>();
    const monthNum = (m: string | number): number => {
      if (typeof m === "number") return m;
      const i = MONTH_NAMES.findIndex((x) => x.toLowerCase().startsWith(String(m).slice(0, 3)));
      return i >= 0 ? i + 1 : 1;
    };
    consumptionData.forEach((r) => {
      const mn = monthNum(r.month);
      const sortKey = (r.year ?? new Date().getFullYear()) * 12 + mn;
      const key = `${r.year ?? new Date().getFullYear()}-${String(mn).padStart(2, "0")}`;
      const label = `${MONTH_NAMES[mn - 1] || r.month} ${r.year ?? ""}`;
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
  }, [consumptionData]);

  const paymentsByMonth = useMemo(() => {
    const map = new Map<string, { month: string; amount: number }>();
    paymentHistory.forEach((r) => {
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
  }, [paymentHistory]);

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1280, mx: "auto", width: "100%" }}>
        <Skeleton variant="rounded" height={120} sx={{ mb: 3, borderRadius: 3 }} />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" }, gap: 2.5, mb: 3 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={220} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Card sx={{ borderRadius: 3 }}>
          <CardHeader title={<Skeleton variant="text" width={160} height={28} />} />
          <CardContent sx={{ pt: 0 }}>
            <TableContainer component={Paper} variant="outlined">
              <Table
                size="small"
                sx={{
                  "& td, & th": {
                    borderColor: "divider",
                  },
                }}
              >
                <TableHead><TableRow><TableCell>Month</TableCell><TableCell>Amount</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
                <TableBody>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton variant="text" width={60} height={24} /></TableCell>
                      <TableCell><Skeleton variant="text" width={56} height={24} /></TableCell>
                      <TableCell><Skeleton variant="rounded" width={56} height={24} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto", width: "100%" }}>
        <DashboardHero
          eyebrow="Consumer portal"
          title={`Welcome back, ${userData.name}`}
          subtitle={
            <>
              Connection{" "}
              <Box component="span" sx={{ fontFamily: "monospace", fontWeight: 700, color: "primary.main" }}>
                {userData.connectionId}
              </Box>
              {" "}— review usage, pay water charges, and open printable bills.
            </>
          }
          action={
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchAllData}
              sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 600, px: 2 }}
            >
              Refresh
            </Button>
          }
        />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" }, gap: 2.5, mb: 3 }}>
          <DashboardPanel
            accent="primary"
            title="Your profile"
            subheader="Registered name, contact, and service address"
            headerIcon={<PersonOutline fontSize="small" />}
          >
            <DashboardMetricRow label="Name" value={userData.name} />
            <DashboardMetricRow label="Mobile" value={userData.mobileNumber} />
            <DashboardMetricRow label="Address" value={userData.address || "—"} />
            <DashboardMetricRow
              label="Connection ID"
              value={<Box component="span" sx={{ fontFamily: "monospace", color: "primary.main" }}>{userData.connectionId}</Box>}
            />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, pt: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Status
              </Typography>
              <Chip size="small" label={userData.status} color={userData.status === "ACTIVE" ? "success" : "error"} sx={{ fontWeight: 600 }} />
            </Box>
          </DashboardPanel>

          <DashboardPanel
            accent="warning"
            title="Outstanding balance"
            subheader={
              dueSummary
                ? `${dueSummary.unpaid_bill_count} unpaid bill(s) · Typical due by day ${dueSummary.bill_due_day} of the month`
                : "Pending water charges. Refresh after new meter readings are posted."
            }
            headerIcon={<AccountBalanceWallet fontSize="small" />}
            footer={
              dueAmount > 0 ? (
                <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                  <Button variant="contained" color="warning" fullWidth onClick={handlePayDue} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}>
                    Pay total due
                  </Button>
                </CardActions>
              ) : undefined
            }
          >
            <Typography variant="h4" fontWeight={800} color="warning.dark" sx={{ letterSpacing: "-0.02em" }}>
              ₹{dueAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            {dueSummary && dueSummary.unpaid_bills?.length > 0 && (
              <Box component="ul" sx={{ m: 0, mt: 2, pl: 2 }}>
                {dueSummary.unpaid_bills.slice(0, 5).map((b) => (
                  <Typography key={b.uuid} component="li" variant="body2" sx={{ mb: 0.75, color: "text.secondary" }}>
                    {b.month} {b.year}: ₹{Number(b.amount).toFixed(2)}{" "}
                    <Button
                      size="small"
                      onClick={() => setPreviewUuid(b.uuid)}
                      sx={{ fontWeight: 700, minWidth: 0, p: 0, verticalAlign: "baseline", textTransform: "none" }}
                    >
                      Print bill
                    </Button>
                  </Typography>
                ))}
                {dueSummary.unpaid_bills.length > 5 && (
                  <Typography variant="caption" color="text.secondary">…and more on the Consumption page</Typography>
                )}
              </Box>
            )}
          </DashboardPanel>

          <DashboardPanel
            accent="info"
            title="Billing overview"
            subheader="Counts from your consumption records"
            headerIcon={<WaterDrop fontSize="small" />}
          >
            <DashboardMetricRow label="Total records" value={consumptionData.length} />
            <DashboardMetricRow label="Paid bills" value={consumptionData.filter((c) => c.status === "PAID").length} />
            <DashboardMetricRow label="Unpaid bills" value={consumptionData.filter((c) => c.status === "UNPAID").length} />
          </DashboardPanel>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2.5, mb: 3 }}>
          <ConsumptionMonthCard
            title="Consumption / month"
            subheader="Usage in liters (L) and billed amount (₹) by billing period — hover bars for details"
            data={consumptionByMonth}
          />
          <PaymentsMonthCard
            title="Payments / month"
            subheader="Total payments received (₹) per calendar month"
            data={paymentsByMonth}
          />
        </Box>
      <PaymentDialog
        open={qrData !== null}
        qrData={qrData}
        contextLabel={
          qrData && qrData.bill_info
            ? `Payment for ${qrData.bill_info.month} ${qrData.bill_info.year}`
            : "Total Due Payment"
        }
        processing={processingPayment}
        onConfirm={markAsPaid}
        onClose={() => {
          setQrData(null);
          setSelectedBill(null);
          setUnpaidBillUuidsForPayment([]);
        }}
      />
      <BillPreviewDialog
        open={!!previewUuid}
        consumptionUuid={previewUuid}
        onClose={() => setPreviewUuid(null)}
      />
    </Box>
  );
};

export default UserDashboard;
