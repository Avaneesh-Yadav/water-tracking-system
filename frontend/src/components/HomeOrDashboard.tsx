import React from "react";
import { Navigate } from "react-router-dom";
import Index from "./Index";
import UserDashboard from "./UserDashboard";
import AdminDashboard from "./AdminDashboard";
import Layout from "./Layout";
import FieldOpsPage from "@/pages/FieldOpsPage";

/**
 * For path "/": show Index when not logged in, redirect to /dashboard when logged in.
 */
export const LandingOrRedirect = () => {
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return <Index />;
    return <Navigate to="/dashboard" replace />;
  } catch {
    return <Index />;
  }
};

/**
 * Renders Layout + Admin or User dashboard. Use at /dashboard (protected).
 */
const DashboardView = () => {
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return <Navigate to="/" replace />;
    const user = JSON.parse(stored);
    const role = user?.role?.toUpperCase();
    if (role === "ADMIN" || role === "SUPER_ADMIN") return <Layout><AdminDashboard /></Layout>;
    if (role === "METER_READER") return <Layout><FieldOpsPage /></Layout>;
  } catch {
    return <Navigate to="/" replace />;
  }
  return <Layout><UserDashboard /></Layout>;
};

export default DashboardView;
