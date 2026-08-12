import React from "react";
import { useNavigate } from "react-router-dom";
import LoginIcon from "@mui/icons-material/Login";
import PersonAdd from "@mui/icons-material/PersonAdd";
import ArrowForward from "@mui/icons-material/ArrowForward";
import PhoneAndroid from "@mui/icons-material/PhoneAndroid";
import BarChart from "@mui/icons-material/BarChart";
import CreditCard from "@mui/icons-material/CreditCard";
import Security from "@mui/icons-material/Security";
import Schedule from "@mui/icons-material/Schedule";
import TrendingDown from "@mui/icons-material/TrendingDown";
import { AuthShell } from "@/components/auth/AuthLayout";
import "@/components/auth/auth.css";
import "@/components/landing/landing.css";

const stats = [
  { value: "10K+", label: "Active users" },
  { value: "50M L", label: "Water tracked" },
  { value: "25K+", label: "Payments" },
  { value: "99.9%", label: "Uptime" },
];

const features = [
  {
    icon: <PhoneAndroid />,
    title: "Mobile registration",
    text: "Sign up with your mobile number — no paperwork, no long forms.",
  },
  {
    icon: <BarChart />,
    title: "Usage tracking",
    text: "View meter readings, consumption history, and billing cycles in one place.",
  },
  {
    icon: <CreditCard />,
    title: "Instant payments",
    text: "Pay bills online via UPI and keep a clear record of every transaction.",
  },
  {
    icon: <Security />,
    title: "Secure accounts",
    text: "OTP-based recovery and encrypted credentials keep your account protected.",
  },
  {
    icon: <Schedule />,
    title: "Always available",
    text: "Check readings, due amounts, and payment status whenever you need them.",
  },
  {
    icon: <TrendingDown />,
    title: "Save water",
    text: "Spot usage patterns early and reduce waste before the next bill arrives.",
  },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <AuthShell className="auth-root--landing">
      <main className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-hero-title">
          <div className="landing-hero__inner">
            <div>
              <p className="landing-hero__eyebrow">
                <span className="landing-hero__eyebrow-dot" aria-hidden />
                Water management platform
              </p>
              <h1 id="landing-hero-title" className="landing-hero__title">
                Manage water <span>through glass</span>
              </h1>
              <p className="landing-hero__text">
                Track consumption, pay bills, and monitor every connection from a dashboard
                built for clarity — the same liquid-glass experience as sign-in and sign-up.
              </p>
              <div className="landing-hero__actions">
                <button
                  type="button"
                  className="landing-btn landing-btn--primary"
                  onClick={() => navigate("/register")}
                >
                  <PersonAdd fontSize="small" />
                  Create account
                </button>
                <button
                  type="button"
                  className="landing-btn landing-btn--glass"
                  onClick={() => navigate("/login")}
                >
                  <LoginIcon fontSize="small" />
                  Sign in
                </button>
              </div>
              <div className="landing-stats">
                {stats.map((s) => (
                  <div key={s.label} className="landing-stat">
                    <span className="landing-stat__value">{s.value}</span>
                    <span className="landing-stat__label">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <aside className="landing-preview" aria-label="Sign-in preview">
              <div className="landing-preview__shine" aria-hidden />
              <span className="landing-preview__pill">AquaFlow</span>
              <h2 className="landing-preview__title">Manage water smarter</h2>
              <p className="landing-preview__text">
                Your account dashboard — readings, bills, and payments in one clear view.
              </p>
              <ul className="landing-preview__list">
                <li>Meter readings &amp; usage history</li>
                <li>Due alerts &amp; online payments</li>
                <li>Reports for every billing cycle</li>
              </ul>
              <div className="landing-preview__mock" aria-hidden>
                <div className="landing-preview__field landing-preview__field--short" />
                <div className="landing-preview__field" />
                <div className="landing-preview__btn" />
              </div>
            </aside>
          </div>
        </section>

        <div className="landing-section-head">
          <h2>Everything in one flow</h2>
          <p>
            From registration to payment — designed with the same frosted panels and water
            atmosphere as your login and signup screens.
          </p>
        </div>

        <section className="landing-features" aria-label="Features">
          {features.map((f) => (
            <article key={f.title} className="landing-feature">
              <div className="landing-feature__icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </section>

        <section className="landing-cta" aria-labelledby="landing-cta-title">
          <h2 id="landing-cta-title">Ready to get started?</h2>
          <p>
            Join AquaFlow and manage your water account with the same secure, glass-clear
            interface you&apos;ll use every day.
          </p>
          <div className="landing-cta__actions">
            <button
              type="button"
              className="landing-btn landing-btn--primary"
              onClick={() => navigate("/register")}
            >
              Start free
              <ArrowForward fontSize="small" />
            </button>
            <button
              type="button"
              className="landing-btn landing-btn--glass"
              onClick={() => navigate("/login")}
            >
              I already have an account
            </button>
          </div>
        </section>

        <footer className="landing-footer">
          <span>
            <strong>AquaFlow</strong> · Smart water management
          </span>
          <span>© {new Date().getFullYear()} · support@aquaflow.com</span>
        </footer>
      </main>
    </AuthShell>
  );
};

export default Index;
