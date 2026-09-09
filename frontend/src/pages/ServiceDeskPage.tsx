import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tabs,
  Tab,
  Paper,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import { toast } from "@/hooks/use-toast";
import { opsApi } from "@/services/opsService";
import { getAllUsers } from "@/services/apiService";
import { isStaffRole, storedUserRole } from "@/utils/roles";

function categoryLabel(c?: string) {
  return String(c || "GENERAL").replace(/_/g, " ");
}

function statusColor(status?: string): "default" | "warning" | "info" | "success" | "error" {
  const s = String(status || "").toUpperCase();
  if (s === "OPEN") return "warning";
  if (s === "IN_PROGRESS") return "info";
  if (s === "RESOLVED") return "success";
  if (s === "CLOSED") return "default";
  return "default";
}

function formatWhen(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ServiceDeskPage() {
  const staff = isStaffRole(storedUserRole());
  const [tab, setTab] = useState(0);
  const [tickets, setTickets] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [category, setCategory] = useState("NO_WATER");
  const [apps, setApps] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [target, setTarget] = useState("");
  const [selected, setSelected] = useState<any | null>(null);

  const load = () => {
    opsApi.tickets().then((r) => setTickets(r.tickets || [])).catch(() => setTickets([]));
    if (staff) {
      opsApi.applications().then((r) => setApps(r.applications || [])).catch(() => setApps([]));
      getAllUsers({ role: "USER" }).then((r: any) => setUsers(r.users || r || [])).catch(() => setUsers([]));
    }
  };
  useEffect(() => {
    load();
  }, []);

  const run = async (fn: () => Promise<any>, msg: string) => {
    try {
      const res = await fn();
      toast({ title: msg, description: res.message });
      load();
      setSelected((prev: any) => (prev ? { ...prev, status: res.status || prev.status } : prev));
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.message || e.message, variant: "destructive" });
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", width: "100%" }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Service desk
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Tickets" />
        {staff && <Tab label="Disconnect" />}
        {staff && <Tab label="Applications" />}
      </Tabs>

      {tab === 0 && (
        <>
          <Card sx={{ mb: 2 }} variant="outlined">
            <CardHeader
              title="Raise a query"
              subheader={staff ? "Open a complaint on behalf of operations, or consumers use this form for themselves." : "Describe your issue. Track it under My queries below."}
            />
            <CardContent sx={{ display: "grid", gap: 2, maxWidth: 520 }}>
              <TextField select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                {["NO_WATER", "LEAK", "WRONG_BILL", "METER", "GENERAL"].map((c) => (
                  <MenuItem key={c} value={c}>
                    {categoryLabel(c)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary" />
              <TextField
                label="Details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                multiline
                minRows={3}
                placeholder="What happened, when, and any useful reference (bill month, meter, etc.)"
              />
              <Button
                variant="contained"
                disabled={!title.trim()}
                onClick={() =>
                  run(async () => {
                    const res = await opsApi.createTicket({ category, title: title.trim(), details: details.trim() });
                    setTitle("");
                    setDetails("");
                    setCategory("NO_WATER");
                    return res;
                  }, "Query submitted")
                }
              >
                Submit query
              </Button>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardHeader
              title={staff ? "All queries" : "My queries"}
              subheader={staff ? "Open a row to see full details, consumer info, and update status." : "Track status of queries you raised."}
            />
            <CardContent sx={{ pt: 0 }}>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell>Title</TableCell>
                      {staff && <TableCell>Raised by</TableCell>}
                      <TableCell>Details</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Raised</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={staff ? 7 : 6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                          No queries yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tickets.map((t) => (
                        <TableRow key={t.uuid} hover>
                          <TableCell>
                            <Chip size="small" label={categoryLabel(t.category)} variant="outlined" />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, maxWidth: 180 }}>{t.title}</TableCell>
                          {staff && (
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {t.full_name || "—"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {t.connection_id || "—"} · {t.mobile_number || "—"}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell sx={{ maxWidth: 240, color: "text.secondary" }}>
                            {t.details ? (
                              <Typography
                                variant="body2"
                                sx={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {t.details}
                              </Typography>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={t.status} color={statusColor(t.status)} />
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>{formatWhen(t.created_at)}</TableCell>
                          <TableCell align="right">
                            <Button size="small" startIcon={<Visibility />} onClick={() => setSelected(t)}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}

      {staff && tab === 1 && (
        <Card variant="outlined">
          <CardHeader title="Disconnect / reconnect" />
          <CardContent sx={{ display: "grid", gap: 2, maxWidth: 480 }}>
            <TextField select label="Consumer" value={target} onChange={(e) => setTarget(e.target.value)}>
              {users.map((u) => (
                <MenuItem key={u.uuid} value={u.uuid}>
                  {u.full_name} · {u.status}
                </MenuItem>
              ))}
            </TextField>
            <Button color="error" variant="contained" disabled={!target} onClick={() => run(() => opsApi.connectionStatus(target, "DISCONNECTED"), "Disconnected")}>
              Disconnect
            </Button>
            <Button variant="contained" disabled={!target} onClick={() => run(() => opsApi.connectionStatus(target, "ACTIVE"), "Reconnected")}>
              Reconnect
            </Button>
          </CardContent>
        </Card>
      )}

      {staff && tab === 2 && (
        <Card variant="outlined">
          <CardHeader title="New connection applications" />
          <CardContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {apps.map((a) => (
                  <TableRow key={a.uuid}>
                    <TableCell>{a.full_name}</TableCell>
                    <TableCell>{a.mobile_number}</TableCell>
                    <TableCell>{a.address}</TableCell>
                    <TableCell>{a.status}</TableCell>
                    <TableCell>
                      {a.status === "PENDING" && (
                        <>
                          <Button size="small" onClick={() => run(() => opsApi.decideApplication(a.uuid, true), "Approved")}>
                            Approve
                          </Button>
                          <Button size="small" color="error" onClick={() => run(() => opsApi.decideApplication(a.uuid, false), "Rejected")}>
                            Reject
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
        <DialogTitle>Query details</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Title
                </Typography>
                <Typography fontWeight={700}>{selected.title}</Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip size="small" label={categoryLabel(selected.category)} variant="outlined" />
                <Chip size="small" label={selected.status} color={statusColor(selected.status)} />
              </Stack>
              {staff && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Raised by
                  </Typography>
                  <Typography>
                    {selected.full_name || "—"} · {selected.connection_id || "—"} · {selected.mobile_number || "—"}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Details
                </Typography>
                <Typography sx={{ whiteSpace: "pre-wrap" }}>{selected.details || "No extra details provided."}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Raised at
                </Typography>
                <Typography>{formatWhen(selected.created_at)}</Typography>
              </Box>
              {staff && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Update status
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => (
                      <Button
                        key={s}
                        size="small"
                        variant={selected.status === s ? "contained" : "outlined"}
                        onClick={() =>
                          run(async () => {
                            const res = await opsApi.updateTicket(selected.uuid, s);
                            setSelected((prev: any) => (prev ? { ...prev, status: s } : prev));
                            return res;
                          }, `Status → ${s}`)
                        }
                      >
                        {s.replace("_", " ")}
                      </Button>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
