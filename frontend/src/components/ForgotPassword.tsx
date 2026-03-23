import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Box,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Key from "@mui/icons-material/Key";
import Phone from "@mui/icons-material/Phone";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { toast } from "@/hooks/use-toast";
import axiosInstance from "@/utils/axiosInstance";

interface ForgotPasswordFormValues {
  mobileNumber: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [resetKey, setResetKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    defaultValues: {
      mobileNumber: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const mobileNumber = form.watch("mobileNumber");
  const newPassword = form.watch("newPassword");
  const confirmPassword = form.watch("confirmPassword");

  const handleSendOTP = async () => {
    const mobile = form.getValues("mobileNumber");
    if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
      toast({
        title: "Invalid Mobile Number",
        description: "Please enter a valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }
    try {
      const response = await axiosInstance.post("/forgot-password", { mobileNumber: mobile });
      toast({
        title: "OTP Sent",
        description: response.data.message || "OTP has been sent to your mobile",
      });
      if (response.data.otp) {
        toast({ title: "Development OTP", description: `Your OTP is: ${response.data.otp}` });
      }
      setStep(2);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        error?.response?.message ??
        error?.message ??
        "Failed to send OTP";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleVerifyOTP = async () => {
    const otp = form.getValues("otp");
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive",
      });
      return;
    }
    try {
      const response = await axiosInstance.post("/verify-otp", { mobileNumber, otp });
      setResetKey(response.data.resetKey);
      toast({ title: "OTP Verified", description: "Please enter your new password" });
      setStep(3);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        error?.response?.message ??
        error?.message ??
        "Invalid OTP";
      toast({
        title: "Verification Failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Password Mismatch", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    try {
      await axiosInstance.post("/reset-password", { mobileNumber, resetKey, newPassword });
      toast({ title: "Success", description: "Password reset successfully" });
      setTimeout(() => navigate("/login"), 1500);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        error?.response?.message ??
        error?.message ??
        "Failed to reset password";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom right, #9c27b0, #e91e63, #f44336)",
          animation: "gradient-xy 15s ease infinite",
          backgroundSize: "200% 200%",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          "& > div": {
            position: "absolute",
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.1)",
          },
        }}
      >
        <Box sx={{ width: 256, height: 256, top: -128, left: -128, animation: "float 6s ease-in-out infinite" }} />
        <Box sx={{ width: 384, height: 384, top: "50%", right: -192, animation: "float-delayed 8s ease-in-out infinite" }} />
        <Box sx={{ width: 192, height: 192, bottom: 40, left: "25%", animation: "float-slow 10s ease-in-out infinite" }} />
      </Box>

      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
          py: 2.5,
          position: "relative",
          zIndex: 10,
        }}
      >
        <Card
          sx={{
            width: "100%",
            maxWidth: 448,
            boxShadow: 24,
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            backdropFilter: "blur(24px)",
          }}
        >
          <CardHeader
            sx={{ textAlign: "center", pb: 2 }}
            avatar={
              <Box
                sx={{
                  mx: "auto",
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "linear-gradient(to bottom right, #9c27b0, #e91e63)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: 2,
                }}
              >
                <Key sx={{ fontSize: 32, color: "white" }} />
              </Box>
            }
            title={
              <Typography variant="h5" fontWeight="bold" sx={{ background: "linear-gradient(90deg, #9c27b0, #e91e63)", backgroundClip: "text", color: "transparent" }}>
                Reset Password
              </Typography>
            }
            subheader={
              step === 1
                ? "Enter your mobile number to receive OTP"
                : step === 2
                  ? "Enter the OTP sent to your mobile"
                  : "Create a new password"
            }
          />
          <CardContent>
            <form>
              {step === 1 && (
                <Controller
                  name="mobileNumber"
                  control={form.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="tel"
                      label="Mobile Number"
                      placeholder="Enter 10-digit number"
                      inputProps={{ maxLength: 10 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Phone fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                        sx: { height: 48, borderRadius: 2 },
                      }}
                      sx={{ mb: 2 }}
                    />
                  )}
                />
              )}
              {step === 2 && (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 2 }}>
                    OTP sent to: <strong>{mobileNumber}</strong>
                  </Typography>
                  <Controller
                    name="otp"
                    control={form.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Enter OTP"
                        placeholder="6-digit OTP"
                        inputProps={{ maxLength: 6 }}
                        InputProps={{ sx: { height: 48, borderRadius: 2 } }}
                        sx={{ mb: 2 }}
                      />
                    )}
                  />
                </>
              )}
              {step === 3 && (
                <>
                  <Controller
                    name="newPassword"
                    control={form.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type={showPassword ? "text" : "password"}
                        label="New Password"
                        placeholder="Enter new password"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowPassword((p) => !p)} edge="end">
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                          sx: { height: 48, borderRadius: 2 },
                        }}
                        sx={{ mb: 2 }}
                      />
                    )}
                  />
                  <Controller
                    name="confirmPassword"
                    control={form.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type={showConfirmPassword ? "text" : "password"}
                        label="Confirm Password"
                        placeholder="Confirm new password"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowConfirmPassword((p) => !p)} edge="end">
                                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                          sx: { height: 48, borderRadius: 2 },
                        }}
                        sx={{ mb: 2 }}
                      />
                    )}
                  />
                </>
              )}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {step === 1 && (
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSendOTP}
                    sx={{
                      height: 48,
                      background: "linear-gradient(90deg, #9c27b0, #e91e63)",
                      fontWeight: 600,
                      borderRadius: 2,
                    }}
                  >
                    Send OTP
                  </Button>
                )}
                {step === 2 && (
                  <>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleVerifyOTP}
                      sx={{
                        height: 48,
                        background: "linear-gradient(90deg, #9c27b0, #e91e63)",
                        fontWeight: 600,
                        borderRadius: 2,
                      }}
                    >
                      Verify OTP
                    </Button>
                    <Button variant="outlined" fullWidth onClick={handleSendOTP}>
                      Resend OTP
                    </Button>
                  </>
                )}
                {step === 3 && (
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleResetPassword}
                    sx={{
                      height: 48,
                      background: "linear-gradient(90deg, #9c27b0, #e91e63)",
                      fontWeight: 600,
                      borderRadius: 2,
                    }}
                  >
                    Reset Password
                  </Button>
                )}
              </Box>
            </form>
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
              <Button
                variant="text"
                startIcon={<ArrowBack />}
                onClick={() => navigate("/login")}
                sx={{ fontWeight: 600, color: "secondary.main" }}
              >
                Back to Login
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
      <style>{`
        @keyframes gradient-xy { 0%, 100% { background-position: 0% 0%; } 50% { background-position: 100% 100%; } }
        @keyframes float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(5deg); } }
        @keyframes float-delayed { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-30px) rotate(-5deg); } }
        @keyframes float-slow { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-15px) scale(1.05); } }
      `}</style>
    </Box>
  );
};

export default ForgotPassword;
