import React from "react";
import hexagonIcon from "@/assets/auth/hexagon.svg";
import "./auth.css";

export function AuthBrand() {
  return (
    <div className="auth-brand">
      <div className="auth-brand__mark">
        <img src={hexagonIcon} alt="" width={18} height={18} />
      </div>
      <p className="auth-brand__name">AQUAFLOW</p>
    </div>
  );
}

export function AuthAtmosphere() {
  return (
    <div className="auth-atmosphere" aria-hidden>
      <video
        className="auth-atmosphere__video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="https://images.unsplash.com/photo-1505142468610-359e7d316be0?auto=format&fit=crop&w=1920&q=75"
      >
        <source
          src="https://assets.mixkit.co/videos/preview/mixkit-blue-ink-in-water-1184-large.mp4"
          type="video/mp4"
        />
      </video>
      <div className="auth-atmosphere__photo" aria-hidden />
      <div className="auth-liquid" aria-hidden>
        <span className="auth-liquid__blob auth-liquid__blob--1" />
        <span className="auth-liquid__blob auth-liquid__blob--2" />
        <span className="auth-liquid__blob auth-liquid__blob--3" />
      </div>
      <div className="auth-atmosphere__mesh">
        <span className="auth-mesh auth-mesh--1" />
        <span className="auth-mesh auth-mesh--2" />
        <span className="auth-mesh auth-mesh--3" />
      </div>
      <div className="auth-atmosphere__tint" />
      <span className="auth-bubble auth-bubble--1" />
      <span className="auth-bubble auth-bubble--2" />
      <span className="auth-bubble auth-bubble--3" />
      <svg className="auth-atmosphere__wave" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden>
        <path
          fill="rgba(255,255,255,0.14)"
          d="M0,64 C240,120 480,0 720,48 C960,96 1200,24 1440,64 L1440,120 L0,120 Z"
        />
      </svg>
    </div>
  );
}

export function AuthShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`auth-root${className ? ` ${className}` : ""}`}>
      <AuthAtmosphere />
      <AuthBrand />
      {children}
    </div>
  );
}

type SideContent = {
  pill: string;
  title: string;
  text: string;
  features?: string[];
};

function SidePanelInner({ pill, title, text, features }: SideContent) {
  return (
    <>
      <span className="auth-overlay__pill">{pill}</span>
      <h2 className="auth-overlay__title">{title}</h2>
      <p className="auth-overlay__text">{text}</p>
      {features && features.length > 0 ? (
        <ul className="auth-overlay__features">
          {features.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

/** Sliding glass door that covers one form and reveals the other */
export function AuthSlidingOverlay({
  login,
  signup,
}: {
  login: SideContent;
  signup: SideContent;
}) {
  return (
    <aside className="auth-overlay" aria-hidden>
      <div className="auth-overlay__bg" />
      <div className="auth-overlay__waves" aria-hidden>
        <div className="auth-overlay__wave auth-overlay__wave--top" />
        <div className="auth-overlay__wave auth-overlay__wave--bottom" />
      </div>
      <div className="auth-overlay__content">
        <div className="auth-overlay__side auth-overlay__side--login">
          <SidePanelInner {...login} />
        </div>
        <div className="auth-overlay__side auth-overlay__side--signup">
          <SidePanelInner {...signup} />
        </div>
      </div>
    </aside>
  );
}

/** Static right panel (forgot / reset flow) */
export function AuthSidePanel(props: SideContent) {
  return (
    <aside className="auth-side-panel" aria-hidden>
      <div className="auth-overlay__bg" />
      <div className="auth-overlay__waves" aria-hidden>
        <div className="auth-overlay__wave auth-overlay__wave--top" />
        <div className="auth-overlay__wave auth-overlay__wave--bottom" />
      </div>
      <div className="auth-overlay__content auth-overlay__content--static">
        <SidePanelInner {...props} />
      </div>
    </aside>
  );
}

export function AuthStepIndicator({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="auth-steps" aria-label="Progress">
      {labels.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "active" : "";
        return (
          <div key={label} className={`auth-steps__item${state ? ` auth-steps__item--${state}` : ""}`}>
            <span className="auth-steps__dot">{n}</span>
            <span className="auth-steps__label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
