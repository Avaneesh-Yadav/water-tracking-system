import React, { useEffect, useState } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import { opsApi } from "@/services/opsService";
import { BillDocument } from "@/components/bill/BillDocument";
import { BILL_PRINT_CSS } from "@/components/bill/billStyles";
import { printHtmlInChromeDialog } from "@/utils/printHtml";

export default function PrintPackPage() {
  const [ward, setWard] = useState("");
  const [bills, setBills] = useState<any[]>([]);

  const load = async () => {
    const res = await opsApi.printPack(ward.trim() || undefined);
    setBills(res.bills || []);
  };
  useEffect(() => { load().catch(() => setBills([])); }, []);

  const printAll = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>@page{size:A4;margin:12mm}${BILL_PRINT_CSS} .sheet{page-break-after:always;margin-bottom:16px}</style></head><body>${
      document.getElementById("print-pack-root")?.innerHTML || ""
    }</body></html>`;
    printHtmlInChromeDialog(html, "Unpaid bill pack");
  };

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Unpaid bill print pack</Typography>
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <TextField size="small" label="Ward (optional)" value={ward} onChange={(e) => setWard(e.target.value)} />
        <Button variant="outlined" onClick={() => load()}>Filter</Button>
        <Button variant="contained" onClick={printAll} disabled={!bills.length}>Print all</Button>
      </Box>
      <div id="print-pack-root">
        {bills.map((bill) => (
          <div key={bill.uuid} className="sheet" style={{ marginBottom: 24 }}>
            <BillDocument
              bill={{
                consumption_uuid: bill.uuid,
                connection_id: bill.connection_id,
                full_name: bill.full_name,
                address: bill.address,
                mobile_number: bill.mobile_number,
                month: bill.month,
                year: bill.year,
                consumption_liters: bill.consumption_liters,
                rate_per_liter: bill.rate_per_liter,
                amount: bill.amount,
                payment_status: bill.payment_status,
                organization_name: "AquaFlow",
                bill_due_day: 10,
                previous_meter_reading: bill.previous_meter_reading,
                current_meter_reading: bill.current_meter_reading,
                meter_photo_path: bill.meter_photo_path,
              }}
            />
          </div>
        ))}
      </div>
    </Box>
  );
}
