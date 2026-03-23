import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getUserByUUID } from "@/services/apiService";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Chip,
} from "@mui/material";
import Phone from "@mui/icons-material/Phone";
import Home from "@mui/icons-material/Home";
import Security from "@mui/icons-material/Security";
import CreditCard from "@mui/icons-material/CreditCard";
import CalendarToday from "@mui/icons-material/CalendarToday";
import Schedule from "@mui/icons-material/Schedule";
import dayjs from "dayjs";
import Header from "./Header";
import Footer from "./Footer";
import ConsumptionHistory from "./ConsumptionHistory";
import PaymentHistory from "./PaymentHistory";

const UserView: React.FC = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [consumptionData, setConsumptionData] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  useEffect(() => {
    if (uuid) {
      getUserByUUID(uuid)
        .then((res) => setUser(res))
        .catch((err) => console.error("Error fetching user data:", err))
        .finally(() => setLoading(false));
    }
  }, [uuid]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "text.secondary" }}>
        <Typography>Loading user details...</Typography>
      </Box>
    );
  }

  if (!user) {
    return (
      <Typography color="error" fontWeight={600} sx={{ textAlign: "center", mt: 4 }}>
        User not found
      </Typography>
    );
  }

  const formatDate = (date: string) => dayjs(date).format("MMMM D, YYYY h:mm A");
  const infoTiles = [
    { label: "Mobile Number", value: user.mobile_number, icon: Phone },
    { label: "Address", value: user.address, icon: Home },
    { label: "Role", value: user.role, icon: Security },
    { label: "Connection ID", value: user.connection_id, icon: CreditCard },
    { label: "Payment Status", value: user.payment_status, icon: CreditCard, tone: user.payment_status === "PAID" ? "success" : "warning" },
    { label: "Registered On", value: formatDate(user.created_at), icon: CalendarToday },
    { label: "Last Updated", value: formatDate(user.updated_at), icon: Schedule },
  ];

  return (
    <>
      <Header userRole="USER" />
      <Box component="main" sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
        <Box sx={{ maxWidth: 900, mx: "auto", px: 2, py: 3 }}>
          <Paper sx={{ p: 3, mb: 3 }} elevation={0} variant="outlined">
            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase" }}>Welcome back</Typography>
                <Typography variant="h5" fontWeight={600}>{user.full_name}</Typography>
                <Typography variant="body2" color="text.secondary">Connection #{user.connection_id}</Typography>
              </Box>
              <Chip label={user.status} color={user.status === "ACTIVE" ? "success" : "error"} size="small" />
            </Box>
          </Paper>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2, mb: 3 }}>
            {infoTiles.map((tile) => (
              <Paper key={tile.label} variant="outlined" sx={{ p: 2, display: "flex", alignItems: "flex-start", gap: 2 }}>
                <Box sx={{ p: 1, borderRadius: 1, bgcolor: "primary.50", color: "primary.main" }}>
                  <tile.icon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase" }}>{tile.label}</Typography>
                  <Typography variant="body2" fontWeight={600} color={tile.tone ? `${tile.tone}.main` : "text.primary"}>{tile.value}</Typography>
                </Box>
              </Paper>
            ))}
          </Box>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
              <Tab label="Consumption History" />
              <Tab label="Payment History" />
            </Tabs>
            {activeTab === 0 && <ConsumptionHistory data={consumptionData} />}
            {activeTab === 1 && <PaymentHistory data={paymentHistory} />}
          </Paper>

          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 2 }}>Thank you for staying up to date! 💧</Typography>
        </Box>
      </Box>
      <Footer />
    </>
  );
};

export default UserView;
