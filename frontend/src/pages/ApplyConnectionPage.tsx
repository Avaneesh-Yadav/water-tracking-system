import React, { useState } from "react";
import { Box, Button, TextField, Typography, Card, CardContent } from "@mui/material";
import { AuthShell } from "@/components/auth/AuthLayout";
import { opsApi } from "@/services/opsService";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

export default function ApplyConnectionPage() {
  const [full_name, setName] = useState("");
  const [mobile_number, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [ward, setWard] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await opsApi.applyPublic({ full_name, mobile_number, address, ward, notes });
      toast({ title: "Application submitted", description: "The water office will review it." });
      setName(""); setMobile(""); setAddress(""); setWard(""); setNotes("");
    } catch (e: any) {
      toast({ title: "Could not submit", description: e?.response?.data?.message || e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <Card sx={{ width: "min(480px, 100%)", position: "relative", zIndex: 2 }}>
        <CardContent>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>Apply for a connection</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>No login required. Staff will approve it from the service desk.</Typography>
          <Box sx={{ display: "grid", gap: 1.5 }}>
            <TextField label="Full name" value={full_name} onChange={(e) => setName(e.target.value)} />
            <TextField label="Mobile" value={mobile_number} onChange={(e) => setMobile(e.target.value)} inputProps={{ maxLength: 10 }} />
            <TextField label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
            <TextField label="Ward / area" value={ward} onChange={(e) => setWard(e.target.value)} />
            <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} />
            <Button variant="contained" disabled={busy} onClick={submit}>Submit application</Button>
            <Button component={Link} to="/login">Back to sign in</Button>
          </Box>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
