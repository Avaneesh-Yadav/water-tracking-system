import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Alert,
  LinearProgress,
} from "@mui/material";
import CloudUpload from "@mui/icons-material/CloudUpload";
import Group from "@mui/icons-material/Group";
import { toast } from "@/hooks/use-toast";
import { getAllUsers, bulkImportConsumption, bulkUpdateStatus } from "@/services/apiService";

const BulkOperationsPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const consumerRows = useMemo(
    () => users.filter((u) => (u.role || "").toUpperCase() === "USER"),
    [users]
  );

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await getAllUsers({ page: 1, limit: 100 });
      const list = Array.isArray(res) ? res : res?.users ?? [];
      setUsers(list);
    } catch {
      setUsers([]);
      toast({ title: "Error", description: "Could not load users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggle = (uuid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === consumerRows.length) setSelected(new Set());
    else setSelected(new Set(consumerRows.map((u) => u.uuid)));
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const res = await bulkImportConsumption(file);
      toast({
        title: "Bulk consumption",
        description: res.message || `Success: ${res.results?.success ?? 0}, failed: ${res.results?.failed ?? 0}`,
      });
      await loadUsers();
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.response?.data?.message || err?.message || "Import failed",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const applyStatus = async (status: "ACTIVE" | "REVOKE") => {
    const uuids = Array.from(selected);
    if (uuids.length === 0) {
      toast({ title: "Select users", description: "Choose at least one consumer.", variant: "destructive" });
      return;
    }
    setStatusBusy(true);
    try {
      const res = await bulkUpdateStatus(uuids, status);
      toast({ title: "Updated", description: res.message });
      setSelected(new Set());
      await loadUsers();
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    } finally {
      setStatusBusy(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", width: "100%" }}>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
        Bulk operations
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardHeader title="Bulk consumption import" subheader="Excel/CSV: connection_id (or user_uuid), month, year, consumption_liters [, rate_per_liter]" avatar={<CloudUpload color="primary" />} />
        <CardContent sx={{ pt: 0 }}>
          {uploading && <LinearProgress sx={{ mb: 2 }} />}
          <Button variant="contained" component="label" disabled={uploading}>
            Choose file (.xlsx / .csv)
            <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleFile} />
          </Button>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader
          title="Bulk user status"
          subheader="Select consumer accounts (role USER), then set Active or Revoke"
          avatar={<Group color="primary" />}
        />
        <CardContent sx={{ pt: 0 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            <Button variant="outlined" size="small" onClick={toggleAll} disabled={loading || consumerRows.length === 0}>
              {selected.size === consumerRows.length ? "Clear all" : "Select all"}
            </Button>
            <Button variant="contained" color="success" disabled={statusBusy || selected.size === 0} onClick={() => applyStatus("ACTIVE")}>
              Set Active
            </Button>
            <Button variant="contained" color="warning" disabled={statusBusy || selected.size === 0} onClick={() => applyStatus("REVOKE")}>
              Revoke
            </Button>
          </Box>
          {selected.size > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {selected.size} user(s) selected
            </Alert>
          )}
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Name</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell>Connection</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5}>Loading…</TableCell>
                  </TableRow>
                ) : consumerRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No consumer users found
                    </TableCell>
                  </TableRow>
                ) : (
                  consumerRows.map((u) => (
                    <TableRow key={u.uuid} hover selected={selected.has(u.uuid)}>
                      <TableCell padding="checkbox">
                        <Checkbox checked={selected.has(u.uuid)} onChange={() => toggle(u.uuid)} />
                      </TableCell>
                      <TableCell>{u.full_name}</TableCell>
                      <TableCell>{u.mobile_number}</TableCell>
                      <TableCell>{u.connection_id}</TableCell>
                      <TableCell>{u.status}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default BulkOperationsPage;
