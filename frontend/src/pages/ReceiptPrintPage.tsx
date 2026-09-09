import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Box, Button, Typography, CircularProgress } from "@mui/material";
import Print from "@mui/icons-material/Print";
import { getPaymentHistory, getPaymentHistoryByUser } from "@/services/apiService";
import { isStaffRole, storedUserRole } from "@/utils/roles";
import { printElementInChromeDialog } from "@/utils/printHtml";
import { amountInIndianWords } from "@/utils/amountInWords";

export default function ReceiptPrintPage() {
  const { paymentUuid } = useParams<{ paymentUuid: string }>();
  const [row, setRow] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const staff = isStaffRole(storedUserRole());
        let list: any[] = [];
        if (staff) {
          const stored = JSON.parse(localStorage.getItem("user") || "{}");
          const res = await getPaymentHistory({ limit: 100, page: 1 });
          list = Array.isArray(res) ? res : res.history || [];
          if (!list.find((p) => p.uuid === paymentUuid) && stored.uuid) {
            const mine = await getPaymentHistoryByUser(stored.uuid);
            list = mine;
          }
        } else {
          const res = await getPaymentHistory({ limit: 100, page: 1 });
          list = Array.isArray(res) ? res : res.history || [];
        }
        const found = list.find((p) => p.uuid === paymentUuid);
        if (!found) setError("Receipt not found in recent payments.");
        else setRow(found);
      } catch {
        setError("Could not load receipt");
      }
    })();
  }, [paymentUuid]);

  if (error) return <Box sx={{ p: 3 }}><Typography color="error">{error}</Typography><Button component={Link} to="/payments">Back</Button></Box>;
  if (!row) return <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>;

  const css = `body{font-family:Segoe UI,Arial,sans-serif;color:#12324a} .rcpt{max-width:420px;margin:0 auto;border:2px solid #1b4d6b;padding:20px} h1{font-size:18px;margin:0 0 8px} .muted{color:#4a6576;font-size:12px}`;

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <Button variant="contained" startIcon={<Print />} onClick={() => ref.current && printElementInChromeDialog(ref.current, css, "Payment receipt")}>Print receipt</Button>
      <div ref={ref}>
        <article className="rcpt" style={{ maxWidth: 420, border: "2px solid #1b4d6b", padding: 20, background: "#fff" }}>
          <h1 style={{ marginTop: 0 }}>Payment receipt</h1>
          <p className="muted">AquaFlow water supply</p>
          <p><strong>Receipt</strong> {String(row.uuid).slice(0, 8).toUpperCase()}</p>
          <p>Amount <strong>₹{Number(row.amount).toFixed(2)}</strong></p>
          <p>{amountInIndianWords(Number(row.amount))}</p>
          <p>Method {row.payment_method} · UTR {row.transaction_id || "—"}</p>
          <p>Period {row.month || "—"} {row.year || ""}</p>
          <p>Paid at {row.paid_at ? new Date(row.paid_at).toLocaleString("en-IN") : "—"}</p>
          <p>{row.full_name || ""} {row.connection_id ? `· ${row.connection_id}` : ""}</p>
        </article>
      </div>
    </Box>
  );
}
