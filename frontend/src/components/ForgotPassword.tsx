import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Phone from "@mui/icons-material/Phone";
import Lock from "@mui/icons-material/Lock";
import Pin from "@mui/icons-material/Pin";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { toast } from "@/hooks/use-toast";
import axiosInstance from "@/utils/axiosInstance";
import {
  AuthShell,
  AuthSidePanel,
  AuthStepIndicator,
} from "@/components/auth/AuthLayout";
import "./auth/auth.css";

interface ForgotPasswordFormValues {
  mobileNumber: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

const STEP_LABELS = ["Mobile", "Verify OTP", "New password"];
const STEP_TRANSITION_MS = 2600;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [stepTransitioning, setStepTransitioning] = useState(false);
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

  const goToStep = (next: number) => {
    if (next === step) return;
    setStepTransitioning(true);
    setStep(next);
    window.setTimeout(() => setStepTransitioning(false), STEP_TRANSITION_MS);
  };

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
      goToStep(2);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        error?.response?.message ??
        error?.message ??
        "Failed to send OTP";
      toast({ title: "Error", description: message, variant: "destructive" });
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
      goToStep(3);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        error?.response?.message ??
        error?.message ??
        "Invalid OTP";
      toast({ title: "Verification Failed", description: message, variant: "destructive" });
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
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const stepTitle =
    step === 1
      ? "Forgot password?"
      : step === 2
        ? "Verify OTP"
        : "Set new password";

  const stepSubtitle =
    step === 1
      ? "Enter your registered mobile number to receive a one-time code."
      : step === 2
        ? `Enter the 6-digit code sent to ${mobileNumber || "your mobile"}.`
        : "Choose a strong password for your AquaFlow account.";

  return (
    <AuthShell>
      <div className={`auth-card auth-card--recover${stepTransitioning ? " is-transitioning" : ""}`}>
        <section className="auth-panel auth-panel--recover" aria-label="Password recovery">
          <header key={`header-${step}`} className="auth-step-header">
            <h1 className="auth-title">{stepTitle}</h1>
            <p className="auth-subtitle">{stepSubtitle}</p>
          </header>

          <AuthStepIndicator step={step} labels={STEP_LABELS} />

          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (step === 1) handleSendOTP();
              else if (step === 2) handleVerifyOTP();
              else handleResetPassword();
            }}
            noValidate
          >
            {step === 1 && (
              <div key="step-1" className="auth-step">
                <Controller
                  name="mobileNumber"
                  control={form.control}
                  render={({ field }) => (
                    <div className="auth-field">
                      <p className="auth-label">Mobile Number</p>
                      <div className="auth-input-wrap">
                        <Phone fontSize="inherit" />
                        <input
                          {...field}
                          className="auth-input"
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="10-digit number"
                          autoComplete="tel"
                        />
                      </div>
                    </div>
                  )}
                />
                <button type="submit" className="auth-submit">
                  Send OTP
                </button>
              </div>
            )}

            {step === 2 && (
              <div key="step-2" className="auth-step">
                <Controller
                  name="otp"
                  control={form.control}
                  render={({ field }) => (
                    <div className="auth-field">
                      <p className="auth-label">One-time password</p>
                      <div className="auth-input-wrap">
                        <Pin fontSize="inherit" />
                        <input
                          {...field}
                          className="auth-input"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="6-digit OTP"
                          autoComplete="one-time-code"
                        />
                      </div>
                    </div>
                  )}
                />
                <button type="submit" className="auth-submit">
                  Verify OTP
                </button>
                <button type="button" className="auth-submit auth-submit--ghost" onClick={handleSendOTP}>
                  Resend OTP
                </button>
              </div>
            )}

            {step === 3 && (
              <div key="step-3" className="auth-step">
                <div className="auth-form__row auth-form__row--2">
                  <Controller
                    name="newPassword"
                    control={form.control}
                    render={({ field }) => (
                      <div className="auth-field">
                        <p className="auth-label">New password</p>
                        <div className="auth-input-wrap">
                          <Lock fontSize="inherit" />
                          <input
                            {...field}
                            className="auth-input"
                            type={showPassword ? "text" : "password"}
                            placeholder="New password"
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            className="auth-icon-btn"
                            onClick={() => setShowPassword((p) => !p)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </button>
                        </div>
                      </div>
                    )}
                  />
                  <Controller
                    name="confirmPassword"
                    control={form.control}
                    render={({ field }) => (
                      <div className="auth-field">
                        <p className="auth-label">Confirm</p>
                        <div className="auth-input-wrap">
                          <Lock fontSize="inherit" />
                          <input
                            {...field}
                            className="auth-input"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm"
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            className="auth-icon-btn"
                            onClick={() => setShowConfirmPassword((p) => !p)}
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          >
                            {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </button>
                        </div>
                      </div>
                    )}
                  />
                </div>
                <button type="submit" className="auth-submit">
                  Reset Password
                </button>
              </div>
            )}

            <div className="auth-switch">
              <span>Remember your password?</span>
              <button type="button" onClick={() => navigate("/login")}>
                Back to Sign In
              </button>
            </div>
          </form>
        </section>

        <AuthSidePanel
          pill="Secure recovery"
          title="Reset with confidence"
          text="We verify your mobile number before any password change. Your account stays protected throughout."
          features={[
            "OTP sent to registered mobile",
            "One-time verification code",
            "Instant access after reset",
          ]}
        />
      </div>
    </AuthShell>
  );
};

export default ForgotPassword;
