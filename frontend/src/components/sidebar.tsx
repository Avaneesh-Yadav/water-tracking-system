import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
  Collapse,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
} from "@mui/material";
import Home from "@mui/icons-material/Home";
import Person from "@mui/icons-material/Person";
import PersonAdd from "@mui/icons-material/PersonAdd";
import People from "@mui/icons-material/People";
import BadgeOutlined from "@mui/icons-material/BadgeOutlined";
import WaterDrop from "@mui/icons-material/WaterDrop";
import Payment from "@mui/icons-material/Payment";
import Settings from "@mui/icons-material/Settings";
import Logout from "@mui/icons-material/Logout";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import MenuClose from "@mui/icons-material/Menu";
import MenuOpen from "@mui/icons-material/MenuOpen";
import ListIcon from "@mui/icons-material/List";
import Assessment from "@mui/icons-material/Assessment";
import CloudUpload from "@mui/icons-material/CloudUpload";
import HelpOutline from "@mui/icons-material/HelpOutline";
import { logout as logoutService } from "@/services/accountService";
import CreateUserDialog from "@/components/CreateUserDialog";

const DRAWER_WIDTH = 260;
const COLLAPSED_DRAWER_WIDTH = 72;

const isSelected = (pathname: string, to: string, profileTo: string) => {
  if (to === "/dashboard") return pathname === "/dashboard";
  if (to === profileTo) return pathname === profileTo || (pathname.startsWith("/") && pathname.length > 1 && pathname === profileTo);
  return pathname === to || pathname.startsWith(to + "/");
};

export const sidebarDrawerWidth = DRAWER_WIDTH;
export const sidebarCollapsedWidth = COLLAPSED_DRAWER_WIDTH;

/** Nav drawer background – glass tint behind frosted UI */
const NAV_BG = "rgba(255,255,255,0.11)";

