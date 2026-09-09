import React from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { MuiToaster } from "@/components/MuiToaster";
import { ThemeModeProvider } from "./components/ThemeModeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomeOrDashboard, { LandingOrRedirect } from "./components/HomeOrDashboard";
import NotFound from "./pages/NotFound";
import AuthPage from "./components/AuthPage";
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
import BillPrintPage from "./pages/BillPrintPage";
import ReportsPage from "./pages/ReportsPage";
import BulkOperationsPage from "./pages/BulkOperationsPage";
import HelpPage from "./pages/HelpPage";
import BillingOpsPage from "./pages/BillingOpsPage";
import FieldOpsPage from "./pages/FieldOpsPage";
import ServiceDeskPage from "./pages/ServiceDeskPage";
import InboxPage from "./pages/InboxPage";
import MapConnectionsPage from "./pages/MapConnectionsPage";
import PrintPackPage from "./pages/PrintPackPage";
import ApplyConnectionPage from "./pages/ApplyConnectionPage";
import ReceiptPrintPage from "./pages/ReceiptPrintPage";
import { I18nProvider } from "./i18n/I18nProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeModeProvider>
      <I18nProvider>
      <CssBaseline />
      <MuiToaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingOrRedirect />} />
          <Route element={<AuthPage />}>
            <Route path="login" element={<></>} />
            <Route path="register" element={<></>} />
          </Route>
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/apply" element={<ApplyConnectionPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected: sidebar layout + nested routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="dashboard" element={<HomeOrDashboard />} />
            <Route path="bill/:consumptionUuid" element={<BillPrintPage />} />
            <Route path="receipt/:paymentUuid" element={<ReceiptPrintPage />} />
            <Route element={<Layout />}>
              <Route path="search" element={<SearchResultsPage />} />
              <Route path="consumption" element={<ConsumptionPage />} />
              <Route path="consumers" element={<ConsumersPage />} />
              <Route path="employees" element={<ConsumersPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="bulk" element={<BulkOperationsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="billing" element={<BillingOpsPage />} />
              <Route path="billing/print-pack" element={<PrintPackPage />} />
              <Route path="field" element={<FieldOpsPage />} />
              <Route path="service" element={<ServiceDeskPage />} />
              <Route path="inbox" element={<InboxPage />} />
              <Route path="map" element={<MapConnectionsPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path=":uuid/edit" element={<UnifiedEdit />} />
              <Route path=":uuid" element={<ProfileView />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </I18nProvider>
    </ThemeModeProvider>
  </QueryClientProvider>
);

export default App;

