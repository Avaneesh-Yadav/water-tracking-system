import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TextField,
  Alert,
  LinearProgress,
} from "@mui/material";
import NotificationsActive from "@mui/icons-material/NotificationsActive";
import Home from "@mui/icons-material/Home";
import Lock from "@mui/icons-material/Lock";
import SettingsSuggest from "@mui/icons-material/SettingsSuggest";
import Payment from "@mui/icons-material/Payment";
import Business from "@mui/icons-material/Business";
import Backup from "@mui/icons-material/Backup";
import DarkMode from "@mui/icons-material/DarkMode";
import Translate from "@mui/icons-material/Translate";
import Shield from "@mui/icons-material/Shield";
import * as QRCodeLib from "qrcode.react";
import {
  getRatePerLiter,
  updateRatePerLiter,
  getUpiSettings,
  updateUpiSettings,
  getBrandingSettings,
  updateBrandingSettings,
  exportBackup,
  restoreBackup,
} from "@/services/apiService";
import { opsApi } from "@/services/opsService";
import { toast } from "@/hooks/use-toast";
import { isStaffRole } from "@/utils/roles";
import { useThemeMode } from "@/components/ThemeModeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import axiosInstance from "@/utils/axiosInstance";

const QRCode = QRCodeLib.QRCodeSVG;

const STORAGE_KEYS = {
  billReminders: "aquaflow_settings_bill_reminders",
  defaultStartPage: "aquaflow_settings_default_start",
} as const;

type DefaultStartPage = "dashboard" | "consumption" | "payments";

