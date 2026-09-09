import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import axiosInstance from "@/utils/axiosInstance";
import { isStaffRole, normalizeRole } from "@/utils/roles";

type ProtectedRouteProps = {
  requiredRole?: string;
};

const ProtectedRoute = ({ requiredRole }: ProtectedRouteProps) => {
  const location = useLocation();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [redirectPath, setRedirectPath] = useState<string>("");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axiosInstance.get("/profile");
        const user = response.data;
        localStorage.setItem("user", JSON.stringify(user));
        const needed = normalizeRole(requiredRole);
        const actual = normalizeRole(user.role);
        const roleOk = !needed || actual === needed || (needed === "ADMIN" && isStaffRole(actual));
        if (!roleOk) {
          setRedirectPath("/unauthorized");
          setAuthorized(false);
        } else {
          setAuthorized(true);
        }
      } catch {
        setRedirectPath("/login?error=unauthorized");
        setAuthorized(false);
      }
    };
    checkAuth();
  }, [location.pathname, requiredRole]);

  if (authorized === null) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 2,
          bgcolor: "#c8dce8",
          backgroundImage:
            "linear-gradient(160deg, rgba(186, 230, 253, 0.55) 0%, rgba(255, 255, 255, 0.35) 48%, rgba(125, 211, 252, 0.25) 100%)",
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary">Loading…</Typography>
      </Box>
    );
  }

  return authorized ? <Outlet /> : <Navigate to={redirectPath} replace />;
};

export default ProtectedRoute;
