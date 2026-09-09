import React, { useEffect, useState } from "react";
import {
  Box, Button, Card, CardContent, CardHeader, TextField, Typography, Tabs, Tab, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, Autocomplete,
} from "@mui/material";
import { toast } from "@/hooks/use-toast";
import { opsApi } from "@/services/opsService";
import { getAllUsers } from "@/services/apiService";
import { isStaffRole, storedUserRole } from "@/utils/roles";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function FieldOpsPage() {
  const [tab, setTab] = useState(0);
  const staff = isStaffRole(storedUserRole());
  const now = new Date();
  const [route, setRoute] = useState<any>(null);
  const [stops, setStops] = useState<any[]>([]);
  const [userUuid, setUserUuid] = useState("");
  const [prev, setPrev] = useState("");
  const [curr, setCurr] = useState("");
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(now.getFullYear());
  const [pending, setPending] = useState<any[]>([]);
  const [leaks, setLeaks] = useState<any[]>([]);
  const [meters, setMeters] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [routeName, setRouteName] = useState("");
  const [routeWard, setRouteWard] = useState("");
  const [readerUuid, setReaderUuid] = useState("");
  const [readers, setReaders] = useState<any[]>([]);
  const [consumers, setConsumers] = useState<any[]>([]);
  const [selectedStops, setSelectedStops] = useState<string[]>([]);

  const reload = () => {
    opsApi.myRoute().then((r) => { setRoute(r.route); setStops(r.stops || []); }).catch(() => {});
    opsApi.leaks().then((r) => setLeaks(r.alerts || [])).catch(() => {});
    opsApi.meters().then((r) => setMeters(r.meters || [])).catch(() => {});
    if (staff) {
      opsApi.pendingReadings().then((r) => setPending(r.readings || [])).catch(() => {});
      opsApi.routes().then((r) => setRoutes(r.routes || [])).catch(() => {});
      getAllUsers({ role: "METER_READER" }).then((r: any) => setReaders(r.users || r || [])).catch(() => {});
      getAllUsers({ role: "USER" }).then((r: any) => setConsumers(r.users || r || [])).catch(() => {});
    }
  };
  useEffect(() => { reload(); }, []);

  const toastRun = async (fn: () => Promise<any>, title: string) => {
    try {
      const res = await fn();
      toast({ title, description: res.message });
      reload();
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.message || e.message, variant: "destructive" });
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Field & meters</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 2 }}>
        <Tab label="Today's route" />
        <Tab label="Submit reading" />
        {staff && <Tab label="Approval queue" />}
        <Tab label="Leak alerts" />
        <Tab label="Meter master" />
        {staff && <Tab label="Routes" />}
      </Tabs>

      {tab === 0 && (
        <Card>
          <CardHeader title={route?.name || "No route assigned"} subheader={route?.ward || "Ask admin to assign a beat"} />
          <CardContent>
            <Table size="small">
              <TableHead><TableRow><TableCell>#</TableCell><TableCell>Name</TableCell><TableCell>Connection</TableCell><TableCell>Last reading</TableCell><TableCell>Meter</TableCell></TableRow></TableHead>
              <TableBody>
                {stops.map((s) => (
                  <TableRow key={s.uuid} hover onClick={() => { setUserUuid(s.uuid); setPrev(String(s.last_reading || "0")); setTab(1); }}>
                    <TableCell>{s.stop_order}</TableCell>
                    <TableCell>{s.full_name}</TableCell>
                    <TableCell>{s.connection_id}</TableCell>
                    <TableCell>{s.last_reading ?? "—"}</TableCell>
                    <TableCell>{s.meter_number || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Card>
          <CardHeader title="Submit meter reading" subheader="Large fields for phone use. Reader submissions wait for admin approval." />
          <CardContent sx={{ display: "grid", gap: 2, maxWidth: 420 }}>
            <TextField select label="Connection" value={userUuid} onChange={(e) => setUserUuid(e.target.value)}>
              {(stops.length ? stops : meters).map((s) => (
                <MenuItem key={s.uuid} value={s.uuid}>{s.full_name} · {s.connection_id}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTHS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
            <TextField type="number" label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            <TextField type="number" label="Previous reading" value={prev} onChange={(e) => setPrev(e.target.value)} inputProps={{ style: { fontSize: 22 } }} />
            <TextField type="number" label="Current reading" value={curr} onChange={(e) => setCurr(e.target.value)} inputProps={{ style: { fontSize: 28 } }} />
            <Button variant="contained" size="large" onClick={() => toastRun(() => opsApi.submitReading({
              user_uuid: userUuid, month, year, previous_meter_reading: Number(prev), current_meter_reading: Number(curr),
            }), "Reading saved")}>Submit</Button>
          </CardContent>
        </Card>
      )}

      {staff && tab === 2 && (
        <Card>
          <CardHeader title="Pending readings" />
          <CardContent>
            <Table size="small">
              <TableHead><TableRow><TableCell>Consumer</TableCell><TableCell>Period</TableCell><TableCell>Liters</TableCell><TableCell>Amount</TableCell><TableCell /></TableRow></TableHead>
              <TableBody>
                {pending.map((p) => (
                  <TableRow key={p.uuid}>
                    <TableCell>{p.full_name}</TableCell>
                    <TableCell>{p.month} {p.year}</TableCell>
                    <TableCell>{p.consumption_liters}</TableCell>
                    <TableCell>₹{p.amount}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => toastRun(() => opsApi.decideReading(p.uuid, true), "Approved")}>Approve</Button>
                      <Button size="small" color="error" onClick={() => toastRun(() => opsApi.decideReading(p.uuid, false), "Rejected")}>Reject</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === (staff ? 3 : 2) && (
        <Card>
          <CardHeader title="High usage / possible leak" subheader="Latest reading is more than 1.8× the connection average" />
          <CardContent>
            <Table size="small">
              <TableHead><TableRow><TableCell>Consumer</TableCell><TableCell>Liters</TableCell><TableCell>Average</TableCell></TableRow></TableHead>
              <TableBody>
                {leaks.map((l) => (
                  <TableRow key={l.user_uuid}><TableCell>{l.full_name} · {l.connection_id}</TableCell><TableCell>{l.consumption_liters}</TableCell><TableCell>{Number(l.avg_prev).toFixed(0)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === (staff ? 4 : 3) && (
        <Card>
          <CardHeader title="Meter master" />
          <CardContent sx={{ overflow: "auto" }}>
            <Table size="small">
              <TableHead><TableRow><TableCell>Consumer</TableCell><TableCell>Meter no.</TableCell><TableCell>Status</TableCell><TableCell>Ward</TableCell>{staff && <TableCell>Map pin</TableCell>}</TableRow></TableHead>
              <TableBody>
                {meters.map((m) => (
                  <TableRow key={m.uuid}>
                    <TableCell>{m.full_name}</TableCell>
                    <TableCell>
                      {staff ? <TextField size="small" defaultValue={m.meter_number || ""} onBlur={(e) => opsApi.updateMeter(m.uuid, { meter_number: e.target.value })} /> : (m.meter_number || "—")}
                    </TableCell>
                    <TableCell>
                      {staff ? (
                        <TextField size="small" select defaultValue={m.meter_status || "OK"} onChange={(e) => opsApi.updateMeter(m.uuid, { meter_status: e.target.value })}>
                          {["OK", "FAULTY", "REPLACED", "STUCK"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </TextField>
                      ) : m.meter_status}
                    </TableCell>
                    <TableCell>{m.ward || "—"}</TableCell>
                    {staff && (
                      <TableCell>
                        <TextField size="small" defaultValue={m.latitude || ""} placeholder="lat" sx={{ width: 100, mr: 0.5 }} onBlur={(e) => opsApi.updateMeter(m.uuid, { latitude: e.target.value || null })} />
                        <TextField size="small" defaultValue={m.longitude || ""} placeholder="lng" sx={{ width: 100 }} onBlur={(e) => opsApi.updateMeter(m.uuid, { longitude: e.target.value || null })} />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {staff && tab === 5 && (
        <Card>
          <CardHeader title="Reading routes" />
          <CardContent sx={{ display: "grid", gap: 2 }}>
            {routes.map((r) => <Typography key={r.uuid} variant="body2">{r.name} · {r.ward || "no ward"} · {r.reader_name || "unassigned"} · {r.stop_count} stops</Typography>)}
            <TextField label="Route name" value={routeName} onChange={(e) => setRouteName(e.target.value)} />
            <TextField label="Ward" value={routeWard} onChange={(e) => setRouteWard(e.target.value)} />
            <TextField select label="Meter reader" value={readerUuid} onChange={(e) => setReaderUuid(e.target.value)}>
              {readers.map((r) => <MenuItem key={r.uuid} value={r.uuid}>{r.full_name}</MenuItem>)}
            </TextField>
            <Autocomplete
              multiple
              options={consumers}
              getOptionLabel={(c) => `${c.full_name} · ${c.connection_id || ""}`}
              value={consumers.filter((c) => selectedStops.includes(c.uuid))}
              onChange={(_, v) => setSelectedStops(v.map((x) => x.uuid))}
              renderInput={(params) => <TextField {...params} label="Stops" />}
            />
            <Button variant="contained" onClick={() => toastRun(() => opsApi.saveRoute({ name: routeName, ward: routeWard, reader_uuid: readerUuid, user_uuids: selectedStops }), "Route saved")}>Save route</Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