const SettingsPage = () => {
  const navigate = useNavigate();
  const themeMode = useThemeMode();
  const { lang, setLang } = useI18n();
  const [billReminders, setBillReminders] = useState(true);
  const [defaultStart, setDefaultStart] = useState<DefaultStartPage>("dashboard");
  const [isAdmin, setIsAdmin] = useState(false);

  const [rate, setRate] = useState("20");
  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [billDueDay, setBillDueDay] = useState("10");
  const [adminLoading, setAdminLoading] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [totpOn, setTotpOn] = useState(false);
  const [otpauth, setOtpauth] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpBusy, setTotpBusy] = useState(false);

  useEffect(() => {
    try {
      const reminders = localStorage.getItem(STORAGE_KEYS.billReminders);
      if (reminders !== null) setBillReminders(reminders === "true");
      const start = localStorage.getItem(STORAGE_KEYS.defaultStartPage) as DefaultStartPage | null;
      if (start && ["dashboard", "consumption", "payments"].includes(start)) setDefaultStart(start);
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      setIsAdmin(isStaffRole(u?.role));
    } catch {
      // keep defaults
    }
    axiosInstance.get("/profile").then((r) => setTotpOn(!!r.data?.totp_enabled)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setAdminLoading(true);
      try {
        const [r, upi, brand] = await Promise.all([getRatePerLiter(), getUpiSettings(), getBrandingSettings()]);
        setRate(String(r));
        setUpiId(upi.upi_id || "");
        setPayeeName(upi.payee_name || "");
        setOrgName(brand.organization_name || "");
        setSupportEmail(brand.support_email || "");
        setSupportPhone(brand.support_phone || "");
        setBillDueDay(String(brand.bill_due_day ?? 10));
      } catch {
        toast({ title: "Admin settings", description: "Could not load some settings", variant: "destructive" });
      } finally {
        setAdminLoading(false);
      }
    })();
  }, [isAdmin]);

  const handleBillReminders = (checked: boolean) => {
    setBillReminders(checked);
    localStorage.setItem(STORAGE_KEYS.billReminders, String(checked));
  };

  const handleDefaultStart = (value: DefaultStartPage) => {
    setDefaultStart(value);
    localStorage.setItem(STORAGE_KEYS.defaultStartPage, value);
  };

  const saveRate = async () => {
    const n = parseFloat(rate);
    if (isNaN(n) || n <= 0) {
      toast({ title: "Invalid rate", variant: "destructive" });
      return;
    }
    try {
      await updateRatePerLiter(n);
      toast({ title: "Saved", description: "Rate per liter updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.message || "Save failed", variant: "destructive" });
    }
  };

  const saveUpi = async () => {
    try {
      await updateUpiSettings({ upi_id: upiId, payee_name: payeeName });
      toast({ title: "Saved", description: "UPI settings updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.message || "Save failed", variant: "destructive" });
    }
  };

  const saveBranding = async () => {
    try {
      await updateBrandingSettings({
        organization_name: orgName,
        support_email: supportEmail || null,
        support_phone: supportPhone || null,
        bill_due_day: Math.min(28, Math.max(1, parseInt(billDueDay, 10) || 10)),
      });
      toast({ title: "Saved", description: "Branding updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.message || "Save failed", variant: "destructive" });
    }
  };

  const downloadBackup = async () => {
    setBackupBusy(true);
    try {
      const blob = await exportBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aquaflow-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Download started" });
    } catch (e: any) {
      toast({ title: "Export failed", description: e?.message, variant: "destructive" });
    } finally {
      setBackupBusy(false);
    }
  };

  const onRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBackupBusy(true);
    try {
      const res = await restoreBackup(file);
      toast({ title: "Restore", description: res.message || "Done" });
    } catch (err: any) {
      toast({ title: "Restore failed", description: err?.response?.data?.message || err?.message, variant: "destructive" });
    } finally {
      setBackupBusy(false);
    }
  };

  const begin2fa = async () => {
    setTotpBusy(true);
    try {
      const res = await opsApi.begin2fa();
      setOtpauth(res.otpauth_url || "");
      toast({ title: "Scan the QR with Google Authenticator (or similar)" });
    } catch (e: any) {
      toast({ title: "Could not start 2FA", description: e?.response?.data?.message, variant: "destructive" });
    } finally {
      setTotpBusy(false);
    }
  };

  const confirm2fa = async () => {
    setTotpBusy(true);
    try {
      await opsApi.confirm2fa(totpCode);
      setTotpOn(true);
      setOtpauth("");
      setTotpCode("");
      toast({ title: "Two-factor enabled" });
    } catch (e: any) {
      toast({ title: "Invalid code", description: e?.response?.data?.message, variant: "destructive" });
    } finally {
      setTotpBusy(false);
    }
  };

  const disable2fa = async () => {
    setTotpBusy(true);
    try {
      await opsApi.disable2fa(totpCode);
      setTotpOn(false);
      setTotpCode("");
      toast({ title: "Two-factor disabled" });
    } catch (e: any) {
      toast({ title: "Could not disable", description: e?.response?.data?.message, variant: "destructive" });
    } finally {
      setTotpBusy(false);
    }
  };

  const handleGoToEditProfile = () => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const user = JSON.parse(stored);
        if (user?.uuid) navigate(`/${user.uuid}/edit`);
      }
    } catch {
      // ignore
    }
  };

  return (
    <Box sx={{ maxWidth: 640, mx: "auto", width: "100%" }}>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
        Settings
      </Typography>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardHeader
          title="Notifications"
          subheader="Manage how we notify you"
          avatar={<NotificationsActive sx={{ color: "primary.main" }} />}
        />
        <CardContent sx={{ pt: 0 }}>
          <FormControlLabel
            control={
              <Switch
                checked={billReminders}
                onChange={(_, checked) => handleBillReminders(checked)}
                color="primary"
              />
            }
            label="Bill reminder notifications"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Get reminded when a bill is due (in-app and email when available).
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardHeader
          title="Start page"
          subheader="Where to go after login"
          avatar={<Home sx={{ color: "primary.main" }} />}
        />
        <CardContent sx={{ pt: 0 }}>
          <FormControl size="small" fullWidth sx={{ minWidth: 200 }}>
            <InputLabel id="default-start-label">Default start page</InputLabel>
            <Select
              labelId="default-start-label"
              value={defaultStart}
              label="Default start page"
              onChange={(e) => handleDefaultStart(e.target.value as DefaultStartPage)}
            >
              <MenuItem value="dashboard">Dashboard</MenuItem>
              <MenuItem value="consumption">Consumption</MenuItem>
              <MenuItem value="payments">Payments</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            This page will open when you sign in (applies on next login).
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardHeader title="Appearance" subheader="Light or dark glass theme" avatar={<DarkMode sx={{ color: "primary.main" }} />} />
        <CardContent sx={{ pt: 0 }}>
          <FormControlLabel
            control={
              <Switch
                checked={themeMode?.theme === "dark"}
                onChange={() => themeMode?.toggleTheme()}
                color="primary"
              />
            }
            label="Dark mode"
          />
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardHeader title="Language" subheader="Navigation labels" avatar={<Translate sx={{ color: "primary.main" }} />} />
        <CardContent sx={{ pt: 0 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Language</InputLabel>
            <Select label="Language" value={lang} onChange={(e) => setLang(e.target.value as "en" | "hi")}>
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="hi">हिन्दी</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardHeader
          title="Account & security"
          subheader="Password and account details"
          avatar={<Lock sx={{ color: "primary.main" }} />}
        />
        <CardContent sx={{ pt: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Change your password, name, or address from your profile.
          </Typography>
          <Button variant="outlined" size="small" startIcon={<Lock />} onClick={handleGoToEditProfile}>
            Edit profile & password
          </Button>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardHeader
          title="Authenticator 2FA"
          subheader="Recommended for admin logins. Uses an authenticator app, not SMS."
          avatar={<Shield sx={{ color: "primary.main" }} />}
        />
        <CardContent sx={{ pt: 0, display: "flex", flexDirection: "column", gap: 1.5, maxWidth: 420 }}>
          <Typography variant="body2" color="text.secondary">
            {totpOn ? "Two-factor is on for this account." : "Two-factor is off."}
          </Typography>
          {otpauth && (
            <Box sx={{ display: "flex", justifyContent: "center", p: 2, bgcolor: "background.paper", borderRadius: 2 }}>
              <QRCode value={otpauth} size={180} />
            </Box>
          )}
          <TextField size="small" label="6-digit code" value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {!totpOn && (
              <Button variant="outlined" disabled={totpBusy} onClick={begin2fa}>
                Show QR
              </Button>
            )}
            {!totpOn && (
              <Button variant="contained" disabled={totpBusy || totpCode.length !== 6} onClick={confirm2fa}>
                Enable
              </Button>
            )}
            {totpOn && (
              <Button color="error" variant="outlined" disabled={totpBusy || totpCode.length !== 6} onClick={disable2fa}>
                Disable
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          <Typography variant="h6" fontWeight={600} sx={{ mt: 2, mb: 1 }}>
            Water authority (admin)
          </Typography>
          {adminLoading && <LinearProgress sx={{ mb: 2 }} />}

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardHeader title="Default rate" subheader="Rate per liter for new consumption rows" avatar={<SettingsSuggest color="primary" />} />
            <CardContent sx={{ pt: 0, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}>
              <TextField size="small" label="₹ per liter" value={rate} onChange={(e) => setRate(e.target.value)} sx={{ width: 160 }} />
              <Button variant="contained" onClick={saveRate} disabled={adminLoading}>
                Save rate
              </Button>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardHeader title="UPI payments" subheader="Shown on customer QR pay flow" avatar={<Payment color="primary" />} />
            <CardContent sx={{ pt: 0, display: "flex", flexDirection: "column", gap: 2, maxWidth: 480 }}>
              <TextField fullWidth size="small" label="UPI ID" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
              <TextField fullWidth size="small" label="Payee name" value={payeeName} onChange={(e) => setPayeeName(e.target.value)} />
              <Button variant="contained" onClick={saveUpi} disabled={adminLoading}>
                Save UPI
              </Button>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardHeader title="Branding & support" subheader="Bills, help page, and app name" avatar={<Business color="primary" />} />
            <CardContent sx={{ pt: 0, display: "flex", flexDirection: "column", gap: 2, maxWidth: 480 }}>
              <TextField fullWidth size="small" label="Organization name" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              <TextField fullWidth size="small" label="Support email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
              <TextField fullWidth size="small" label="Support phone" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} />
              <TextField size="small" label="Bill due day (1–28)" value={billDueDay} onChange={(e) => setBillDueDay(e.target.value)} sx={{ maxWidth: 200 }} />
              <Button variant="contained" onClick={saveBranding} disabled={adminLoading}>
                Save branding
              </Button>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardHeader title="Backup & restore" subheader="Export JSON or merge from a previous export" avatar={<Backup color="primary" />} />
            <CardContent sx={{ pt: 0 }}>
              {backupBusy && <LinearProgress sx={{ mb: 2 }} />}
              <Alert severity="warning" sx={{ mb: 2 }}>
                Restore merges rows by UUID and can overwrite data. Use on a test DB first if unsure.
              </Alert>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Button variant="outlined" onClick={downloadBackup} disabled={backupBusy}>
                  Download backup
                </Button>
                <Button variant="outlined" component="label" disabled={backupBusy}>
                  Restore from file
                  <input type="file" accept=".json,application/json" hidden onChange={onRestoreFile} />
                </Button>
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default SettingsPage;
