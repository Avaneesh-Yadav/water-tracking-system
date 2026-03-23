import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Container,
  useTheme,
} from "@mui/material";
import Login from "@mui/icons-material/Login";
import PersonAdd from "@mui/icons-material/PersonAdd";
import WaterDrop from "@mui/icons-material/WaterDrop";
import TrendingDown from "@mui/icons-material/TrendingDown";
import Security from "@mui/icons-material/Security";
import PhoneAndroid from "@mui/icons-material/PhoneAndroid";
import CreditCard from "@mui/icons-material/CreditCard";
import BarChart from "@mui/icons-material/BarChart";
import Schedule from "@mui/icons-material/Schedule";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Bolt from "@mui/icons-material/Bolt";
import People from "@mui/icons-material/People";
import ArrowForward from "@mui/icons-material/ArrowForward";

const features = [
  {
    icon: <PhoneAndroid sx={{ fontSize: 32, color: "primary.main" }} />,
    title: "Mobile Registration",
    description:
      "Quick and easy signup with just your mobile number. No lengthy forms or paperwork required.",
    color: "linear-gradient(135deg, #2196f3, #00bcd4)",
  },
  {
    icon: <BarChart sx={{ fontSize: 32, color: "success.main" }} />,
    title: "Usage Tracking",
    description:
      "Monitor your water consumption in real-time with detailed analytics and visual reports.",
    color: "linear-gradient(135deg, #4caf50, #009688)",
  },
  {
    icon: <CreditCard sx={{ fontSize: 32, color: "secondary.main" }} />,
    title: "Instant Payments",
    description:
      "Pay your bills securely online with multiple payment options. Track your payment history.",
    color: "linear-gradient(135deg, #9c27b0, #e91e63)",
  },
  {
    icon: <Security sx={{ fontSize: 32, color: "warning.main" }} />,
    title: "Secure & Safe",
    description:
      "Your data is protected with industry-standard encryption and security protocols.",
    color: "linear-gradient(135deg, #ff9800, #f44336)",
  },
  {
    icon: <Schedule sx={{ fontSize: 32, color: "info.main" }} />,
    title: "24/7 Access",
    description:
      "Access your account anytime, anywhere. Manage your water services at your convenience.",
    color: "linear-gradient(135deg, #3f51b5, #9c27b0)",
  },
  {
    icon: <TrendingDown sx={{ fontSize: 32, color: "success.dark" }} />,
    title: "Save Water",
    description:
      "Get insights and tips to reduce water consumption and save on your monthly bills.",
    color: "linear-gradient(135deg, #009688, #4caf50)",
  },
];

const stats = [
  { label: "Active Users", value: "10K+", icon: <People sx={{ fontSize: 24 }} /> },
  { label: "Water Saved", value: "50M L", icon: <WaterDrop sx={{ fontSize: 24 }} /> },
  { label: "Transactions", value: "25K+", icon: <CreditCard sx={{ fontSize: 24 }} /> },
  { label: "Uptime", value: "99.9%", icon: <Bolt sx={{ fontSize: 24 }} /> },
];

