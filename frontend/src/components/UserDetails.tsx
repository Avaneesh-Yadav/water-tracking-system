import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Tabs,
  Tab,
  Card,
  CardHeader,
  CardContent,
  Avatar,
  Chip,
  Breadcrumbs,
  Skeleton,
  Divider,
  Typography,
} from "@mui/material";
import AccountBalanceWallet from "@mui/icons-material/AccountBalanceWallet";
import WaterDrop from "@mui/icons-material/WaterDrop";
import TrendingUp from "@mui/icons-material/TrendingUp";
import Edit from "@mui/icons-material/Edit";
import Visibility from "@mui/icons-material/Visibility";
import LocationOn from "@mui/icons-material/LocationOn";
import { toast } from "@/hooks/use-toast";
import ConsumptionHistory from "./ConsumptionHistory";
import PaymentHistory from "./PaymentHistory";
import { getUserByUUID, addConsumption, uploadConsumptionMeterPhoto, getConsumptionByUser, getPaymentHistoryByUser } from "@/services/apiService";
import type { ConsumptionRecord } from "@/services/apiService";

type UserProfile = {
  name: string;
  mobile: string;
  email?: string;
  address: string;
  connectionId: string;
  registeredOn: string;
  status: string;
  role?: string;
  dueAmount: number;
  paymentStatus: string;
  lastUpdated?: string;
};

const formatShortDate = (value?: string) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatCurrency = (value: number = 0) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

const getInitials = (value?: string) => {
  if (!value) return "U";
  return value
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";
};

type InsightCard = { icon: React.ElementType; label: string; value: string; meta: string };

