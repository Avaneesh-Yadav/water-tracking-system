import React, { useEffect, useState } from "react";
import {
  Box, Button, Card, CardContent, CardHeader, TextField, Typography, Tabs, Tab, MenuItem,
} from "@mui/material";
import { toast } from "@/hooks/use-toast";
import { downloadJsonCsv, opsApi } from "@/services/opsService";
import { getAllUnpaidConsumptionAdmin, getAllUsers } from "@/services/apiService";
import { useNavigate } from "react-router-dom";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function BillingOpsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const now = new Date();
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(now.getFullYear());
  const [busy, setBusy] = useState(false);
  const [creditUuid, setCreditUuid] = useState("");
  const [creditAmt, setCreditAmt] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [depUser, setDepUser] = useState("");
  const [depAmt, setDepAmt] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [unpaid, setUnpaid] = useState<any[]>([]);
  const [slabs, setSlabs] = useState("[]");
  const [lateType, setLateType] = useState("amount");
  const [lateValue, setLateValue] = useState("50");
  const [prefix, setPrefix] = useState("WB");
  const [parentUuid, setParentUuid] = useState("");
  const [extraMobile, setExtraMobile] = useState("");
  const [extraAddress, setExtraAddress] = useState("");

  useEffect(() => {
    getAllUsers({ role: "USER" }).then((r: any) => setUsers(r.users || r || [])).catch(() => {});
    getAllUnpaidConsumptionAdmin().then((r) => setUnpaid(r || [])).catch(() => {});
    opsApi.settings().then((s) => {
      setSlabs(s.tariff_slabs || "[]");
      setLateType(s.late_fee_type || "amount");
      setLateValue(s.late_fee_value || "50");
      setPrefix(s.bill_prefix || "WB");
    }).catch(() => {});
  }, []);

  const run = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true);
    try {
      const res = await fn();
      toast({ title: ok, description: res.message || JSON.stringify(res) });
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.message || e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 960, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Billing operations</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable">
        <Tab label="Bill run" />
        <Tab label="Late fee / tariff" />
        <Tab label="Credit & deposit" />
        <Tab label="Board pack" />
        <Tab label="Extra connection" />
      </Tabs>

      {tab === 0 && (
        <Card>
          <CardHeader title="Monthly bill run" subheader="Number unpaid/approved readings, SMS consumers, fill inbox. Payments stay UPI QR + admin approve (no Razorpay)." />
          <CardContent sx={{ display: "grid", gap: 2, maxWidth: 420 }}>
            <TextField select label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTHS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
            <TextField type="number" label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            <Button variant="contained" disabled={busy} onClick={() => run(() => opsApi.billRun(month, year), "Bill run")}>Run bill cycle</Button>
            <Button disabled={busy} onClick={() => run(() => opsApi.reminders(), "Reminders")}>Send due reminders now</Button>
            <Button onClick={() => navigate("/billing/print-pack")}>Open unpaid print pack</Button>
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Card>
          <CardHeader title="Slabs & late fee" subheader="Example: [{&quot;upto&quot;:10000,&quot;rate&quot;:20},{&quot;upto&quot;:null,&quot;rate&quot;:30}]" />
          <CardContent sx={{ display: "grid", gap: 2 }}>
            <TextField label="Bill prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
            <TextField select label="Late fee type" value={lateType} onChange={(e) => setLateType(e.target.value)}>
              <MenuItem value="amount">Flat ₹</MenuItem>
              <MenuItem value="percent">Percent of bill</MenuItem>
            </TextField>
            <TextField label="Late fee value" value={lateValue} onChange={(e) => setLateValue(e.target.value)} />
            <TextField label="Tariff slabs JSON" value={slabs} onChange={(e) => setSlabs(e.target.value)} multiline minRows={4} />
            <Button variant="contained" disabled={busy} onClick={() => run(() => opsApi.saveSettings({ bill_prefix: prefix, late_fee_type: lateType, late_fee_value: lateValue, tariff_slabs: slabs }), "Saved")}>Save tariff</Button>
            <Button disabled={busy} onClick={() => run(() => opsApi.lateFees(), "Late fees")}>Apply late fees to overdue unpaid bills</Button>
          </CardContent>
        </Card>
      )}

      {tab === 2 && (
        <Card>
          <CardHeader title="Credit note & security deposit" />
          <CardContent sx={{ display: "grid", gap: 2, maxWidth: 480 }}>
            <TextField select label="Unpaid bill" value={creditUuid} onChange={(e) => setCreditUuid(e.target.value)}>
              {unpaid.map((b) => (
                <MenuItem key={b.uuid} value={b.uuid}>{b.full_name} · {b.month} {b.year} · ₹{b.amount}</MenuItem>
              ))}
            </TextField>
            <TextField label="Credit amount ₹" value={creditAmt} onChange={(e) => setCreditAmt(e.target.value)} />
            <TextField label="Reason" value={creditNote} onChange={(e) => setCreditNote(e.target.value)} />
            <Button disabled={busy} variant="contained" onClick={() => run(() => opsApi.creditNote(creditUuid, Number(creditAmt), creditNote), "Credit applied")}>Apply credit</Button>
            <TextField select label="Consumer" value={depUser} onChange={(e) => setDepUser(e.target.value)}>
              {users.map((u) => <MenuItem key={u.uuid} value={u.uuid}>{u.full_name} · {u.connection_id}</MenuItem>)}
            </TextField>
            <TextField label="Deposit change ₹ (use negative to reduce)" value={depAmt} onChange={(e) => setDepAmt(e.target.value)} />
            <Button disabled={busy} onClick={() => run(() => opsApi.deposit(depUser, Number(depAmt)), "Deposit updated")}>Adjust deposit</Button>
            <Button disabled={busy || !creditUuid} onClick={() => run(() => opsApi.payFromDeposit(creditUuid), "Deposit applied to bill")}>Pay selected bill from deposit</Button>
          </CardContent>
        </Card>
      )}

      {tab === 3 && (
        <Card>
          <CardHeader title="Board / panchayat pack" subheader="Download outstanding, revenue, and audit as CSV" />
          <CardContent>
            <Button variant="contained" onClick={async () => {
              const pack = await opsApi.boardPack();
              downloadJsonCsv(`outstanding-${Date.now()}.csv`, pack.outstanding || []);
              downloadJsonCsv(`revenue-${Date.now()}.csv`, pack.revenue || []);
              downloadJsonCsv(`audit-${Date.now()}.csv`, pack.audit || []);
              toast({ title: "Downloaded three CSV files" });
            }}>Download CSVs</Button>
          </CardContent>
        </Card>
      )}

      {tab === 4 && (
        <Card>
          <CardHeader title="Additional connection" subheader="Same household, second meter. Needs its own 10-digit contact number." />
          <CardContent sx={{ display: "grid", gap: 2, maxWidth: 480 }}>
            <TextField select label="Parent consumer" value={parentUuid} onChange={(e) => setParentUuid(e.target.value)}>
              {users.map((u) => <MenuItem key={u.uuid} value={u.uuid}>{u.full_name} · {u.connection_id}</MenuItem>)}
            </TextField>
            <TextField label="Site mobile" value={extraMobile} onChange={(e) => setExtraMobile(e.target.value)} inputProps={{ maxLength: 10 }} />
            <TextField label="Site address" value={extraAddress} onChange={(e) => setExtraAddress(e.target.value)} />
            <Button variant="contained" disabled={busy} onClick={() => run(() => opsApi.extraConnection({ parent_user_uuid: parentUuid, mobile_number: extraMobile, address: extraAddress }), "Connection created")}>Create extra connection</Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
