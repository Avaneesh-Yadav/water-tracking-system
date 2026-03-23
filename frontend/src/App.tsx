import React from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { MuiToaster } from "@/components/MuiToaster";
import { ThemeModeProvider } from "./components/ThemeModeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomeOrDashboard, { LandingOrRedirect } from "./components/HomeOrDashboard";
import NotFound from "./pages/NotFound";
import Register from "./components/Register";
import Login from "./components/Login";
import ForgotPassword from "./components/ForgotPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import Unauthorized from "./components/Unauthorized";
import ProfileView from "./components/ProfileView";
import UnifiedEdit from "./components/UnifiedEdit";
import Layout from "./components/Layout";
import ConsumptionPage from "./pages/ConsumptionPage";
import PaymentsPage from "./pages/PaymentsPage";
import SettingsPage from "./pages/SettingsPage";
import ConsumersPage from "./pages/ConsumersPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import ReportsPage from "./pages/ReportsPage";
import BulkOperationsPage from "./pages/BulkOperationsPage";
import HelpPage from "./pages/HelpPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeModeProvider>
      <CssBaseline />
      <MuiToaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingOrRedirect />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected: sidebar layout + nested routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="dashboard" element={<HomeOrDashboard />} />
            <Route element={<Layout />}>
              <Route path="search" element={<SearchResultsPage />} />
              <Route path="consumption" element={<ConsumptionPage />} />
              <Route path="consumers" element={<ConsumersPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="bulk" element={<BulkOperationsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path=":uuid/edit" element={<UnifiedEdit />} />
              <Route path=":uuid" element={<ProfileView />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ThemeModeProvider>
  </QueryClientProvider>
);

export default App;