const UserDetails = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [newReading, setNewReading] = useState("");
  const [prevReading, setPrevReading] = useState("");
  const [currReading, setCurrReading] = useState("");
  const [meterPhoto, setMeterPhoto] = useState<File | null>(null);
  const meterPhotoInputRef = useRef<HTMLInputElement>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [consumptionData, setConsumptionData] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [logReadingLoading, setLogReadingLoading] = useState(false);
  const navigate = useNavigate();
  const { uuid } = useParams();
  const tabsCardRef = useRef<HTMLDivElement>(null);

  const mapConsumptionToTable = (records: ConsumptionRecord[]): { id?: string; month: string; reading: number; prevReading?: number; currReading?: number; consumption: number; amount: number; status: string; meter_photo_path?: string | null }[] => {
    return records.map((r) => ({
      id: r.uuid,
      month: `${r.month} ${r.year}`,
      reading: r.current_meter_reading != null ? Number(r.current_meter_reading) : Number(r.consumption_liters) || 0,
      prevReading: r.previous_meter_reading != null ? Number(r.previous_meter_reading) : undefined,
      currReading: r.current_meter_reading != null ? Number(r.current_meter_reading) : undefined,
      consumption: Number(r.consumption_liters) || 0,
      amount: Number(r.amount) || 0,
      status: r.status === "PAID" ? "Paid" : "Unpaid",
      meter_photo_path: r.meter_photo_path,
    }));
  };

  const mapPaymentHistoryForDisplay = (payments: any[]): { rowKey: string; id: string; date: string; month: string; amount: number; method: string }[] => {
    return (payments || []).map((p, i) => ({
      rowKey: p.uuid || `pay-${p.paid_at ?? ""}-${p.amount ?? ""}-${i}`,
      id: p.transaction_id || p.uuid || "—",
      date: formatShortDate(p.paid_at),
      month: p.month && p.year != null ? `${p.month} ${p.year}` : "—",
      amount: p.amount ?? 0,
      method: p.payment_method || "—",
    }));
  };

  /** Due amount derived from consumption so it updates when readings are added */
  const dueAmountFromConsumption = consumptionData
    .filter((c) => c.status === "Unpaid")
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const fetchProfile = async () => {
    if (!uuid) return;
    setIsLoading(true);
    try {
      const [data, consumptionHistory, payments] = await Promise.all([
        getUserByUUID(uuid),
        getConsumptionByUser(uuid),
        getPaymentHistoryByUser(uuid),
      ]);
      setUserData({
        name: data.full_name || data.name || "Unknown User",
        mobile: data.mobile_number || data.mobile || "—",
        email: data.email,
        address: data.address || "Not provided",
        connectionId: data.connection_id || "—",
        registeredOn: formatShortDate(data.created_at),
        status: data.status || "ACTIVE",
        role: data.role || data.user_role || "USER",
        dueAmount: 0, // derived from consumptionData below
        paymentStatus: data.payment_status || "PENDING",
        lastUpdated: data.updated_at,
      });
      const sortedConsumption = [...(consumptionHistory || [])].sort(
        (a, b) => new Date((b.created_at as string) || 0).getTime() - new Date((a.created_at as string) || 0).getTime()
      );
      const sortedPayments = [...(payments || [])].sort((a, b) => new Date((b.paid_at as string) || 0).getTime() - new Date((a.paid_at as string) || 0).getTime());
      setConsumptionData(mapConsumptionToTable(sortedConsumption));
      setPaymentHistory(mapPaymentHistoryForDisplay(sortedPayments));
    } catch (err) {
      toast({ title: "Error", description: "Failed to load user details.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshConsumption = async () => {
    if (!uuid) return;
    try {
      const history = await getConsumptionByUser(uuid);
      const sorted = [...(history || [])].sort(
        (a, b) => new Date((b.created_at as string) || 0).getTime() - new Date((a.created_at as string) || 0).getTime()
      );
      setConsumptionData(mapConsumptionToTable(sorted));
    } catch {
      toast({ title: "Error", description: "Failed to refresh consumption.", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [uuid]);

  const handleAddReading = async () => {
    if (!uuid) return;
    const now = new Date();
    const month = now.toLocaleString("en-IN", { month: "short" });
    const year = now.getFullYear();

    const prevN = prevReading.trim() === "" ? NaN : Number(prevReading);
    const currN = currReading.trim() === "" ? NaN : Number(currReading);
    const singleN = newReading.trim() === "" ? NaN : Number(newReading);

    const usePair = !Number.isNaN(prevN) && !Number.isNaN(currN);
    const useSingle = !usePair && !Number.isNaN(singleN) && singleN >= 0;

    if (!usePair && !useSingle) {
      toast({
        title: "Invalid input",
        description: "Enter either total consumption (L), or both previous and current meter readings.",
        variant: "destructive",
      });
      return;
    }

    setLogReadingLoading(true);
    try {
      const payload: Parameters<typeof addConsumption>[0] = {
        user_uuid: uuid,
        month,
        year,
      };
      if (usePair) {
        payload.previous_meter_reading = prevN;
        payload.current_meter_reading = currN;
      } else {
        payload.consumption_liters = singleN;
      }

      const res = await addConsumption(payload);
      const newUuid = res?.consumption?.uuid as string | undefined;
      if (meterPhoto && newUuid) {
        try {
          await uploadConsumptionMeterPhoto(newUuid, meterPhoto);
        } catch {
          toast({ title: "Photo upload failed", description: "Reading was saved; upload the photo again from admin if needed.", variant: "destructive" });
        }
      }
      toast({ title: "Reading logged", description: "Consumption recorded successfully." });
      setNewReading("");
      setPrevReading("");
      setCurrReading("");
      setMeterPhoto(null);
      if (meterPhotoInputRef.current) meterPhotoInputRef.current.value = "";
      await refreshConsumption();
    } catch {
      toast({ title: "Error", description: "Failed to log reading.", variant: "destructive" });
    } finally {
      setLogReadingLoading(false);
    }
  };

  const totalConsumption = consumptionData.reduce(
    (sum: number, entry: any) => sum + (Number(entry?.consumption) || 0),
    0
  );
  const totalPaid = paymentHistory.reduce(
    (sum: number, p: any) => sum + (Number(p?.amount) || 0),
    0
  );
  const lastPayment = paymentHistory[0];
  const displayDueAmount = dueAmountFromConsumption;
  const handleEditUser = () => { if (uuid) navigate(`/${uuid}/edit`); };
  const handleViewAsUser = () => {
    setActiveTab(0);
    setTimeout(() => tabsCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const handleJumpToPayments = () => {
    setActiveTab(1);
    setTimeout(() => tabsCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  if (isLoading) {
    return (
      <Box sx={{ maxWidth: 1280, mx: "auto", px: 2, py: 3 }}>
          <Skeleton variant="rectangular" width={200} height={48} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 2 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <Skeleton variant="rectangular" height={256} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={256} sx={{ borderRadius: 2 }} />
          </Box>
        </Box>
    );
  }

  if (!userData) {
    return (
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
          <Card sx={{ maxWidth: 400 }} variant="outlined">
            <CardHeader title="Unable to load profile" subheader="We couldn't find details for this user. Please try again or return to the dashboard." />
            <CardContent sx={{ display: "flex", gap: 2 }}>
              <Button variant="outlined" fullWidth onClick={() => navigate("/dashboard")}>Dashboard</Button>
              <Button variant="contained" fullWidth onClick={fetchProfile}>Retry</Button>
            </CardContent>
          </Card>
      </Box>
    );
  }

  const isAdminProfile = userData.role?.toUpperCase() === "ADMIN";
  const insights: InsightCard[] = [
    { icon: AccountBalanceWallet, label: "Outstanding Due", value: formatCurrency(displayDueAmount), meta: `Payment status: ${userData.paymentStatus}` },
    ...(!isAdminProfile ? [
      { icon: WaterDrop, label: "Total Consumption", value: `${totalConsumption.toLocaleString("en-IN")} L`, meta: `${consumptionData.length || 0} months tracked` },
      { icon: TrendingUp, label: "Payments Received", value: formatCurrency(totalPaid), meta: lastPayment ? `Last payment on ${lastPayment.date}` : "No payments recorded yet" },
    ] : []),
  ];

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto", width: "100%" }}>
      <Typography
        variant="h5"
        fontWeight={600}
        sx={{ mb: 2, color: "text.primary", display: "inline-flex", alignItems: "center", gap: 1, px: 0.5, borderRadius: 1, bgcolor: "action.hover" }}
      >
        User details
      </Typography>
      <Breadcrumbs sx={{ mb: 2 }} aria-label="breadcrumb">
        <Link to="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>Dashboard</Link>
        <Link to="/consumers" style={{ color: "inherit", textDecoration: "none" }}>Consumers</Link>
        <Typography color="text.primary">{userData.name}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 320px" }, gap: 2, mb: 2 }}>
        <Card variant="outlined">
          <CardContent sx={{ pt: 2 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 600 }}>
                {getInitials(userData.name)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <Typography variant="h6">{userData.name}</Typography>
                  <Chip size="small" label={userData.role} color="primary" variant="outlined" />
                  <Chip size="small" label={userData.status} color={userData.status === "ACTIVE" ? "success" : "default"} />
                </Box>
                <Typography variant="body2" color="text.secondary">Connection #{userData.connectionId}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Mobile: {userData.mobile} · Joined {userData.registeredOn}</Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" }, gap: 2 }}>
              {insights.map((insight) => (
                <Box key={insight.label} sx={{ p: 1.5, borderRadius: 1.5, border: 1, borderColor: "divider", bgcolor: "background.default" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontSize: "0.7rem" }}>{insight.label}</Typography>
                  <Typography variant="body1" fontWeight={600}>{insight.value}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">{insight.meta}</Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ mt: 2, p: 1.5, borderRadius: 1.5, border: 1, borderColor: "divider", display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <LocationOn sx={{ color: "text.secondary", fontSize: 20, mt: 0.25 }} />
              <Box>
                <Typography variant="caption" color="text.secondary">Service address</Typography>
                <Typography variant="body2" fontWeight={500}>{userData.address}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardHeader title="Actions" subheader="Manage account" />
          <CardContent sx={{ pt: 0, display: "flex", flexDirection: "column", gap: 1 }}>
            <Button variant="contained" fullWidth startIcon={<Edit />} onClick={handleEditUser}>Edit profile</Button>
            <Button variant="outlined" fullWidth startIcon={<Visibility />} onClick={handleViewAsUser}>View consumption</Button>
            <Button variant="outlined" fullWidth startIcon={<AccountBalanceWallet />} onClick={handleJumpToPayments}>Payment history</Button>
          </CardContent>
        </Card>
      </Box>

        {!isAdminProfile && (
          <>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2, mb: 2 }}>
              <Card variant="outlined">
                <CardHeader
                  title="Record a new reading"
                  subheader="Option A: total consumption (L). Option B: previous + current meter readings (consumption = current − previous). Optional photo."
                />
                <CardContent sx={{ pt: 0 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Total consumption for period (liters)
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    label="Consumption (L) — if not using readings below"
                    placeholder="e.g. 420"
                    value={newReading}
                    onChange={(e) => setNewReading(e.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                    sx={{ mb: 2 }}
                    size="small"
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Or meter readings (prev → current)
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mb: 2 }}>
                    <TextField
                      type="number"
                      label="Previous reading"
                      value={prevReading}
                      onChange={(e) => setPrevReading(e.target.value)}
                      inputProps={{ step: 0.01 }}
                      size="small"
                    />
                    <TextField
                      type="number"
                      label="Current reading"
                      value={currReading}
                      onChange={(e) => setCurrReading(e.target.value)}
                      inputProps={{ step: 0.01 }}
                      size="small"
                    />
                  </Box>
                  <Button variant="outlined" component="label" fullWidth sx={{ mb: 2 }} size="small">
                    {meterPhoto ? meterPhoto.name : "Optional meter photo (JPEG/PNG)"}
                    <input
                      ref={meterPhotoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      hidden
                      onChange={(e) => setMeterPhoto(e.target.files?.[0] ?? null)}
                    />
                  </Button>
                  <Button variant="contained" fullWidth onClick={handleAddReading} disabled={logReadingLoading}>
                    {logReadingLoading ? "Logging…" : "Log reading"}
                  </Button>
                </CardContent>
              </Card>
              <Card variant="outlined">
                <CardHeader title="Billing summary" />
                <CardContent sx={{ pt: 0 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Outstanding due</Typography>
                    <Typography variant="h6" fontWeight={600}>{formatCurrency(displayDueAmount)}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 1.5, borderTop: 1, borderColor: "divider" }}>
                    <Typography variant="body2" color="text.secondary">Last payment</Typography>
                    <Typography variant="body2">{lastPayment ? lastPayment.date : "—"}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box ref={tabsCardRef} sx={{ mt: 2 }}>
              <Card variant="outlined">
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
                  <Tab label="Consumption history" />
                  <Tab label="Payment history" />
                </Tabs>
                <CardContent sx={{ pt: 0 }}>
                  {activeTab === 0 && (
                    consumptionData.length ? (
                      <ConsumptionHistory data={consumptionData} />
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                        No consumption records yet. Add a meter reading above.
                      </Typography>
                    )
                  )}
                  {activeTab === 1 && <PaymentHistory data={paymentHistory} />}
                </CardContent>
              </Card>
            </Box>
          </>
        )}

        {isAdminProfile && (
          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardHeader title="Admin account overview" subheader="Consumption, billing, and meter reading workflows are hidden for administrator profiles." />
          </Card>
        )}
    </Box>
  );
};

export default UserDetails;
