import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Box,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from "@mui/material";
import Person from "@mui/icons-material/Person";
import LocationOn from "@mui/icons-material/LocationOn";
import Key from "@mui/icons-material/Key";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Save from "@mui/icons-material/Save";
import { getUserByUUID, updateProfile } from "@/services/apiService";
import { toast } from "@/hooks/use-toast";

/**
 * Single edit page at /:uuid/edit
 * - Editing own profile: name, address, password (profile update)
 * - Admin editing any user: full user edit form
 */
const UnifiedEdit = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<{ uuid: string; role: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) {
        setCurrentUser(null);
        setReady(true);
        return;
      }
      const user = JSON.parse(stored);
      setCurrentUser({ uuid: user.uuid, role: user.role?.toUpperCase() || "USER" });
    } catch {
      setCurrentUser(null);
    }
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!uuid) return <Navigate to="/" replace />;

  const isOwnProfile = uuid === currentUser.uuid;
  const isAdmin = currentUser.role === "ADMIN";
  const canEdit = isOwnProfile || isAdmin;
  if (!canEdit) return <Navigate to="/unauthorized" replace />;

  if (isOwnProfile) {
    return <ProfileEditForm uuid={uuid} onSuccess={() => navigate(`/${uuid}`)} onCancel={() => navigate(`/${uuid}`)} />;
  }
  return <AdminUserEdit uuid={uuid} onSuccess={() => navigate("/dashboard")} onCancel={() => navigate("/dashboard")} />;
};

export default UnifiedEdit;

// --- Profile edit (self): name, address, password ---
function ProfileEditForm({ uuid, onSuccess, onCancel }: { uuid: string; onSuccess: () => void; onCancel: () => void }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState({ fullName: "", address: "", currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
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
        setFormData({ fullName: data.full_name, address: data.address, currentPassword: "", newPassword: "", confirmPassword: "" });
      })
      .catch(() => toast({ title: "Error", description: "Failed to load profile", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [uuid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
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
      onSuccess();
    } catch (error: any) {
      toast({ title: "Error", description: error?.response?.data?.message || error?.message || "Failed to update profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !userData) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.100" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 672, mx: "auto", width: "100%" }}>
        <Box sx={{ mb: 2 }}>
        </Box>
        <form onSubmit={handleSubmit}>
          <Card sx={{ mb: 2 }} variant="outlined">
            <CardHeader title={<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Person color="primary" /> Account (read-only)</Box>} subheader="Connection ID, status, role, mobile" />
            <CardContent>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                <Box><Typography variant="caption" color="text.secondary">Connection ID</Typography><Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, mt: 0.5 }}><Typography variant="body2" fontFamily="monospace" fontWeight={600} color="primary.main">{userData.connectionId}</Typography></Box></Box>
                <Box><Typography variant="caption" color="text.secondary">Mobile</Typography><Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, mt: 0.5 }}><Typography variant="body2" fontWeight={500}>{userData.mobileNumber}</Typography></Box></Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ mb: 2 }} variant="outlined">
            <CardHeader title="Edit Profile" subheader="Update your personal information" />
            <CardContent>
              <TextField fullWidth label="Full Name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} sx={{ mb: 2 }} InputProps={{ startAdornment: <InputAdornment position="start"><Person fontSize="small" /></InputAdornment> }} />
              <TextField fullWidth label="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" /></InputAdornment> }} />
            </CardContent>
          </Card>
          <Card sx={{ mb: 2 }} variant="outlined">
            <CardHeader title={<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Key color="primary" /> Change Password</Box>} subheader="Leave blank to keep current password" />
            <CardContent>
              <TextField fullWidth type={showCurrentPassword ? "text" : "password"} label="Current Password" value={formData.currentPassword} onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })} sx={{ mb: 2 }} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)}>{showCurrentPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }} />
              <TextField fullWidth type={showNewPassword ? "text" : "password"} label="New Password" value={formData.newPassword} onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })} sx={{ mb: 2 }} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowNewPassword(!showNewPassword)}>{showNewPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }} />
              <TextField fullWidth type={showConfirmPassword ? "text" : "password"} label="Confirm New Password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }} />
            </CardContent>
          </Card>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button type="button" variant="outlined" onClick={onCancel}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={20} /> : <Save />}>{saving ? "Saving..." : "Save"}</Button>
          </Box>
        </form>
    </Box>
  );
}

// --- Admin user edit ---
function AdminUserEdit({ uuid, onSuccess, onCancel }: { uuid: string; onSuccess: () => void; onCancel: () => void }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    status: "ACTIVE",
    connectionId: "",
    paymentStatus: "PENDING",
    lineNo: "",
    dueAmount: "",
    supplyTime: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserByUUID(uuid)
      .then((data: any) => {
        setFormData({
          name: data.full_name || data.name || "",
          mobile: data.mobile_number || data.mobile || "",
          status: data.status || "ACTIVE",
          connectionId: data.connection_id || "",
          paymentStatus: data.payment_status || "PENDING",
          lineNo: data.line_no || "",
          dueAmount: String(data.dueAmount ?? data.due_amount ?? ""),
          supplyTime: data.supply_time || "",
        });
      })
      .catch(() => toast({ title: "Error", description: "Failed to load user", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [uuid]);

  const handleChange = (field: string, value: string) => setFormData((prev) => ({ ...prev, [field]: value }));
  const handleSubmit = () => {
    onSuccess();
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.100" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 896, mx: "auto", width: "100%" }}>
        <Card variant="outlined">
          <CardHeader sx={{ bgcolor: "primary.main", color: "white", py: 2 }} title="Edit User Details" />
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3 }}>
              <TextField label="Name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} fullWidth />
              <TextField label="Mobile Number" value={formData.mobile} aria-readonly={true} fullWidth sx={{ "& .MuiInputBase-input": { bgcolor: "grey.100" } }} />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={formData.status} label="Status" onChange={(e) => handleChange("status", e.target.value)}>
                  <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                  <MenuItem value="DELETED">DELETED</MenuItem>
                  <MenuItem value="REVOKE">REVOKE</MenuItem>
                </Select>
              </FormControl>
              <TextField label="Connection ID" value={formData.connectionId} onChange={(e) => handleChange("connectionId", e.target.value)} fullWidth />
              <FormControl fullWidth>
                <InputLabel>Payment Status</InputLabel>
                <Select value={formData.paymentStatus} label="Payment Status" onChange={(e) => handleChange("paymentStatus", e.target.value)}>
                  <MenuItem value="PENDING">PENDING</MenuItem>
                  <MenuItem value="COMPLETED">COMPLETED</MenuItem>
                </Select>
              </FormControl>
              <TextField label="Line No" value={formData.lineNo} onChange={(e) => handleChange("lineNo", e.target.value)} fullWidth />
              <TextField label="Due Amount" type="number" value={formData.dueAmount} onChange={(e) => handleChange("dueAmount", e.target.value)} fullWidth
      InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
              <TextField label="Supply Time (minutes)" type="number" value={formData.supplyTime} onChange={(e) => handleChange("supplyTime", e.target.value)} fullWidth />
            </Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 3 }}>
              <Button variant="outlined" onClick={onCancel}>Cancel</Button>
              <Button variant="contained" onClick={handleSubmit}>Save</Button>
            </Box>
          </CardContent>
        </Card>
    </Box>
  );
}
