import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import Phone from "@mui/icons-material/Phone";
import Lock from "@mui/icons-material/Lock";
import Person from "@mui/icons-material/Person";
import Map from "@mui/icons-material/Map";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { toast } from "@/hooks/use-toast";
import { loginUser } from "@/services/accountService";
import { registerUser } from "@/services/apiService";
import { RegisterFormValues } from "@/types/user";
import { AuthShell, AuthSlidingOverlay } from "@/components/auth/AuthLayout";
import "./auth/auth.css";

type AuthMode = "login" | "signup";

interface LoginFormValues {
  mobileNumber: string;
  password: string;
  keepSignedIn: boolean;
}

function postAuthPath() {
  const startPage = localStorage.getItem("aquaflow_settings_default_start");
  return startPage === "consumption"
    ? "/consumption"
    : startPage === "payments"
      ? "/payments"
      : "/dashboard";
}

function LoginPanel({
  onSwitch,
  active,
}: {
  onSwitch: () => void;
  active: boolean;
}) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginFormValues>({
    defaultValues: {
      mobileNumber: "",
      password: "",
      keepSignedIn: true,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const response = await loginUser({
        mobileNumber: data.mobileNumber,
        password: data.password,
      });
      const { user } = response;
      localStorage.setItem("user", JSON.stringify(user));
      if (data.keepSignedIn) {
        localStorage.setItem("aquaflow_keep_signed_in", "1");
      } else {
        localStorage.removeItem("aquaflow_keep_signed_in");
      }
      toast({
        title: "Login Successful",
        description: `Welcome back, ${user.fullName}!`,
      });
      navigate(postAuthPath());
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
    <section
      className="auth-panel auth-panel--login"
      aria-label="Sign in"
      aria-hidden={!active}
      {...(!active ? ({ inert: "" } as React.HTMLAttributes<HTMLElement>) : {})}
    >
      <header>
        <h1 className="auth-title">Sign In</h1>
        <p className="auth-subtitle">Login to access your water dashboard.</p>
      </header>

      <form className="auth-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <Controller
          name="mobileNumber"
          control={form.control}
          rules={{
            required: "Mobile number is required",
            pattern: { value: /^[0-9]{10}$/, message: "Enter a valid 10-digit number" },
          }}
          render={({ field, fieldState }) => (
            <div className="auth-field">
              <p className="auth-label">Mobile Number</p>
              <div className={`auth-input-wrap${fieldState.error ? " auth-input-wrap--error" : ""}`}>
                <Phone fontSize="inherit" />
                <input
                  {...field}
                  className="auth-input"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Enter 10-digit number"
                  autoComplete="tel"
                />
              </div>
              {fieldState.error && <p className="auth-error">{fieldState.error.message}</p>}
            </div>
          )}
        />

        <Controller
          name="password"
          control={form.control}
          rules={{ required: "Password is required" }}
          render={({ field, fieldState }) => (
            <div className="auth-field">
              <p className="auth-label">Password</p>
              <div className={`auth-input-wrap${fieldState.error ? " auth-input-wrap--error" : ""}`}>
                <Lock fontSize="inherit" />
                <input
                  {...field}
                  className="auth-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-icon-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </button>
              </div>
              {fieldState.error && <p className="auth-error">{fieldState.error.message}</p>}
            </div>
          )}
        />

        <div className="auth-row">
          <Controller
            name="keepSignedIn"
            control={form.control}
            render={({ field }) => (
              <label className="auth-check">
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
                <span className="auth-check__box">
                  <svg viewBox="0 0 10 8" fill="none" aria-hidden>
                    <path
                      d="M1 4l2.5 2.5L9 1"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Keep me signed in
              </label>
            )}
          />
          <button type="button" className="auth-link" onClick={() => navigate("/forgot-password")}>
            Forgot Password?
          </button>
        </div>

        <button type="submit" className="auth-submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Signing in…" : "Login Now"}
        </button>

        <div className="auth-switch">
          <span>Don&apos;t have an account?</span>
          <button type="button" onClick={onSwitch}>
            Create Account
          </button>
        </div>
      </form>
    </section>
  );
}