const Sidebar = ({
  open,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: {
  open?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [profileOpen, setProfileOpen] = React.useState(true);
  const [createUserOpen, setCreateUserOpen] = React.useState(false);
  const [actionsAnchor, setActionsAnchor] = React.useState<null | HTMLElement>(null);
  const isLight = theme.palette.mode === "light";
  const navHoverBg = isLight ? "rgba(56, 189, 248, 0.18)" : "rgba(255,255,255,0.08)";
  const navSelectedBg = isLight ? "rgba(56, 189, 248, 0.35)" : "primary.main";
  const navSelectedHoverBg = isLight ? "rgba(56, 189, 248, 0.5)" : "primary.dark";
  const navTextDefault = isLight ? "rgba(13, 79, 115, 0.95)" : "rgba(248,250,252,0.95)";
  const navTextSelected = isLight ? "rgba(13, 79, 115, 0.95)" : "rgba(248,250,252,0.95)";

  let profileTo = "/";
  let role: string = "USER";
  try {
    const stored = localStorage.getItem("user");
    if (stored) {
      const user = JSON.parse(stored);
      if (user?.uuid) profileTo = `/${user.uuid}`;
      role = (user?.role || "USER").toUpperCase();
    }
  } catch {
    /* ignore invalid JSON in localStorage */
  }

  const handleLogout = async () => {
    await logoutService();
    onClose?.();
    navigate("/", { replace: true });
  };

  const handleNav = () => {
    if (isMobile) onClose?.();
  };

  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  /** On mobile, always show full labels even if desktop sidebar was left collapsed */
  const showFullLabels = !collapsed || isMobile;

  const mainItems = [
    { to: "/dashboard", label: "Dashboard", icon: <Home /> },
    ...(isAdmin ? [{ to: "/consumers", label: "Consumers", icon: <People /> }] : []),
    ...(isAdmin ? [{ to: "/employees", label: "Employee(s)", icon: <BadgeOutlined /> }] : []),
    ...(isAdmin ? [{ to: "/reports", label: "Reports", icon: <Assessment /> }] : []),
    ...(isAdmin ? [{ to: "/bulk", label: "Bulk ops", icon: <CloudUpload /> }] : []),
    { to: "/consumption", label: "Consumption", icon: <WaterDrop /> },
    { to: "/payments", label: "Payments", icon: <Payment /> },
    { to: "/help", label: "Help", icon: <HelpOutline /> },
  ];

  const drawerContent = (
    <>
      {/* Top: AquaFlow branding (icon + text when expanded, icon only when minimized) + toggle */}
      <Box
        sx={{
          pt: 2,
          pb: 1.5,
          px: showFullLabels ? 1.5 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: showFullLabels ? "space-between" : "center",
          gap: 1.5,
          flexWrap: "wrap",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            minWidth: 0,
            flex: showFullLabels ? 1 : "none",
            justifyContent: showFullLabels ? "flex-start" : "center",
          }}
        >
          {showFullLabels && (
            <>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  bgcolor: "rgba(255,255,255,0.95)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <WaterDrop sx={{ fontSize: 24, color: "primary.dark" }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, lineHeight: 1.2, color: navTextDefault }}
                >
                  AquaFlow
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: navTextDefault, lineHeight: 1.2, display: "block", opacity: 0.82 }}
                >
                  Water Management System
                </Typography>
              </Box>
            </>
          )}
        </Box>
        {!isMobile && onToggleCollapse && (
          <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <IconButton
              size="small"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: isLight ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
                color: navTextDefault,
                "&:hover": {
                  bgcolor: isLight ? "rgba(56, 189, 248, 0.35)" : "rgba(255,255,255,0.18)",
                  borderColor: isLight ? "rgba(56, 189, 248, 0.5)" : "rgba(255,255,255,0.3)",
                },
              }}
            >
              {collapsed ? <MenuClose fontSize="small" /> : <MenuOpen fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <List sx={{ flex: 1, pt: 1 }}>
        {mainItems.map((item) => {
          const selected = isSelected(location.pathname, item.to, profileTo);
          const btn = (
            <ListItemButton
              key={item.label}
              component={Link}
              to={item.to}
              selected={selected}
              onClick={handleNav}
              sx={{
              justifyContent: showFullLabels ? "flex-start" : "center",
              borderRadius: 1,
              mx: showFullLabels ? 1 : 0.5,
                transition: "background-color 0.2s ease, box-shadow 0.2s ease",
                "&.Mui-selected": {
                  bgcolor: navSelectedBg,
                  color: navTextSelected,
                  "&:hover": { bgcolor: navSelectedHoverBg },
                },
                "&:hover": {
                  bgcolor: navHoverBg,
                  ...(isLight && { boxShadow: "0 0 0 1px rgba(56, 189, 248, 0.2)" }),
                },
                color: navTextDefault,
              }}
            >
              <ListItemIcon
                sx={{
                  color: "inherit",
                  minWidth: showFullLabels ? 40 : 0,
                  mr: showFullLabels ? 1 : 0,
                  justifyContent: "center",
                }}
              >
                {item.icon}
              </ListItemIcon>
              {showFullLabels && <ListItemText primary={item.label} />}
            </ListItemButton>
          );
          return !showFullLabels ? (
            <Tooltip key={item.label} title={item.label} placement="right">
              {btn}
            </Tooltip>
          ) : (
            btn
          );
        })}

        {/* Actions group: when collapsed show overlay panel on click only (no hover to avoid flicker) */}
        {!showFullLabels ? (
          <Tooltip title="Actions" placement="right">
            <ListItemButton
              onClick={(e) => setActionsAnchor((prev) => (prev ? null : (e.currentTarget as HTMLElement)))}
              sx={{
                color: navTextDefault,
                "&:hover": { bgcolor: navHoverBg },
                justifyContent: "center",
                px: 1.5,
                borderRadius: 1,
                mx: 0.5,
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 0, mr: 0, justifyContent: "center" }}>
                <ListIcon />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
        ) : (
          <ListItemButton
            onClick={() => setProfileOpen(!profileOpen)}
            sx={{
              color: navTextDefault,
              "&:hover": { bgcolor: navHoverBg },
              justifyContent: "flex-start",
              px: 2,
              borderRadius: 1,
              mx: 1,
            }}
          >
            <ListItemIcon sx={{ color: "inherit", minWidth: 40, mr: 1, justifyContent: "center" }}>
              <ListIcon />
            </ListItemIcon>
            <ListItemText primary="Actions" />
            {profileOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        )}
        {!showFullLabels && (
          <Menu
            open={Boolean(actionsAnchor)}
            anchorEl={actionsAnchor}
            onClose={() => setActionsAnchor(null)}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            slotProps={{
              paper: {
                sx: {
                  minWidth: 200,
                  mt: 0.5,
                  ml: 0.5,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  borderRadius: 2,
                },
              },
            }}
          >
            <MenuItem component={Link} to={profileTo} onClick={() => { handleNav(); setActionsAnchor(null); }} sx={{ "&:hover": { bgcolor: isLight ? "rgba(56, 189, 248, 0.12)" : undefined } }}>
              <ListItemIcon><Person fontSize="small" /></ListItemIcon>
              <ListItemText primary="My Profile" />
            </MenuItem>
            {isAdmin && (
              <MenuItem
                onClick={() => {
                  setCreateUserOpen(true);
                  handleNav();
                  setActionsAnchor(null);
                }}
                sx={{ "&:hover": { bgcolor: isLight ? "rgba(56, 189, 248, 0.12)" : undefined } }}
              >
                <ListItemIcon><PersonAdd fontSize="small" /></ListItemIcon>
                <ListItemText primary="Register" />
              </MenuItem>
            )}
            <MenuItem component={Link} to="/settings" onClick={() => { handleNav(); setActionsAnchor(null); }} sx={{ "&:hover": { bgcolor: isLight ? "rgba(56, 189, 248, 0.12)" : undefined } }}>
              <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
              <ListItemText primary="Settings" />
            </MenuItem>
          </Menu>
        )}
        <Collapse in={profileOpen && showFullLabels} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton
              component={Link}
              to={profileTo}
              selected={isSelected(location.pathname, profileTo, profileTo)}
              onClick={handleNav}
              sx={{
                pl: 4,
                borderRadius: 1,
                mx: 1,
                "&.Mui-selected": {
                  bgcolor: navSelectedBg,
                  color: navTextSelected,
                  "&:hover": { bgcolor: navSelectedHoverBg },
                },
                "&:hover": { bgcolor: navHoverBg, ...(isLight && { boxShadow: "0 0 0 1px rgba(56, 189, 248, 0.2)" }) },
                color: navTextDefault,
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                <Person sx={{ fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText primary="My Profile" />
            </ListItemButton>
            
            {isAdmin && (
              <ListItemButton
                onClick={() => {
                  setCreateUserOpen(true);
                  handleNav();
                }}
                sx={{
                  pl: 4,
                  borderRadius: 1,
                  mx: 1,
                  "&:hover": { bgcolor: navHoverBg },
                  color: navTextDefault,
                }}
              >
                <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                  <PersonAdd sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary="Register" />
              </ListItemButton>
              
            )}
            <ListItemButton
              component={Link}
              to="/settings"
              selected={location.pathname === "/settings"}
              onClick={handleNav}
              sx={{
                pl: 4,
                borderRadius: 1,
                mx: 1,
                "&.Mui-selected": {
                  bgcolor: navSelectedBg,
                  color: navTextSelected,
                  "&:hover": { bgcolor: navSelectedHoverBg },
                },
                "&:hover": { bgcolor: navHoverBg, ...(isLight && { boxShadow: "0 0 0 1px rgba(56, 189, 248, 0.2)" }) },
                color: navTextDefault,
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                <Settings sx={{ fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
          </List>
        </Collapse>

        {!showFullLabels ? (
          <Tooltip title="Logout" placement="right">
            <ListItemButton
              onClick={handleLogout}
              sx={{
                color: "error.light",
                "&:hover": { bgcolor: "error.dark", color: "white" },
                justifyContent: "center",
                borderRadius: 1,
                mx: 0.5,
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 0, mr: 0, justifyContent: "center" }}>
                <Logout />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
        ) : (
          <ListItemButton
            onClick={handleLogout}
            sx={{
              color: "error.light",
              "&:hover": { bgcolor: "error.dark", color: "white" },
              justifyContent: "flex-start",
              borderRadius: 1,
              mx: 1,
            }}
          >
            <ListItemIcon sx={{ color: "inherit", minWidth: 40, mr: 1, justifyContent: "center" }}>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        )}
      </List>
    </>
  );

  const permanentDrawer = (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH,
        flexShrink: 0,
        display: { xs: "none", md: "block" },
        "& .MuiDrawer-paper": {
          width: collapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH,
          boxSizing: "border-box",
          bgcolor: NAV_BG,
          color: navTextDefault,
          backdropFilter: "blur(34px) saturate(180%)",
          WebkitBackdropFilter: "blur(34px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRight: "1px solid rgba(255,255,255,0.22)",
          top: 0,
          height: "100vh",
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );

  const temporaryDrawer = (
    <Drawer
      variant="temporary"
      open={open ?? false}
      onClose={onClose ?? (() => {})}
      sx={{
        display: { xs: "block", md: "none" },
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
          bgcolor: NAV_BG,
          color: navTextDefault,
          backdropFilter: "blur(34px) saturate(180%)",
          WebkitBackdropFilter: "blur(34px) saturate(180%)",
          borderRight: "none",
          top: 0,
          height: "100%",
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );

  return (
    <>
      {permanentDrawer}
      {temporaryDrawer}
      <CreateUserDialog
        open={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        onUserCreated={() => setCreateUserOpen(false)}
      />
    </>
  );
};

export default Sidebar;
