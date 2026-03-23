import React from "react";
import { useNavigate } from "react-router-dom";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import Logout from "@mui/icons-material/Logout";

interface HeaderProps {
  userRole: "USER" | "ADMIN" | string;
  showDashboardButton?: boolean;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  showDashboardButton = true,
  userRole,
  onLogout,
}) => {
  const navigate = useNavigate();
  const getDashboardUrl = () => "/";

  return (
    <AppBar position="static" sx={{ background: "linear-gradient(90deg, #1565c0, #1976d2)" }}>
      <Toolbar sx={{ maxWidth: 1280, mx: "auto", width: "100%", px: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
          💧 WaterBill Manager
        </Typography>
        <Box>
          {showDashboardButton && (
            <Button
              color="inherit"
              variant="outlined"
              sx={{ mr: 1, borderColor: "rgba(255,255,255,0.5)" }}
              onClick={() => navigate(getDashboardUrl())}
            >
              Dashboard
            </Button>
          )}
          <Button
            color="inherit"
            startIcon={<Logout />}
            onClick={onLogout}
            sx={{ "&:hover": { bgcolor: "rgba(255,255,255,0.1)" } }}
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
