import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
} from "@mui/material";
import Person from "@mui/icons-material/Person";
import Phone from "@mui/icons-material/Phone";
import LocationOn from "@mui/icons-material/LocationOn";
import Key from "@mui/icons-material/Key";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Save from "@mui/icons-material/Save";
import { getUserByUUID, updateProfile } from "@/services/apiService";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userData, setUserData] = useState({
    uuid: "",
    fullName: "",
    mobileNumber: "",
    address: "",
    connectionId: "",
    status: "",
    role: "",
  });
  const [formData, setFormData] = useState({
    fullName: "",
    address: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        navigate("/login");
        return;
      }
      const user = JSON.parse(storedUser);
      const data = await getUserByUUID(user.uuid);
      setUserData({
        uuid: data.uuid,
        fullName: data.full_name,
        mobileNumber: data.mobile_number,
        address: data.address,
        connectionId: data.connection_id,
        status: data.status,
        role: data.role,
      });
      setFormData({
        fullName: data.full_name,
        address: data.address,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to load profile data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
      return;
    }
    if (formData.newPassword && formData.newPassword.length < 6) {
      toast({ title: "Error", description: "New password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (formData.newPassword && !formData.currentPassword) {
      toast({ title: "Error", description: "Current password is required to change password", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const updateData: any = {};
      if (formData.fullName !== userData.fullName) updateData.fullName = formData.fullName;
      if (formData.address !== userData.address) updateData.address = formData.address;
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }
      if (Object.keys(updateData).length === 0) {
        toast({ title: "Info", description: "No changes to save" });
        setSaving(false);
        return;
      }
      await updateProfile(updateData);
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (updateData.fullName) {
        storedUser.fullName = updateData.fullName;
        localStorage.setItem("user", JSON.stringify(storedUser));
      }
      toast({ title: "Success", description: "Profile updated successfully" });
      setFormData({ ...formData, currentPassword: "", newPassword: "", confirmPassword: "" });
      await fetchUserData();
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to update profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.100" }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      <AppBar position="static" sx={{ background: "linear-gradient(90deg, #1565c0, #1976d2)" }}>
        <Toolbar sx={{ maxWidth: 1280, mx: "auto", width: "100%", px: 2 }}>
          <Typography variant="h6" fontWeight="bold">💧 My Profile</Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: 672, mx: "auto", px: 2, py: 3 }}>
        <form onSubmit={handleSubmit}>
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
            <CardHeader title="Edit Profile" subheader="Update your personal information" />
            <CardContent>
              <TextField fullWidth label="Full Name" placeholder="Enter your full name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} sx={{ mb: 2 }} InputProps={{ startAdornment: <InputAdornment position="start"><Person fontSize="small" /></InputAdornment> }} />
              <TextField fullWidth label="Address" placeholder="Enter your address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" /></InputAdornment> }} />
            </CardContent>
          </Card>

          <Card sx={{ mb: 2 }} variant="outlined">
            <CardHeader title={<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Key color="primary" /> Change Password</Box>} subheader="Leave blank if you don't want to change your password" />
            <CardContent>
              <TextField fullWidth type={showCurrentPassword ? "text" : "password"} label="Current Password" placeholder="Enter current password" value={formData.currentPassword} onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })} sx={{ mb: 2 }} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)}>{showCurrentPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }} />
              <TextField fullWidth type={showNewPassword ? "text" : "password"} label="New Password" placeholder="Enter new password" value={formData.newPassword} onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })} sx={{ mb: 2 }} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowNewPassword(!showNewPassword)}>{showNewPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }} />
              <TextField fullWidth type={showConfirmPassword ? "text" : "password"} label="Confirm New Password" placeholder="Confirm new password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }} />
            </CardContent>
          </Card>

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={20} /> : <Save />} sx={{ background: "linear-gradient(90deg, #1976d2, #0288d1)" }}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </Box>
        </form>
      </Box>

      <Box component="footer" sx={{ bgcolor: "primary.main", color: "white", textAlign: "center", py: 2, mt: 3 }}>
        <Typography variant="body2">© 2025 WaterBill Manager. All rights reserved.</Typography>
      </Box>
    </Box>
  );
};

export default Profile;
