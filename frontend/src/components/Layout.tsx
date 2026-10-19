import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import Menu from "@mui/icons-material/Menu";
import Notifications from "@mui/icons-material/Notifications";
import Sidebar, { sidebarDrawerWidth, sidebarCollapsedWidth } from "./sidebar";
import GlobalSearch from "./GlobalSearch";
import Footer from "./Footer";
import { getAdminUnreadNotificationCount, markAdminAllPaymentNotificationsRead, getMyNotifications } from "@/services/apiService";
import LiquidGlassAtmosphere from "./liquidGlass/LiquidGlassAtmosphere";
import { isStaffRole } from "@/utils/roles";
import Inbox from "@mui/icons-material/Inbox";

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
  const [inboxUnread, setInboxUnread] = useState(0);
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
    getMyNotifications()
      .then((rows) => setInboxUnread(rows.filter((n) => !n.is_read).length))
      .catch(() => setInboxUnread(0));
  }, [role]);

  useEffect(() => {
    if (!isStaffRole(role)) return;
    getAdminUnreadNotificationCount()
      .then((n) => setUnreadNotifications(n))
      .catch(() => setUnreadNotifications(0));
  }, [role]);

  const sidebarWidth = sidebarCollapsed ? sidebarCollapsedWidth : sidebarDrawerWidth;
  const dark = theme.palette.mode === "dark";

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "transparent", position: "relative", overflow: "hidden" }}>
      <LiquidGlassAtmosphere dark={dark} />
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh", overflow: "hidden" }}>
        <AppBar
          position="fixed"
          elevation={1}
          sx={{
            zIndex: theme.zIndex.drawer + 1,
            height: TOP_BAR_HEIGHT,
            minHeight: TOP_BAR_HEIGHT,
            overflow: "visible",
            left: { xs: 0, md: sidebarWidth },
            width: { xs: "100%", md: `calc(100% - ${sidebarWidth}px)` },
            boxShadow: "0 2px 18px rgba(0,0,0,0.18)",
            backgroundColor: dark ? "rgba(7, 20, 28, 0.85)" : "rgba(255,255,255,0.82)",
            backgroundImage: dark
              ? "linear-gradient(90deg, rgba(7, 20, 28, 0.9), rgba(14, 48, 64, 0.8))"
              : "linear-gradient(90deg, rgba(255,255,255,0.88), rgba(224, 242, 254, 0.82))",
            backdropFilter: "blur(34px) saturate(180%)",
            WebkitBackdropFilter: "blur(34px) saturate(180%)",
            color: dark ? "#e8f1f6" : "#142028",
          }}
        >
          <Toolbar
            sx={{
              px: { xs: 1.5, sm: 2 },
              gap: 1.5,
              height: TOP_BAR_HEIGHT,
              minHeight: `${TOP_BAR_HEIGHT}px !important`,
            }}
          >
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
            <Tooltip title="Inbox">
              <IconButton color="inherit" onClick={() => navigate("/inbox")} aria-label="Inbox" sx={{ mr: 0.5 }}>
                <Badge color="error" badgeContent={inboxUnread} max={99}>
                  <Inbox />
                </Badge>
              </IconButton>
            </Tooltip>
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
        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              minHeight: 0,
              overflow: "auto",
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
