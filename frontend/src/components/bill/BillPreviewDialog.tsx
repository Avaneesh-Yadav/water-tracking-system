import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import Print from "@mui/icons-material/Print";
import Chat from "@mui/icons-material/Chat";
import { getBillForPrint, type BillData } from "@/services/apiService";
import { uploadFileUrl } from "@/utils/apiOrigin";
import { isStaffRole } from "@/utils/roles";
import { printElementInChromeDialog } from "@/utils/printHtml";
import { BILL_PRINT_CSS } from "./billStyles";
import { BillDocument, billNumber } from "./BillDocument";

type Props = {
  open: boolean;
  consumptionUuid: string | null;
  onClose: () => void;
};

export function BillPreviewDialog({ open, consumptionUuid, onClose }: Props) {
  const [bill, setBill] = useState<BillData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scale, setScale] = useState(1);
  const billRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !consumptionUuid) {
      setBill(null);
      setError(null);
      setScale(1);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    let asAdmin = false;
    try {
      const raw = localStorage.getItem("user");
      asAdmin = raw ? isStaffRole(JSON.parse(raw).role) : false;
    } catch {
      asAdmin = false;
    }
    getBillForPrint(consumptionUuid, asAdmin)
      .then((data) => {
        if (!cancelled) setBill(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this bill. Check that you are signed in and the bill exists.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, consumptionUuid]);

  useLayoutEffect(() => {
    if (!open || !bill || loading) return;
    const viewport = viewportRef.current;
    const sheet = billRef.current;
    if (!viewport || !sheet) return;

    const fit = () => {
      const availableW = viewport.clientWidth;
      const availableH = viewport.clientHeight;
      const naturalW = sheet.scrollWidth;
      const naturalH = sheet.scrollHeight;
      if (!availableW || !availableH || !naturalW || !naturalH) return;
      const next = Math.min(1, availableW / naturalW, availableH / naturalH);
      setScale(Number.isFinite(next) && next > 0 ? next : 1);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(viewport);
    ro.observe(sheet);
    const images = Array.from(sheet.querySelectorAll("img"));
    images.forEach((img) => {
      img.addEventListener("load", fit);
      img.addEventListener("error", fit);
    });
    return () => {
      ro.disconnect();
      images.forEach((img) => {
        img.removeEventListener("load", fit);
        img.removeEventListener("error", fit);
      });
    };
  }, [open, bill, loading]);

  const handlePrint = () => {
    if (!billRef.current || !bill) return;
    const title = `Water Bill ${billNumber(bill)}`;
    printElementInChromeDialog(billRef.current, BILL_PRINT_CSS, title);
  };

  const photoUrl = uploadFileUrl(bill?.meter_photo_path);
  const waHref = (() => {
    if (!bill) return null;
    const digits = String(bill.mobile_number || "").replace(/\D/g, "");
    if (digits.length < 10) return null;
    const phone = digits.length === 10 ? `91${digits}` : digits;
    const text = encodeURIComponent(
      `Water bill ${billNumber(bill)} for ${bill.full_name}. Amount ₹${Number(bill.amount || 0).toFixed(2)}.`
    );
    return `https://wa.me/${phone}?text=${text}`;
  })();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      aria-labelledby="bill-preview-title"
      PaperProps={{
        sx: {
          height: "92vh",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle id="bill-preview-title" sx={{ fontWeight: 700, pr: 2, flex: "0 0 auto" }}>
        Bill preview
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          bgcolor: "#e8eef2",
          p: { xs: 1.5, sm: 2 },
          flex: "1 1 auto",
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Typography color="error">{error}</Typography>
        )}
        {bill && !loading && (
          <>
            <style>{BILL_PRINT_CSS}</style>
            <Box
              ref={viewportRef}
              sx={{
                flex: "1 1 auto",
                minHeight: 0,
                overflow: "hidden",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 720,
                  transform: `scale(${scale})`,
                  transformOrigin: "top center",
                }}
              >
                <Box
                  ref={billRef}
                  sx={{
                    boxShadow: "0 12px 40px rgba(18, 50, 74, 0.18)",
                  }}
                >
                  <BillDocument bill={bill} photoUrl={photoUrl} />
                </Box>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, gap: 1, flex: "0 0 auto" }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        {waHref && (
          <Button color="inherit" startIcon={<Chat />} href={waHref} target="_blank" rel="noreferrer">
            WhatsApp
          </Button>
        )}
        <Button variant="contained" color="primary" startIcon={<Print />} onClick={handlePrint} disabled={!bill || loading}>
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
}
