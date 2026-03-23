import { useNavigate } from "react-router-dom";
import { Box, Paper, Typography, Button } from "@mui/material";

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "error.main",
        p: 2,
      }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, textAlign: "center" }}>
        <Typography variant="h4" fontWeight={600} color="error.main" gutterBottom>
          Access Denied
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          You do not have permission to view this page.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/dashboard")} sx={{ bgcolor: "primary.main" }}>
          Go to Dashboard
        </Button>
      </Paper>
    </Box>
  );
};

export default Unauthorized;