function SignupPanel({
  onSwitch,
  active,
}: {
  onSwitch: () => void;
  active: boolean;
}) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const form = useForm<RegisterFormValues>({
    defaultValues: {
      fullName: "",
      mobileNumber: "",
      address: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = form.watch("password");

  const onSubmit = async (data: RegisterFormValues) => {
    if (!agreeTerms) {
      toast({
        title: "Terms required",
        description: "Please agree to the Terms of Service and Privacy Policy.",
        variant: "destructive",
      });
      return;
    }
    try {
      await registerUser(data);
      toast({
        title: "Registration Successful",
        description: "Your account has been created.",
      });
      navigate(postAuthPath());
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
    <section
      className="auth-panel auth-panel--signup"
      aria-label="Create account"
      aria-hidden={!active}
      {...(!active ? ({ inert: "" } as React.HTMLAttributes<HTMLElement>) : {})}
    >
      <header>
        <div className="auth-title-row">
          <h1 className="auth-title">Create Account</h1>
          <span className="auth-badge">NEW</span>
        </div>
        <p className="auth-subtitle">Sign up and start managing water usage in one place.</p>
      </header>

      <form className="auth-form auth-form--signup" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <div className="auth-form__row auth-form__row--2">
        <Controller
          name="fullName"
          control={form.control}
          rules={{ required: "Full name is required" }}
          render={({ field, fieldState }) => (
            <div className="auth-field">
              <p className="auth-label">Full Name</p>
              <div className={`auth-input-wrap${fieldState.error ? " auth-input-wrap--error" : ""}`}>
                <Person fontSize="inherit" />
                <input {...field} className="auth-input" placeholder="Your full name" autoComplete="name" />
              </div>
              {fieldState.error && <p className="auth-error">{fieldState.error.message}</p>}
            </div>
          )}
        />

        <Controller
          name="mobileNumber"
          control={form.control}
          rules={{
            required: "Mobile number is required",
            pattern: { value: /^\d{10}$/, message: "Mobile number must be exactly 10 digits" },
          }}
          render={({ field, fieldState }) => (
            <div className="auth-field">
              <p className="auth-label">Mobile Number</p>
              <div className={`auth-input-wrap${fieldState.error ? " auth-input-wrap--error" : ""}`}>
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
              {fieldState.error && <p className="auth-error">{fieldState.error.message}</p>}
            </div>
          )}
        />
        </div>

        <Controller
          name="address"
          control={form.control}
          rules={{ required: "Address is required" }}
          render={({ field, fieldState }) => (
            <div className="auth-field">
              <p className="auth-label">Address</p>
              <div className={`auth-input-wrap${fieldState.error ? " auth-input-wrap--error" : ""}`}>
                <Map fontSize="inherit" />
                <input
                  {...field}
                  className="auth-input"
                  placeholder="Service address"
                  autoComplete="street-address"
                />
              </div>
              {fieldState.error && <p className="auth-error">{fieldState.error.message}</p>}
            </div>
          )}
        />

        <div className="auth-form__row auth-form__row--2">
        <Controller
          name="password"
          control={form.control}
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
            <div className="auth-field">
              <p className="auth-label">Password</p>
              <div className={`auth-input-wrap${fieldState.error ? " auth-input-wrap--error" : ""}`}>
                <Lock fontSize="inherit" />
                <input
                  {...field}
                  className="auth-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-icon-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </button>
              </div>
              {fieldState.error && <p className="auth-error">{fieldState.error.message}</p>}
            </div>
          )}
        />

        <Controller
          name="confirmPassword"
          control={form.control}
          rules={{
            required: "Please confirm your password",
            validate: (v) => v === password || "Passwords do not match",
          }}
          render={({ field, fieldState }) => (
            <div className="auth-field">
              <p className="auth-label">Confirm</p>
              <div className={`auth-input-wrap${fieldState.error ? " auth-input-wrap--error" : ""}`}>
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
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </button>
              </div>
              {fieldState.error && <p className="auth-error">{fieldState.error.message}</p>}
            </div>
          )}
        />
        </div>

        <label className="auth-check auth-check--compact">
          <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
          <span className="auth-check__box">
            <svg viewBox="0 0 10 8" fill="none" aria-hidden>
              <path
                d="M1 4l2.5 2.5L9 1"
                stroke="#fff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          I agree to AquaFlow&apos;s Terms of Service and Privacy Policy
        </label>

        <button type="submit" className="auth-submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating account…" : "Create Account"}
        </button>

        <div className="auth-switch">
          <span>Already have an account?</span>
          <button type="button" onClick={onSwitch}>
            Sign In
          </button>
        </div>
      </form>
    </section>
  );
}

export default function AuthPage({ initialMode }: { initialMode?: AuthMode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathMode: AuthMode = location.pathname.includes("register") ? "signup" : "login";
  const [transitioning, setTransitioning] = useState(false);
  /** Optimistic mode during slide so UI moves before route settles */
  const [displayMode, setDisplayMode] = useState<AuthMode>(initialMode ?? pathMode);

  useEffect(() => {
    setDisplayMode(pathMode);
  }, [pathMode]);

  const switchTo = (next: AuthMode) => {
    if (next === displayMode) return;
    setTransitioning(true);
    setDisplayMode(next);
    navigate(next === "signup" ? "/register" : "/login", { replace: true });
    window.setTimeout(() => setTransitioning(false), 3600);
  };

  return (
    <AuthShell>
      <div
        className={`auth-card ${displayMode === "signup" ? "is-signup" : "is-login"}${transitioning ? " is-transitioning" : ""}`}
      >
        <div className="auth-forms">
          <LoginPanel active={displayMode === "login"} onSwitch={() => switchTo("signup")} />
          <SignupPanel active={displayMode === "signup"} onSwitch={() => switchTo("login")} />
        </div>
        <AuthSlidingOverlay
          login={{
            pill: "AquaFlow",
            title: "Manage water smarter",
            text: "Track consumption, pay bills, and monitor every connection from one clear dashboard.",
            features: ["Meter readings & usage history", "Due alerts & online payments", "Reports for every billing cycle"],
          }}
          signup={{
            pill: "Trusted utility",
            title: "Welcome back",
            text: "Your water account is ready — sign in to view readings, bills, and payment status anytime.",
            features: ["Real-time consumption data", "Secure bill & payment history", "Admin-managed meter records"],
          }}
        />
      </div>
    </AuthShell>
  );
}
