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
import {
  getUserByUUID,
  getConsumptionHistory,
  getPaymentHistory,
  getDueAmount,
  generatePaymentQR,
  notifyPaymentCompleted,
  ConsumptionRecord,
  PaymentRecord,
  QRData,
} from "@/services/apiService";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import PaymentDialog from "@/components/PaymentDialog";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const UserDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [selectedBill, setSelectedBill] = useState<ConsumptionRecord | null>(null);
  /** When paying "total due", list of unpaid consumption UUIDs to mark PAID so due amount updates */
  const [unpaidBillUuidsForPayment, setUnpaidBillUuidsForPayment] = useState<string[]>([]);
  const [processingPayment, setProcessingPayment] = useState(false);

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
      const due = await getDueAmount();
      setDueAmount(parseFloat(String(due)) || 0);
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

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const lastPayment = useMemo(() => {
    if (paymentHistory.length === 0) return null;
    return [...paymentHistory].sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())[0];
  }, [paymentHistory]);

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
      <Box sx={{ maxWidth: 1280, mx: "auto", width: "100%", p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Skeleton variant="text" width={280} height={40} />
          <Skeleton variant="rounded" width={100} height={40} />
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" }, gap: 2, mb: 3 }}>
          <Card sx={{ borderRadius: 2 }}>
            <CardHeader title={<Skeleton variant="text" width={180} height={28} />} />
            <CardContent sx={{ pt: 0 }}>
              <Skeleton variant="text" width="80%" height={24} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="70%" height={24} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="90%" height={24} />
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 2 }}>
            <CardHeader title={<Skeleton variant="text" width={120} height={28} />} subheader={<Skeleton variant="text" width={200} height={20} sx={{ mt: 0.5 }} />} />
            <CardContent sx={{ pt: 0 }}><Skeleton variant="text" width={100} height={48} /></CardContent>
          </Card>
          <Card sx={{ borderRadius: 2 }}>
            <CardHeader title={<Skeleton variant="text" width={140} height={28} />} />
            <CardContent sx={{ pt: 0 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="text" width="100%" height={24} sx={{ mb: 0.5 }} />
              ))}
            </CardContent>
          </Card>
        </Box>
        <Card sx={{ borderRadius: 2 }}>
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
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h5" fontWeight={600}>Welcome, {userData.name} 👋</Typography>
          <Button variant="outlined" startIcon={<Refresh />} onClick={fetchAllData}>Refresh</Button>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" }, gap: 2, mb: 3 }}>
          <Card sx={{ borderRadius: 2 }}>
            <CardHeader title="📄 Personal Information" />
            <CardContent sx={{ pt: 0 }}>
              <Typography variant="body2"><strong>Name:</strong> {userData.name}</Typography>
              <Typography variant="body2"><strong>Mobile:</strong> {userData.mobileNumber}</Typography>
              <Typography variant="body2"><strong>Address:</strong> {userData.address}</Typography>
              <Typography variant="body2" component="div"><strong>Connection ID:</strong> <Box component="span" sx={{ fontFamily: "monospace", color: "primary.main" }}>{userData.connectionId}</Box></Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                <Typography variant="body2" component="span"><strong>Status:</strong></Typography>
                <Chip size="small" label={userData.status} color={userData.status === "ACTIVE" ? "success" : "error"} />
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 2, bgcolor: "warning.50" }}>
            <CardHeader
              title="💰 Due Amount"
              subheader="Total pending payment. Use Refresh if admin added new readings."
            />
            <CardContent sx={{ pt: 0 }}>
              <Typography variant="h4" fontWeight="bold" color="warning.dark">₹{dueAmount.toFixed(2)}</Typography>
            </CardContent>
            <CardActions>
              {dueAmount > 0 && (
                <Button variant="contained" color="warning" fullWidth onClick={handlePayDue}>Pay Total Due</Button>
              )}
            </CardActions>
          </Card>
          <Card sx={{ borderRadius: 2 }}>
            <CardHeader title="📊 Consumption Stats" subheader="Your water usage overview" />
            <CardContent sx={{ pt: 0 }}>
              <Typography variant="body2"><strong>Total Records:</strong> {consumptionData.length}</Typography>
              <Typography variant="body2"><strong>Paid Bills:</strong> {consumptionData.filter((c) => c.status === "PAID").length}</Typography>
              <Typography variant="body2"><strong>Unpaid Bills:</strong> {consumptionData.filter((c) => c.status === "UNPAID").length}</Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2, mb: 3 }}>
          <Card sx={{ borderRadius: 2, border: 1, borderColor: "grey.200" }}>
            <CardHeader title="Consumption / month" subheader="Usage in liters (L) and amount (₹) by billing period" />
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
            <CardHeader title="Payments / month" subheader="Total payments (₹) by month" />
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
    </Box>
  );
};

export default UserDashboard;
