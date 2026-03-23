import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from "@mui/material";

const EditUser = () => {
  const { id } = useParams();
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

  useEffect(() => {
    const fetchedUser = {
      name: "John Doe",
      mobile: "1234567890",
      status: "ACTIVE",
      connectionId: "WTR-12345",
      paymentStatus: "PENDING",
      lineNo: "101",
      dueAmount: "5360",
      supplyTime: "30",
    };
    setFormData(fetchedUser);
  }, [id]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    navigate("/dashboard");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", py: 3, px: 2 }}>
      <Box sx={{ maxWidth: 896, mx: "auto" }}>
        <Card variant="outlined">
          <CardHeader sx={{ bgcolor: "primary.main", color: "white", py: 2 }} title="Edit User Details" />
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3 }}>
              <TextField label="Name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Enter name" fullWidth />
              <TextField label="Mobile Number" value={formData.mobile} readOnly fullWidth InputProps={{ readOnly: true }} sx={{ "& .MuiInputBase-input": { bgcolor: "grey.100" } }} />
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
              <TextField label="Due Amount" type="number" value={formData.dueAmount} onChange={(e) => handleChange("dueAmount", e.target.value)} fullWidth InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
              <TextField label="Supply Time (minutes)" type="number" value={formData.supplyTime} onChange={(e) => handleChange("supplyTime", e.target.value)} fullWidth />
            </Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 3 }}>
              <Button variant="outlined" onClick={() => navigate("/dashboard")}>Cancel</Button>
              <Button variant="contained" onClick={handleSubmit}>Save</Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default EditUser;
