import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Button,
  TextField,
} from "@mui/material";
import * as QRCodeLib from "qrcode.react";
import type { QRData } from "@/services/apiService";

const QRCode = QRCodeLib.QRCodeSVG;

type PaymentDialogProps = {
  open: boolean;
  qrData: QRData | null;
  contextLabel: string;
  processing: boolean;
  onConfirm: (message: string) => void;
  onClose: () => void;
};

const PaymentDialog: React.FC<PaymentDialogProps> = ({
  open,
  qrData,
  contextLabel,
  processing,
  onConfirm,
  onClose,
}) => {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) setMessage("");
  }, [open]);

  const handleClose = () => {
    if (processing) return;
    setMessage("");
    onClose();
  };

  const handleConfirm = () => {
    const trimmed = message.trim();
    if (trimmed.replace(/\s+/g, "").length < 6 || processing) return;
    onConfirm(trimmed);
  };

  const canConfirm = message.trim().replace(/\s+/g, "").length >= 6 && !processing;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Scan to Pay via UPI</DialogTitle>
      <DialogContent>
        {qrData && (
          <>
            <Typography sx={{ mb: 1 }}>
              {contextLabel}: <strong>₹{qrData.amount}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Pay to: <strong>{qrData.payee_name}</strong> ({qrData.upi_id})
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", p: 2, bgcolor: "grey.100", borderRadius: 2 }}>
              <QRCode value={qrData.upi_url} size={200} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Pay with any UPI app, then enter the UTR / UPI reference. There is no Razorpay checkout.
            </Typography>
            <TextField
              fullWidth
              label="UPI UTR / reference (min 6 characters)"
              placeholder="e.g. 123456789012"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              helperText="Copy the UTR from your UPI app so the office can approve your payment."
              sx={{ mt: 1.5 }}
              inputProps={{ maxLength: 40 }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={processing}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleConfirm} disabled={!canConfirm}>
          {processing ? "Processing..." : "I have completed the payment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentDialog;