const Index = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box sx={{ position: "relative", minHeight: "100vh", bgcolor: "background.default", overflow: "hidden" }}>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          "& > div": {
            position: "absolute",
            width: 256,
            height: 256,
            borderRadius: "50%",
            filter: "blur(40px)",
            opacity: isDark ? 0.15 : 0.3,
          },
        }}
      >
        <Box sx={{ top: 40, left: 40, bgcolor: "primary.main" }} />
        <Box sx={{ top: 80, right: 40, bgcolor: "info.main", animation: "blob 7s infinite", animationDelay: "2s" }} />
        <Box sx={{ bottom: 40, left: "50%", bgcolor: "success.main", animation: "blob 7s infinite", animationDelay: "4s" }} />
      </Box>

      <Box sx={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Box
          component="header"
          sx={{
            py: 2,
            px: 2,
            bgcolor: "background.paper",
            backdropFilter: "blur(10px)",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <WaterDrop sx={{ fontSize: 28, color: "white" }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    AquaFlow
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Water Management System
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Login />}
                  onClick={() => navigate("/login")}
                  color="primary"
                >
                  Login
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PersonAdd />}
                  onClick={() => navigate("/register")}
                  color="primary"
                >
                  Register
                </Button>
              </Box>
            </Box>
          </Container>
        </Box>

        <Box component="main" sx={{ flex: 1 }}>
          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Box sx={{ display: "inline-block", mb: 2 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    boxShadow: 4,
                  }}
                >
                  <WaterDrop sx={{ fontSize: 64, color: "white" }} />
                </Box>
              </Box>
              <Typography
                variant="h3"
                fontWeight="bold"
                color="text.primary"
                sx={{ mb: 2 }}
              >
                Smart Water Management
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: "auto", mb: 3 }}>
                Monitor, manage, and conserve water with our intelligent billing system. Join thousands of users saving water and money every day.
              </Typography>
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, justifyContent: "center" }}>
                <Button
                  size="large"
                  variant="contained"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate("/register")}
                  color="primary"
                  sx={{ py: 1.5, px: 3, fontSize: "1.1rem" }}
                >
                  Start Free Today
                </Button>
                <Button size="large" variant="outlined" onClick={() => navigate("/login")} color="primary" sx={{ py: 1.5, px: 3 }}>
                  View Demo
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2, mb: 4 }}>
              {stats.map((stat, i) => (
                <Card key={i} sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
                  <CardContent sx={{ textAlign: "center", pt: 3 }}>
                    <Box sx={{ color: "primary.main", mb: 1 }}>{stat.icon}</Box>
                    <Typography variant="h4" fontWeight="bold" color="text.primary">
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>

            <Typography variant="h5" fontWeight="bold" textAlign="center" sx={{ mb: 1 }}>
              Why Choose AquaFlow?
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 3, maxWidth: 560, mx: "auto" }}>
              Everything you need to manage your water consumption and billing in one powerful platform
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2, mb: 4 }}>
              {features.map((f, i) => (
                <Card
                  key={i}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.9)",
                    border: 1,
                    borderColor: "primary.100",
                    transition: "all 0.3s",
                    "&:hover": { transform: "translateY(-8px)", boxShadow: 6 },
                  }}
                >
                  <CardHeader
                    avatar={
                      <Box sx={{ width: 56, height: 56, borderRadius: 2, background: f.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {f.icon}
                      </Box>
                    }
                    title={f.title}
                  />
                  <CardContent sx={{ pt: 0 }}>
                    <Typography variant="body2" color="text.secondary">
                      {f.description}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>

            <Card sx={{ background: "linear-gradient(90deg, #1976d2, #0288d1)", border: 0 }}>
              <CardContent sx={{ py: 4, textAlign: "center", color: "white" }}>
                <CheckCircle sx={{ fontSize: 64, mb: 2, opacity: 0.9 }} />
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
                  Ready to Start Saving Water?
                </Typography>
                <Typography sx={{ mb: 3, color: "primary.100" }}>
                  Join thousands of satisfied users who are already managing their water consumption efficiently
                </Typography>
                <Button
                  size="large"
                  variant="contained"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate("/register")}
                  sx={{ bgcolor: "white", color: "primary.main", "&:hover": { bgcolor: "grey.100" } }}
                >
                  Create Free Account
                </Button>
              </CardContent>
            </Card>
          </Container>
        </Box>

        <Box
          component="footer"
          sx={{
            py: 4,
            mt: 4,
            background: "linear-gradient(90deg, #0d47a1, #01579b)",
            color: "white",
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 3, mb: 3 }}>
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Box sx={{ bgcolor: "rgba(255,255,255,0.1)", p: 1, borderRadius: 1 }}>
                    <WaterDrop sx={{ fontSize: 24 }} />
                  </Box>
                  <Typography variant="h6" fontWeight="bold">
                    AquaFlow
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: "primary.200" }}>
                  Smart water management for a sustainable future
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  Quick Links
                </Typography>
                <Typography variant="body2" sx={{ color: "primary.200" }}>Home · About · Services · Contact</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  Resources
                </Typography>
                <Typography variant="body2" sx={{ color: "primary.200" }}>Documentation · Help · Privacy · Terms</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  Contact
                </Typography>
                <Typography variant="body2" sx={{ color: "primary.200" }}>
                  support@aquaflow.com · +91 1800-XXX-XXXX · 24/7
                </Typography>
              </Box>
            </Box>
            <Box sx={{ borderTop: 1, borderColor: "primary.800", pt: 2, textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "primary.200" }}>
                © 2025 AquaFlow. All rights reserved. | Made with 💙 for a sustainable future
              </Typography>
            </Box>
          </Container>
        </Box>
      </Box>
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
      `}</style>
    </Box>
  );
};

export default Index;
