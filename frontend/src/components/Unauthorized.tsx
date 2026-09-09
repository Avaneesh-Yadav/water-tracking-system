import { useNavigate } from "react-router-dom";
import { Box, Typography, Button } from "@mui/material";
import { AuthShell } from "@/components/auth/AuthLayout";

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <AuthShell>
      <Box
        sx={{
          position: "relative",
          zIndex: 2,
          width: "min(420px, 100%)",
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
        <Typography variant="h4" fontWeight={700} sx={{ color: "#142028", mb: 1 }}>
          Access denied
        </Typography>
        <Typography sx={{ mb: 3, color: "rgba(20, 32, 40, 0.62)" }}>
          You do not have permission to view this page.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/dashboard")}>
          Go to dashboard
        </Button>
      </Box>
    </AuthShell>
  );
};

export default Unauthorized;
