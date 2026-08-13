import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import Menu from "@mui/icons-material/Menu";
import Notifications from "@mui/icons-material/Notifications";
import Sidebar, { sidebarDrawerWidth, sidebarCollapsedWidth } from "./sidebar";
import GlobalSearch from "./GlobalSearch";
import Footer from "./Footer";
import { getAdminUnreadNotificationCount, markAdminAllPaymentNotificationsRead } from "@/services/apiService";
import LiquidGlassAtmosphere from "./liquidGlass/LiquidGlassAtmosphere";
import { isStaffRole } from "@/utils/roles";

const TOP_BAR_HEIGHT = 56;

type LayoutProps = {
  children?: React.ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) return;
      const user = JSON.parse(stored);
      setRole((user?.role || "").toUpperCase());
    } catch {
      /* ignore invalid JSON in localStorage */
    }
  }, []);

  useEffect(() => {
    if (!isStaffRole(role)) return;
    getAdminUnreadNotificationCount()
      .then((n) => setUnreadNotifications(n))
      .catch(() => setUnreadNotifications(0));
  }, [role]);

  const sidebarWidth = sidebarCollapsed ? sidebarCollapsedWidth : sidebarDrawerWidth;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default", position: "relative", overflow: "hidden" }}>
      <LiquidGlassAtmosphere />
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppBar
          position="fixed"
          elevation={1}
          sx={{
            zIndex: theme.zIndex.drawer + 1,
            height: TOP_BAR_HEIGHT,
            left: { xs: 0, md: sidebarWidth },
            width: { xs: "100%", md: `calc(100% - ${sidebarWidth}px)` },
            boxShadow: "0 2px 18px rgba(0,0,0,0.18)",
            backgroundColor: "rgba(255,255,255,0.10)",
            backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.14), rgba(186, 230, 253, 0.10))",
            backdropFilter: "blur(34px) saturate(180%)",
            WebkitBackdropFilter: "blur(34px) saturate(180%)",
            color: "#fff",
          }}
        >
          <Toolbar sx={{ px: { xs: 1.5, sm: 2 }, gap: 1.5, minHeight: TOP_BAR_HEIGHT }}>
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="open menu"
                onClick={() => setMobileOpen(true)}
                edge="start"
                sx={{ mr: 0 }}
              >
                <Menu />
              </IconButton>
            )}
            <Box sx={{ flex: 1, minWidth: 16 }} />
            {isStaffRole(role) && (
              <IconButton
                color="inherit"
                onClick={async () => {
                  try {
                    await markAdminAllPaymentNotificationsRead();
                    setUnreadNotifications(0);
                    navigate("/payments");
                  } catch {
                    // Even if marking fails, still open payments so admin can review.
                    navigate("/payments");
                  }
                }}
                aria-label="Payment notifications"
                sx={{ mr: 1 }}
              >
                <Badge color="error" badgeContent={unreadNotifications} max={99}>
                  <Notifications />
                </Badge>
              </IconButton>
            )}
            <GlobalSearch />
          </Toolbar>
        </AppBar>
        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              width: "100%",
              mt: `${TOP_BAR_HEIGHT}px`,
              p: { xs: 2, sm: 3 },
              boxSizing: "border-box",
              display: "flex",
              justifyContent: "center",
              position: "relative",
              backgroundImage:
                "linear-gradient(180deg, rgba(13,79,115,0.14), rgba(255,255,255,0.02))",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }}
          >
            <Box sx={{ width: "100%", maxWidth: 1400, mx: "auto", position: "relative", zIndex: 1 }}>
              {children ?? <Outlet />}
            </Box>
          </Box>
          <Footer />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
