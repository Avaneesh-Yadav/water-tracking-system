import { useLocation, useNavigate } from "react-router-dom";
import { Box, Typography, Button } from "@mui/material";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(to bottom right, #f44336, #e0e0e0)",
        px: 2,
      }}
    >
      <Box sx={{ maxWidth: 400, textAlign: "center" }}>
        <Typography variant="h1" fontWeight="bold" color="primary.main" gutterBottom>
          404
        </Typography>
        <Typography variant="h5" fontWeight={600} color="text.primary" gutterBottom>
          Page Not Found
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Sorry, the page <Box component="span" sx={{ fontWeight: 600, color: "primary.main" }}>{location.pathname}</Box> does not exist or has been moved.
        </Typography>
        <Button variant="contained" size="large" onClick={() => navigate("/")}>
          Go to Homepage
        </Button>
      </Box>
    </Box>
  );
};

export default NotFound;
