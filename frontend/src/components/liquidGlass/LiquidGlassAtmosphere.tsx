import React from "react";
import "./liquidGlass.css";

export default function LiquidGlassAtmosphere() {
  return (
    <div className="lg-atmosphere" aria-hidden>
      <video className="lg-atmosphere__video" autoPlay muted loop playsInline preload="auto" poster="https://images.unsplash.com/photo-1505142468610-359e7d316be0?auto=format&fit=crop&w=1920&q=75">
        <source src="https://assets.mixkit.co/videos/preview/mixkit-blue-ink-in-water-1184-large.mp4" type="video/mp4" />
      </video>

      <div className="lg-atmosphere__photo" />

      <div className="lg-liquid">
        <span className="lg-liquid__blob lg-liquid__blob--1" />
        <span className="lg-liquid__blob lg-liquid__blob--2" />
        <span className="lg-liquid__blob lg-liquid__blob--3" />
      </div>

      <div className="lg-mesh">
        <span className="lg-mesh__orb lg-mesh__orb--1" />
        <span className="lg-mesh__orb lg-mesh__orb--2" />
        <span className="lg-mesh__orb lg-mesh__orb--3" />
      </div>

      <div className="lg-tint" />

      <span className="lg-bubble lg-bubble--1" />
      <span className="lg-bubble lg-bubble--2" />
      <span className="lg-bubble lg-bubble--3" />
    </div>
  );
}

