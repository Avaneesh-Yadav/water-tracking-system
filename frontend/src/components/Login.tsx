import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import Phone from "@mui/icons-material/Phone";
import Lock from "@mui/icons-material/Lock";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { loginUser } from "@/services/accountService";

interface LoginFormValues {
  mobileNumber: string;
  password: string;
}

const Login = () => {
  const navigate = useNavigate();
  const form = useForm<LoginFormValues>({
    defaultValues: {
      mobileNumber: "",
      password: "",
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const onSubmit = async (data: LoginFormValues) => {
    const { mobileNumber, password } = data;
    try {
      const response = await loginUser({ mobileNumber, password });
      const { token, user } = response;
      localStorage.setItem("user", JSON.stringify(user));

      toast({
        title: "Login Successful",
        description: `Welcome back, ${user.fullName}!`,
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
        title: "Login Failed",
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
                <WaterDrop sx={{ fontSize: 32, color: "primary.contrastText" }} />
              </Box>
            }
            title={
              <Typography variant="h4" fontWeight="bold" color="primary">
                Welcome Back
              </Typography>
            }
            subheader="Sign in to manage your water services"
          />
          <CardContent sx={{ "& .MuiTextField-root": { mb: 2 } }}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Controller
                name="mobileNumber"
                control={form.control}
                rules={{
                  required: "Mobile number is required",
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: "Invalid mobile no",
                  },
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Mobile Number"
                    placeholder="Enter 10-digit number"
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
                  />
                )}
              />
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type={showPassword ? "text" : "password"}
                    label="Password"
                    placeholder="Enter your password"
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
                  />
                )}
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                <Button type="button" variant="text" onClick={() => navigate("/forgot-password")} color="primary" sx={{ fontWeight: 600 }}>
                  Forgot Password?
                </Button>
              </Box>
              <Button type="submit" fullWidth variant="contained" color="primary" sx={{ height: 48, fontWeight: 600, borderRadius: 2 }}>
                Sign In
              </Button>
            </form>
            <Box sx={{ textAlign: "center", mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
              <Typography variant="body2" color="text.secondary">
                Don&apos;t have an account?{" "}
                <Button variant="text" onClick={() => navigate("/register")} color="primary" sx={{ p: 0, minWidth: "auto", fontWeight: 600 }}>
                  Create Account
                </Button>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
      <style>{`
        @keyframes gradient-xy {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(-5deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-15px) scale(1.05); }
        }
      `}</style>
    </Box>
  );
};

export default Login;
