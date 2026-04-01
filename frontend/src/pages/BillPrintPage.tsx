import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Box, Button, Typography, CircularProgress, Paper } from "@mui/material";
import Print from "@mui/icons-material/Print";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { getBillForPrint, type BillData } from "@/services/apiService";
import { uploadFileUrl } from "@/utils/apiOrigin";
import { ImagePreviewDialog } from "@/components/ImagePreviewDialog";

const BillPrintPage = () => {
  const { consumptionUuid } = useParams<{ consumptionUuid: string }>();
  const [bill, setBill] = useState<BillData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);

  useEffect(() => {
    if (!consumptionUuid) {
      setError("Missing bill reference");
      return;
    }
    const raw = localStorage.getItem("user");
    const asAdmin = raw ? String(JSON.parse(raw).role || "").toUpperCase() === "ADMIN" : false;
    getBillForPrint(consumptionUuid, asAdmin)
      .then(setBill)
      .catch(() => setError("Could not load this bill. Check that you are signed in and the bill exists."));
  }, [consumptionUuid]);

  if (error) {
    return (
      <Box sx={{ p: 3, maxWidth: 480, mx: "auto" }}>
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        <Button component={Link} to="/dashboard" startIcon={<ArrowBack />}>Back to dashboard</Button>
      </Box>
    );
  }

  if (!bill) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  const photoUrl = uploadFileUrl(bill.meter_photo_path);
  const dueNote = `Pay by the ${bill.bill_due_day}${nth(bill.bill_due_day)} of the month where applicable.`;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        p: { xs: 2, sm: 3 },
        boxSizing: "border-box",
        "@media print": { minHeight: "auto", display: "block", p: 2 },
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 560,
          mx: "auto",
          "@media print": { maxWidth: "100%" },
        }}
      >
      <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center", "@media print": { display: "none" } }}>
        <Button variant="contained" startIcon={<Print />} onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
        <Button variant="outlined" startIcon={<ArrowBack />} component={Link} to="/dashboard">
          Back
        </Button>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: "1px solid",
          borderColor: "divider",
          width: "100%",
          boxSizing: "border-box",
          "@media print": { border: "none", boxShadow: "none" },
        }}
      >
        <Typography variant="h5" fontWeight={700} gutterBottom textAlign="center">
          {bill.organization_name}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom textAlign="center">
          Water bill — {bill.month} {bill.year}
        </Typography>
        <Box sx={{ my: 2, height: 1, bgcolor: "divider" }} />

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mb: 2, maxWidth: 480, mx: "auto" }}>
          <Typography variant="body2" color="text.secondary">Connection</Typography>
          <Typography variant="body2" fontWeight={600}>{bill.connection_id}</Typography>
          <Typography variant="body2" color="text.secondary">Consumer</Typography>
          <Typography variant="body2" fontWeight={600}>{bill.full_name}</Typography>
          <Typography variant="body2" color="text.secondary">Mobile</Typography>
          <Typography variant="body2">{bill.mobile_number}</Typography>
          <Typography variant="body2" color="text.secondary">Address</Typography>
          <Typography variant="body2">{bill.address || "—"}</Typography>
        </Box>

        <Box sx={{ my: 2, height: 1, bgcolor: "divider" }} />

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mb: 1, maxWidth: 480, mx: "auto" }}>
          <Typography variant="body2" color="text.secondary">Consumption</Typography>
          <Typography variant="body2">{Number(bill.consumption_liters).toLocaleString("en-IN")} L</Typography>
          {(bill.previous_meter_reading != null || bill.current_meter_reading != null) && (
            <>
              <Typography variant="body2" color="text.secondary">Meter (prev → curr)</Typography>
              <Typography variant="body2">
                {bill.previous_meter_reading ?? "—"} → {bill.current_meter_reading ?? "—"}
              </Typography>
            </>
          )}
          <Typography variant="body2" color="text.secondary">Rate / L</Typography>
          <Typography variant="body2">₹{Number(bill.rate_per_liter).toFixed(2)}</Typography>
          <Typography variant="body2" color="text.secondary">Amount</Typography>
          <Typography variant="body2" fontWeight={700}>₹{Number(bill.amount).toLocaleString("en-IN")}</Typography>
          <Typography variant="body2" color="text.secondary">Status</Typography>
          <Typography variant="body2">{bill.payment_status}</Typography>
        </Box>

        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2, textAlign: "center" }}>
          {dueNote}
        </Typography>

        {photoUrl && (
          <Box sx={{ mt: 3, display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, textAlign: "center" }}>
              Meter photo — tap to enlarge
            </Typography>
            <Box
              component="button"
              type="button"
              onClick={() => setPhotoDialogOpen(true)}
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                p: 0,
                m: 0,
                cursor: "pointer",
                bgcolor: "action.hover",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                maxWidth: "100%",
                width: "100%",
                maxHeight: 320,
                overflow: "hidden",
                "@media print": { cursor: "default", pointerEvents: "none" },
              }}
              aria-label="Open meter photo full size"
            >
              <Box
                component="img"
                src={photoUrl}
                alt="Meter"
                sx={{
                  maxWidth: "100%",
                  maxHeight: 280,
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  objectPosition: "center",
                  display: "block",
                  mx: "auto",
                }}
              />
            </Box>
            <ImagePreviewDialog
              open={photoDialogOpen}
              onClose={() => setPhotoDialogOpen(false)}
              url={photoUrl}
              alt="Meter reading"
            />
          </Box>
        )}
      </Paper>
      </Box>
    </Box>
  );
};

function nth(d: number) {
  if (d >= 11 && d <= 13) return "th";
  switch (d % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

export default BillPrintPage;
