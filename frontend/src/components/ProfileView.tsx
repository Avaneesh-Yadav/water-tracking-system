import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import {
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  Box,
  CircularProgress,
} from "@mui/material";
import Person from "@mui/icons-material/Person";
import Phone from "@mui/icons-material/Phone";
import Edit from "@mui/icons-material/Edit";
import { getUserByUUID } from "@/services/apiService";
import { toast } from "@/hooks/use-toast";
import UserDetails from "./UserDetails";

/**
 * Single profile view at /:uuid
 * - Own profile: read-only view + Edit button → /:uuid/edit
 * - Admin viewing user: full UserDetails (same URL)
 */
const ProfileView = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<{ uuid: string; role: string } | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }
      const user = JSON.parse(stored);
      setCurrentUser({ uuid: user.uuid, role: user.role?.toUpperCase() || "USER" });
    } catch {
      setCurrentUser(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!uuid || !currentUser) {
      setLoading(false);
      return;
    }
    const isOwn = uuid === currentUser.uuid;
    const isAdminViewingOther = currentUser.role === "ADMIN" && uuid !== currentUser.uuid;
    if (!isOwn && !isAdminViewingOther) {
      setLoading(false);
      return;
    }
    if (isOwn) {
      getUserByUUID(uuid)
        .then((data) => {
          setUserData({
            uuid: data.uuid,
            fullName: data.full_name,
            mobileNumber: data.mobile_number,
            address: data.address,
            connectionId: data.connection_id,
            status: data.status,
            role: data.role,
          });
        })
        .catch(() => toast({ title: "Error", description: "Failed to load profile", variant: "destructive" }))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [uuid, currentUser]);

  if (loading && !currentUser) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.100" }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (!uuid) {
    return <Navigate to="/" replace />;
  }
  const isOwnProfile = uuid === currentUser.uuid;
  const isAdminViewingOther = currentUser.role === "ADMIN" && uuid !== currentUser.uuid;
  if (!isOwnProfile && !isAdminViewingOther) {
    return <Navigate to="/" replace />;
  }

  if (isAdminViewingOther) {
    return <UserDetails />;
  }

  if (!userData) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.100" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 672, mx: "auto", width: "100%" }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mb: 2 }}>
          <Button variant="contained" startIcon={<Edit />} onClick={() => navigate(`/${uuid}/edit`)}>
            Edit profile
          </Button>
        </Box>
        <Card sx={{ mb: 2 }} variant="outlined">
          <CardHeader
            title={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Person color="primary" />
                Account Information
              </Box>
            }
            subheader="Your account details and connection information"
          />
          <CardContent>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Connection ID</Typography>
                <Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, mt: 0.5 }}>
                  <Typography variant="body2" fontFamily="monospace" fontWeight={600} color="primary.main">{userData.connectionId}</Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Account Status</Typography>
                <Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, mt: 0.5 }}>
                  <Typography component="span" variant="body2" fontWeight={600} sx={{ px: 1.5, py: 0.5, borderRadius: 10, bgcolor: userData.status === "ACTIVE" ? "success.light" : "error.light", color: userData.status === "ACTIVE" ? "success.dark" : "error.dark" }}>{userData.status}</Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Role</Typography>
                <Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, mt: 0.5 }}>
                  <Typography component="span" variant="body2" fontWeight={600} sx={{ px: 1.5, py: 0.5, borderRadius: 10, bgcolor: userData.role === "ADMIN" ? "secondary.light" : "primary.light", color: userData.role === "ADMIN" ? "secondary.dark" : "primary.dark" }}>{userData.role}</Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Mobile Number</Typography>
                <Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, mt: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
                  <Phone fontSize="small" color="action" />
                  <Typography variant="body2" fontWeight={500}>{userData.mobileNumber}</Typography>
                  <Typography variant="caption" color="text.secondary">(Cannot be changed)</Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 2 }} variant="outlined">
          <CardHeader title="Personal details" subheader="Name and address" />
          <CardContent>
            <Typography variant="body2"><strong>Full Name:</strong> {userData.fullName}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}><strong>Address:</strong> {userData.address}</Typography>
          </CardContent>
        </Card>
    </Box>
  );
};

export default ProfileView;
