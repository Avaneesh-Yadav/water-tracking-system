import { useLocation, useNavigate } from "react-router-dom";
import { Box, Typography, Button } from "@mui/material";
import { AuthShell } from "@/components/auth/AuthLayout";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <AuthShell>
      <Box
        sx={{
          position: "relative",
          zIndex: 2,
          width: "min(440px, 100%)",
          p: 4,
          borderRadius: "32px",
          textAlign: "center",
          bgcolor: "rgba(255,255,255,0.48)",
          border: "1px solid rgba(255,255,255,0.62)",
          backdropFilter: "blur(44px) saturate(180%)",
          WebkitBackdropFilter: "blur(44px) saturate(180%)",
          boxShadow: "0 28px 70px rgba(15, 23, 42, 0.18)",
        }}
      >
        <Typography variant="h1" fontWeight={800} sx={{ color: "#0071e3", fontSize: "4rem", lineHeight: 1, mb: 1 }}>
          404
        </Typography>
        <Typography variant="h5" fontWeight={700} sx={{ color: "#142028", mb: 1 }}>
          Page not found
        </Typography>
        <Typography sx={{ mb: 3, color: "rgba(20, 32, 40, 0.62)" }}>
          {location.pathname} does not exist or has been moved.
        </Typography>
        <Button variant="contained" size="large" onClick={() => navigate("/")}>
          Go to homepage
        </Button>
      </Box>
    </AuthShell>
  );
};

export default NotFound;
