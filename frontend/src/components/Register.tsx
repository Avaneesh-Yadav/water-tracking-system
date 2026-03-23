import React, { useState } from "react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../services/apiService";
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
import WaterDrop from "@mui/icons-material/WaterDrop";
import Person from "@mui/icons-material/Person";
import Phone from "@mui/icons-material/Phone";
import Map from "@mui/icons-material/Map";
import Lock from "@mui/icons-material/Lock";
import { toast } from "@/hooks/use-toast";
import { RegisterFormValues } from "@/types/user";

// Validation rules (no Zod – using react-hook-form's built-in validation).
// MUI does not provide form validation; it only provides UI (TextField, etc.).
const Register = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const methods = useForm<RegisterFormValues>({
    defaultValues: {
      fullName: "",
      mobileNumber: "",
      address: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { handleSubmit, control, formState, watch } = methods;
  const password = watch("password");

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const res = await registerUser(data);
      toast({
        title: "Registration Successful",
        description: "Your account has been created.",
      });
      const startPage = localStorage.getItem("aquaflow_settings_default_start");
      const path = startPage === "consumption" ? "/consumption" : startPage === "payments" ? "/payments" : "/dashboard";
      navigate(path);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        error?.response?.message ??
        error?.message ??
        "Something went wrong.";
      toast({
        title: "Registration Failed",
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
          background: "linear-gradient(to bottom right, #1976d2, #0288d1, #0277bd)",
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
            transition: "transform 0.3s",
            "&:hover": { transform: "scale(1.02)" },
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
                  bgcolor: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: 2,
                }}
              >
                <WaterDrop sx={{ fontSize: 32, color: "white" }} />
              </Box>
            }
            title={
              <Typography variant="h4" fontWeight="bold" color="primary">
                Create Account
              </Typography>
            }
            subheader="Join us to manage your water services"
          />
          <CardContent>
            <FormProvider {...methods}>
              <form onSubmit={handleSubmit(onSubmit)}>
                <Controller
                  name="fullName"
                  control={control}
                  rules={{ required: "Full Name is required" }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Full Name"
                      placeholder="John Doe"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Person fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                        sx: { height: 48, borderRadius: 2 },
                      }}
                      sx={{ mb: 2 }}
                    />
                  )}
                />
                <Controller
                  name="mobileNumber"
                  control={control}
                  rules={{
                    required: "Mobile number is required",
                    pattern: { value: /^\d{10}$/, message: "Mobile number must be exactly 10 digits" },
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="tel"
                      label="Mobile Number"
                      placeholder="Enter 10-digit number"
                      inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 10 }}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
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
                <Controller
                  name="address"
                  control={control}
                  rules={{ required: "Address is required" }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Address"
                      placeholder="Your address"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Map fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                        sx: { height: 48, borderRadius: 2 },
                      }}
                      sx={{ mb: 2 }}
                    />
                  )}
                />
                <Controller
                  name="password"
                  control={control}
                  rules={{
                    required: "Password is required",
                    minLength: { value: 6, message: "Password must be at least 6 characters" },
                    validate: (v) => {
                    const s = v || "";
                    if (!/[a-z]/.test(s)) return "Password must contain a lowercase letter";
                    if (!/[A-Z]/.test(s)) return "Password must contain an uppercase letter";
                    if (!/\d/.test(s)) return "Password must contain a number";
                    if (!/[@$!%*?&]/.test(s)) return "Password must contain a special character";
                    return true;
                  },
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type={showPassword ? "text" : "password"}
                      label="Password"
                      placeholder="••••••••"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword((p) => !p)} edge="end" tabIndex={-1}>
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
                  control={control}
                  rules={{
                    required: "Please confirm your password",
                    validate: (v) => v === password || "Passwords do not match",
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type={showConfirmPassword ? "text" : "password"}
                      label="Confirm Password"
                      placeholder="••••••••"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock fontSize="small" color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowConfirmPassword((p) => !p)} edge="end" tabIndex={-1}>
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
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={!!formState.errors.password || !!formState.errors.confirmPassword}
                  sx={{ height: 48, fontWeight: 600, borderRadius: 2 }}
                >
                  Create Account
                </Button>
              </form>
            </FormProvider>
            <Box sx={{ textAlign: "center", mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{" "}
                <Button variant="text" onClick={() => navigate("/login")} color="primary" sx={{ p: 0, minWidth: "auto", fontWeight: 600 }}>
                  Sign In
                </Button>
              </Typography>
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

export default Register;
