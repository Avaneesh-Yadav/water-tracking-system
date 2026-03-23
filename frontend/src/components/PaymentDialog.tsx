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
    if (!trimmed || processing) return;
    onConfirm(trimmed);
  };

  const canConfirm = message.trim().length > 0 && !processing;

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
            <TextField
              fullWidth
              label="Payment reference (e.g. UTR, transaction ID, or note)"
              placeholder="Enter reference so admin can verify your payment"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              multiline
              minRows={2}
              sx={{ mt: 2 }}
              inputProps={{ maxLength: 500 }}
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

