import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Box, Button, Typography, CircularProgress } from "@mui/material";
import Print from "@mui/icons-material/Print";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { getBillForPrint, type BillData } from "@/services/apiService";
import { uploadFileUrl } from "@/utils/apiOrigin";
import { isStaffRole } from "@/utils/roles";
import { printElementInChromeDialog } from "@/utils/printHtml";
import { BILL_PRINT_CSS } from "@/components/bill/billStyles";
import { BillDocument, billNumber } from "@/components/bill/BillDocument";

const BillPrintPage = () => {
  const { consumptionUuid } = useParams<{ consumptionUuid: string }>();
  const [bill, setBill] = useState<BillData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const billRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!consumptionUuid) {
      setError("Missing bill reference");
      return;
    }
    let asAdmin = false;
    try {
      const raw = localStorage.getItem("user");
      asAdmin = raw ? isStaffRole(JSON.parse(raw).role) : false;
    } catch {
      asAdmin = false;
    }
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
  const handlePrint = () => {
    if (!billRef.current) return;
    printElementInChromeDialog(billRef.current, BILL_PRINT_CSS, `Water Bill ${billNumber(bill)}`);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        p: { xs: 2, sm: 3 },
        bgcolor: "#e8eef2",
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
        <Button variant="contained" color="primary" startIcon={<Print />} onClick={handlePrint}>
          Print
        </Button>
        <Button variant="outlined" startIcon={<ArrowBack />} component={Link} to="/dashboard">
          Back
        </Button>
      </Box>
      <style>{BILL_PRINT_CSS}</style>
      <Box
        ref={billRef}
        sx={{
          width: "100%",
          maxWidth: 720,
          boxShadow: "0 12px 40px rgba(18, 50, 74, 0.18)",
        }}
      >
        <BillDocument bill={bill} photoUrl={photoUrl} />
      </Box>
    </Box>
  );
};

export default BillPrintPage;
