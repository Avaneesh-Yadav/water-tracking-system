import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Link,
} from "@mui/material";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ContactSupport from "@mui/icons-material/ContactSupport";
import Badge from "@mui/icons-material/Badge";
import { getBrandingSettings, getUserByUUID } from "@/services/apiService";

const FAQ_ITEMS = [
  { q: "How do I pay my water bill?", a: "From the Dashboard, click 'Pay Total Due' or pay a specific bill. Scan the QR code with your UPI app, complete the payment, then tap 'I have paid' to record it." },
  { q: "When is my bill due?", a: "The due day is set by your water authority (see Settings for the default). Your bill slip shows the due date. Pay before the due day to avoid late fees if applicable." },
  { q: "How do I read my meter?", a: "Note the current reading on your water meter (in liters). Enter it when you submit a reading or ask your admin to add the consumption for your connection." },
  { q: "Can I download my bill?", a: "Yes. On the Dashboard, in the 'Recent bills' table, click 'Bill' next to any period to open and print your bill." },
  { q: "Who do I contact for support?", a: "Use the contact details below. They are set by your water authority in the app settings." },
];

const HelpPage = () => {
  const [branding, setBranding] = useState<{ organization_name: string; support_email: string | null; support_phone: string | null }>({
    organization_name: "Water Supply",
    support_email: null,
    support_phone: null,
  });
  const [user, setUser] = useState<{ full_name?: string; connection_id?: string; address?: string }>({});

  useEffect(() => {
    getBrandingSettings().then((b) => setBranding(b)).catch(() => {});
    const loadUser = async () => {
      try {
        const stored = localStorage.getItem("user");
        if (stored) {
          const u = JSON.parse(stored);
          if (u?.uuid) {
            const profile = await getUserByUUID(u.uuid);
            setUser({ full_name: profile.full_name, connection_id: profile.connection_id, address: profile.address });
          } else {
            setUser({ full_name: u.full_name, connection_id: u.connection_id, address: u.address });
          }
        }
      } catch {}
    };
    loadUser();
  }, []);

  const printConnectionCard = () => {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`
        <!DOCTYPE html><html><head><title>Connection Card</title></head>
        <body style="font-family:system-ui;padding:24px;max-width:400px;margin:0 auto;border:2px solid #333">
        <h2>${branding.organization_name}</h2>
        <p><strong>Connection card</strong></p>
        <p>Name: ${user.full_name || "—"}<br>Connection ID: ${user.connection_id || "—"}<br>Address: ${user.address || "—"}</p>
        <p style="font-size:12px;color:#666">Keep this for your records.</p>
        </body></html>
      `);
      w.document.close();
      w.print();
      w.close();
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", width: "100%" }}>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 2, color: "text.primary" }}>
        Help & support
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardHeader title="Connection card" subheader="Your connection details for reference" avatar={<Badge sx={{ color: "primary.main" }} />} />
        <CardContent sx={{ pt: 0 }}>
          <Typography variant="body2"><strong>Name:</strong> {user.full_name || "—"}</Typography>
          <Typography variant="body2"><strong>Connection ID:</strong> <Box component="span" sx={{ fontFamily: "monospace" }}>{user.connection_id || "—"}</Box></Typography>
          <Typography variant="body2"><strong>Address:</strong> {user.address || "—"}</Typography>
          <Button variant="outlined" size="small" sx={{ mt: 2 }} onClick={printConnectionCard}>Print connection card</Button>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardHeader title="Contact" subheader={branding.organization_name} avatar={<ContactSupport sx={{ color: "primary.main" }} />} />
        <CardContent sx={{ pt: 0 }}>
          {branding.support_email && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              Email: <Link href={`mailto:${branding.support_email}`}>{branding.support_email}</Link>
            </Typography>
          )}
          {branding.support_phone && (
            <Typography variant="body2">Phone: <Link href={`tel:${branding.support_phone}`}>{branding.support_phone}</Link></Typography>
          )}
          {!branding.support_email && !branding.support_phone && (
            <Typography variant="body2" color="text.secondary">Contact details are set by your administrator in Settings.</Typography>
          )}
        </CardContent>
      </Card>

      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Frequently asked questions</Typography>
      {FAQ_ITEMS.map((item, i) => (
        <Accordion key={i} variant="outlined" sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>{item.q}</AccordionSummary>
          <AccordionDetails><Typography variant="body2" color="text.secondary">{item.a}</Typography></AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default HelpPage;
