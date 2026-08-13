import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
} from "@mui/material";
import Person from "@mui/icons-material/Person";
import WaterDrop from "@mui/icons-material/WaterDrop";
import Payment from "@mui/icons-material/Payment";
import {
  getAllUsers,
  getAllConsumptionAdmin,
  getAllPaymentsAdmin,
  getConsumptionHistory,
  getPaymentHistory,
} from "@/services/apiService";
import type { ConsumptionRecord, PaymentRecord } from "@/services/apiService";
import { isStaffRole } from "@/utils/roles";

type UserRow = {
  uuid: string;
  full_name?: string;
  name?: string;
  mobile_number?: string;
  connection_id?: string;
};

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qParam = (searchParams.get("q") ?? "").trim();

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [consumption, setConsumption] = useState<ConsumptionRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!qParam) {
      setUsers([]);
      setConsumption([]);
      setPayments([]);
      return;
    }
    const load = async () => {
      setLoading(true);
      let admin = false;
      try {
        const stored = localStorage.getItem("user");
        if (stored) {
          const user = JSON.parse(stored);
          admin = isStaffRole(user?.role);
          setIsAdmin(admin);
        }
        if (admin) {
          const [u, c, p] = await Promise.all([
            getAllUsers({ q: qParam }),
            getAllConsumptionAdmin({ q: qParam }),
            getAllPaymentsAdmin({ q: qParam }),
          ]);
          const uList = Array.isArray(u) ? u : (u?.users ?? []);
          const raw = uList as unknown as Record<string, unknown>[];
          setUsers(
            raw.map((user) => ({
              uuid: String(user.uuid ?? user.id ?? ""),
              full_name: (user.full_name ?? user.name) as string | undefined,
              name: (user.name ?? user.full_name) as string | undefined,
              mobile_number: (user.mobile_number ?? user.mobileNumber) as string | undefined,
              connection_id: user.connection_id as string | undefined,
            }))
          );
          setConsumption(Array.isArray(c) ? c : (c?.records ?? []));
          setPayments(Array.isArray(p) ? p : (p?.payments ?? []));
        } else {
          const [c, p] = await Promise.all([
            getConsumptionHistory({ q: qParam }),
            getPaymentHistory({ q: qParam }),
          ]);
          setUsers([]);
          setConsumption(Array.isArray(c) ? c : []);
          setPayments(Array.isArray(p) ? p : []);
        }
      } catch {
        setUsers([]);
        setConsumption([]);
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [qParam]);

  const userMap = useMemo(() => {
    const m = new Map<string, UserRow>();
    users.forEach((u) => m.set(u.uuid, u));
    return m;
  }, [users]);

  if (loading) {
    return (
      <Box sx={{ width: "100%" }}>
        <Skeleton variant="text" width={280} height={40} sx={{ mb: 3 }} />
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardHeader
            avatar={<Skeleton variant="circular" width={40} height={40} />}
            title={<Skeleton variant="text" width={120} height={28} />}
            subheader={<Skeleton variant="text" width={160} height={20} sx={{ mt: 0.5 }} />}
          />
          <CardContent sx={{ pt: 0 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Box key={i} sx={{ py: 1.5, borderBottom: i < 3 ? 1 : 0, borderColor: "divider" }}>
                <Skeleton variant="text" width="70%" height={24} />
                <Skeleton variant="text" width="50%" height={20} sx={{ mt: 0.5 }} />
              </Box>
            ))}
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardHeader
            avatar={<Skeleton variant="circular" width={40} height={40} />}
            title={<Skeleton variant="text" width={140} height={28} />}
            subheader={<Skeleton variant="text" width={180} height={20} sx={{ mt: 0.5 }} />}
          />
          <CardContent sx={{ pt: 0 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Box key={i} sx={{ py: 1.5, borderBottom: i < 3 ? 1 : 0, borderColor: "divider" }}>
                <Skeleton variant="text" width="75%" height={24} />
                <Skeleton variant="text" width="45%" height={20} sx={{ mt: 0.5 }} />
              </Box>
            ))}
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardHeader
            avatar={<Skeleton variant="circular" width={40} height={40} />}
            title={<Skeleton variant="text" width={100} height={28} />}
            subheader={<Skeleton variant="text" width={150} height={20} sx={{ mt: 0.5 }} />}
          />
          <CardContent sx={{ pt: 0 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Box key={i} sx={{ py: 1.5, borderBottom: i < 3 ? 1 : 0, borderColor: "divider" }}>
                <Skeleton variant="text" width="65%" height={24} />
                <Skeleton variant="text" width="40%" height={20} sx={{ mt: 0.5 }} />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!qParam) {
    return (
      <Box sx={{ maxWidth: 640, mx: "auto" }}>
        <Typography variant="h6" color="text.secondary">
          Enter a search term in the header and press Enter to see results.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        Search: &ldquo;{qParam}&rdquo;
      </Typography>

      {/* Section 1: Matching consumers */}
      {isAdmin && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardHeader
            title="Consumers"
            subheader={users.length ? `${users.length} match(es)` : "No matching consumers"}
            avatar={<Person color="primary" />}
          />
          <CardContent sx={{ pt: 0 }}>
            {users.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No consumers match your search.
              </Typography>
            ) : (
              <List dense disablePadding>
                {users.map((u) => (
                  <ListItemButton
                    key={u.uuid}
                    component="button"
                    onClick={() => navigate(`/${u.uuid}`)}
                    sx={{ borderRadius: 1 }}
                  >
                    <ListItemText
                      primary={u.full_name ?? u.name ?? "—"}
                      secondary={u.connection_id ?? u.mobile_number ?? ""}
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 2: Consumption results */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardHeader
          title="Consumption"
          subheader={consumption.length ? `${consumption.length} match(es)` : "No matching consumption"}
          avatar={<WaterDrop color="primary" />}
        />
        <CardContent sx={{ pt: 0 }}>
          {consumption.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No consumption records match your search.
            </Typography>
          ) : (
            <List dense disablePadding>
              {consumption.map((c) => {
                const name = isAdmin ? ((c as ConsumptionRecord & { full_name?: string }).full_name ?? userMap.get(c.user_uuid)?.full_name ?? userMap.get(c.user_uuid)?.name) : null;
                return (
                  <ListItemButton
                    key={c.uuid}
                    component="button"
                    onClick={() => {
                      if (isAdmin) navigate(`/${c.user_uuid}`);
                      else navigate("/consumption");
                    }}
                    sx={{ borderRadius: 1 }}
                  >
                    <ListItemText
                      primary={`${c.month} ${c.year} · ${c.consumption_liters} L · ₹${c.amount}`}
                      secondary={name ?? undefined}
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Payments */}
      <Card variant="outlined">
        <CardHeader
          title="Payments"
          subheader={payments.length ? `${payments.length} match(es)` : "No matching payments"}
          avatar={<Payment color="primary" />}
        />
        <CardContent sx={{ pt: 0 }}>
          {payments.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No payments match your search.
            </Typography>
          ) : (
            <List dense disablePadding>
              {payments.map((p) => {
                const name = isAdmin ? ((p as PaymentRecord & { full_name?: string }).full_name ?? userMap.get(p.user_uuid)?.full_name ?? userMap.get(p.user_uuid)?.name) : null;
                return (
                  <ListItemButton
                    key={p.uuid}
                    component="button"
                    onClick={() => {
                      if (isAdmin) navigate(`/${p.user_uuid}`);
                      else navigate("/payments");
                    }}
                    sx={{ borderRadius: 1 }}
                  >
                    <ListItemText
                      primary={`₹${p.amount} · ${new Date(p.paid_at).toLocaleDateString("en-IN")}${p.payment_method ? ` · ${p.payment_method}` : ""}`}
                      secondary={name ?? undefined}
                      primaryTypographyProps={{ fontWeight: 500 }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SearchResultsPage;
