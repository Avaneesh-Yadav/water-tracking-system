import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Badge,
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
  Skeleton,
  TablePagination,
  Chip,
} from "@mui/material";
import { Link } from "react-router-dom";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import SwapVert from "@mui/icons-material/SwapVert";
import {
  getPaymentHistory,
  getAllPaymentsAdmin,
  getAdminNotifications,
  getAdminPaymentNotificationsByUser,
  approveAdminPaymentNotification,
} from "@/services/apiService";
import type { PaymentRecord } from "@/services/apiService";
import type { NotificationRecord } from "@/services/apiService";
import { toast } from "@/hooks/use-toast";
import { isStaffRole } from "@/utils/roles";

type AdminPaymentSortField = "full_name" | "amount" | "payment_method" | "transaction_id" | "upi_id" | "paid_at" | "created_at";

type NotificationSortField = "created_at" | "full_name" | "connection_id" | "amount" | "message";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const formatShortDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const PaymentsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"USER" | "ADMIN" | "SUPER_ADMIN">("USER");
  const [adminPaymentList, setAdminPaymentList] = useState<PaymentRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [adminPage, setAdminPage] = useState(0);
  const [adminRowsPerPage, setAdminRowsPerPage] = useState(10);
  const [adminTotal, setAdminTotal] = useState(0);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSortField, setAdminSortField] = useState<AdminPaymentSortField>("paid_at");
  const [adminSortOrder, setAdminSortOrder] = useState<"asc" | "desc">("desc");
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [approvingUuid, setApprovingUuid] = useState<string | null>(null);
  const [paidNotificationUuids, setPaidNotificationUuids] = useState<Record<string, boolean>>({});
  const [notifPage, setNotifPage] = useState(0);
  const [notifRowsPerPage, setNotifRowsPerPage] = useState(10);
  const [notifSortField, setNotifSortField] = useState<NotificationSortField>("created_at");
  const [notifSortOrder, setNotifSortOrder] = useState<"asc" | "desc">("desc");

  const userTotalPaidAmount = useMemo(() => {
    if (!payments || payments.length === 0) return 0;
    return payments.reduce((sum, p) => sum + (Number((p as any).amount) || 0), 0);
  }, [payments]);
  const filterUserUuid = (() => {
    const params = new URLSearchParams(location.search);
    const v = params.get("user_uuid");
    return v ? String(v) : null;
  })();

  const fetchAdminPayments = useCallback(async (pageNum: number, limit: number) => {
    setAdminLoading(true);
    try {
      const res = await getAllPaymentsAdmin({ page: pageNum + 1, limit });
      if (Array.isArray(res)) {
        setAdminPaymentList(res);
        setAdminTotal(res.length);
      } else {
        setAdminPaymentList(res?.payments ?? []);
        setAdminTotal(res?.total ?? 0);
      }
    } catch {
      setAdminPaymentList([]);
      setAdminTotal(0);
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const fetchAdminNotifications = useCallback(async () => {
    setNotificationLoading(true);
    try {
      if (filterUserUuid) {
        setNotifications(await getAdminPaymentNotificationsByUser(filterUserUuid));
      } else {
        const rows = await getAdminNotifications();
        const paymentRows = rows.filter((n) => n.related_to === "PAYMENT");
        setNotifications(paymentRows);
      }
    } finally {
      setNotificationLoading(false);
    }
  }, [filterUserUuid]);

  const fetchUserPayments = useCallback(async (pageNum: number, limit: number) => {
    const res = await getPaymentHistory({ page: pageNum + 1, limit });
    if (Array.isArray(res)) {
      setPayments(res);
      setTotal(res.length);
    } else {
      setPayments(res.history || []);
      setTotal(res.total || 0);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const stored = localStorage.getItem("user");
        if (!stored) {
          setLoading(false);
          return;
        }
        const user = JSON.parse(stored);
        const r = (user?.role || "USER").toUpperCase();
        setRole(r as "USER" | "ADMIN" | "SUPER_ADMIN");

        if (isStaffRole(r)) {
          await fetchAdminPayments(0, adminRowsPerPage);
          await fetchAdminNotifications();
        } else {
          await fetchUserPayments(0, rowsPerPage);
        }
      } catch {
        setPayments([]);
        setAdminPaymentList([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [fetchUserPayments, rowsPerPage, fetchAdminPayments, fetchAdminNotifications]);

  const handleApproveNotification = async (notificationUuid: string) => {
    try {
      setApprovingUuid(notificationUuid);
      await approveAdminPaymentNotification(notificationUuid);
      toast({ title: "Approved", description: "Payment marked as paid." });
      setPaidNotificationUuids((prev) => ({ ...prev, [notificationUuid]: true }));
      await Promise.all([fetchAdminPayments(adminPage, adminRowsPerPage), fetchAdminNotifications()]);
    } catch (error: any) {
      toast({ title: "Error", description: error?.response?.data?.message || "Failed to approve payment", variant: "destructive" });
    } finally {
      setApprovingUuid(null);
    }
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
    setLoading(true);
    fetchUserPayments(newPage, rowsPerPage).finally(() => setLoading(false));
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
    setLoading(true);
    fetchUserPayments(0, parseInt(e.target.value, 10)).finally(() => setLoading(false));
  };

  const handleRowClick = (p: PaymentRecord) => {
    navigate(`/${p.user_uuid}`);
  };

  const handleAdminPageChange = (_: unknown, newPage: number) => {
    setAdminPage(newPage);
    setAdminLoading(true);
    fetchAdminPayments(newPage, adminRowsPerPage).finally(() => setAdminLoading(false));
  };

  const handleAdminRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(e.target.value, 10);
    setAdminRowsPerPage(newLimit);
    setAdminPage(0);
    setAdminLoading(true);
    fetchAdminPayments(0, newLimit).finally(() => setAdminLoading(false));
  };

  const handleAdminSort = (field: AdminPaymentSortField) => {
    if (adminSortField === field) {
      setAdminSortOrder(adminSortOrder === "asc" ? "desc" : "asc");
    } else {
      setAdminSortField(field);
      setAdminSortOrder("desc");
    }
  };

  const AdminSortIcon = ({ field }: { field: AdminPaymentSortField }) => {
    if (adminSortField !== field) return <SwapVert sx={{ ml: 0.5, fontSize: 20, color: "grey.400" }} />;
    return adminSortOrder === "asc" ? (
      <ArrowUpward sx={{ ml: 0.5, fontSize: 20, color: "primary.main" }} />
    ) : (
      <ArrowDownward sx={{ ml: 0.5, fontSize: 20, color: "primary.main" }} />
    );
  };

  const sortedAdminPaymentList = [...adminPaymentList].sort((a, b) => {
    let aVal: string | number = a[adminSortField] ?? "";
    let bVal: string | number = b[adminSortField] ?? "";
    if (adminSortField === "amount") {
      aVal = Number(a.amount) || 0;
      bVal = Number(b.amount) || 0;
    } else if (adminSortField === "paid_at" || adminSortField === "created_at") {
      aVal = new Date((a[adminSortField] as string) || 0).getTime();
      bVal = new Date((b[adminSortField] as string) || 0).getTime();
    }
    if (typeof aVal === "string" && typeof bVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    if (aVal < bVal) return adminSortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return adminSortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      switch (notifSortField) {
        case "full_name":
          aVal = (a.full_name ?? "").toLowerCase();
          bVal = (b.full_name ?? "").toLowerCase();
          break;
        case "connection_id":
          aVal = (a.connection_id ?? "").toLowerCase();
          bVal = (b.connection_id ?? "").toLowerCase();
          break;
        case "amount":
          aVal = Number(a.details?.amount) || 0;
          bVal = Number(b.details?.amount) || 0;
          break;
        case "message":
          aVal = (a.details?.message ?? "").toLowerCase();
          bVal = (b.details?.message ?? "").toLowerCase();
          break;
        case "created_at":
        default:
          aVal = new Date(a.created_at || 0).getTime();
          bVal = new Date(b.created_at || 0).getTime();
          break;
      }
      if (aVal < bVal) return notifSortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return notifSortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [notifications, notifSortField, notifSortOrder]);

  const paginatedNotifications = useMemo(() => {
    const start = notifPage * notifRowsPerPage;
    return sortedNotifications.slice(start, start + notifRowsPerPage);
  }, [sortedNotifications, notifPage, notifRowsPerPage]);

  const handleNotifSort = (field: NotificationSortField) => {
    if (notifSortField === field) {
      setNotifSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setNotifSortField(field);
      setNotifSortOrder("desc");
      setNotifPage(0);
    }
  };

  const NotifSortIcon = ({ field }: { field: NotificationSortField }) => {
    if (notifSortField !== field) return <SwapVert sx={{ ml: 0.5, fontSize: 20, color: "grey.400" }} />;
    return notifSortOrder === "asc" ? (
      <ArrowUpward sx={{ ml: 0.5, fontSize: 20, color: "primary.main" }} />
    ) : (
      <ArrowDownward sx={{ ml: 0.5, fontSize: 20, color: "primary.main" }} />
    );
  };

  const handleNotifPageChange = (_: unknown, newPage: number) => {
    setNotifPage(newPage);
  };

  const handleNotifRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNotifRowsPerPage(parseInt(e.target.value, 10));
    setNotifPage(0);
  };

  if (loading && payments.length === 0) {
    return (
      <Box sx={{ maxWidth: 1280, mx: "auto", width: "100%" }}>
        <Skeleton variant="text" width={160} height={40} sx={{ mb: 2 }} />
        <Card variant="outlined">
          <CardHeader
            title={<Skeleton variant="text" width={140} height={28} />}
            subheader={<Skeleton variant="text" width={320} height={20} sx={{ mt: 0.5 }} />}
          />
          <CardContent sx={{ pt: 0 }}>
            <TableContainer component={Paper} variant="outlined">
              <Table
                size="small"
                sx={{
                  borderCollapse: "collapse",
                  "& td, & th": {
                    borderBottom: "1px solid",
                    borderRight: "1px solid",
                    borderColor: "divider",
                  },
                  "& tr:last-of-type td": {
                    borderBottom: "none",
                  },
                  "& td:last-of-type, & th:last-of-type": {
                    borderRight: "none",
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>Transaction ID</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Month</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Payment Method</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton variant="text" width={120} height={24} /></TableCell>
                      <TableCell><Skeleton variant="text" width={80} height={24} /></TableCell>
                      <TableCell><Skeleton variant="text" width={70} height={24} /></TableCell>
                      <TableCell><Skeleton variant="text" width={56} height={24} /></TableCell>
                      <TableCell><Skeleton variant="text" width={90} height={24} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: "divider" }}>
                <Skeleton variant="rounded" width="100%" height={40} />
              </Box>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (isStaffRole(role)) {
    return (
      <Box sx={{ maxWidth: 1280, mx: "auto", width: "100%" }}>
        <Typography
          variant="h5"
          fontWeight={600}
          sx={{
            mb: 2,
            color: "text.primary",
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            px: 0.5,
            borderRadius: 1,
            bgcolor: "action.hover",
          }}
        >
          Payment History
        </Typography>
        <Card variant="outlined">
          <CardHeader
            title="All payments"
            subheader="User name links to user page — paginated (10–50 per page)"
          />
          <CardContent sx={{ pt: 0 }}>
            <TableContainer component={Paper} variant="outlined">
              <Table
                size="small"
                sx={{
                  borderCollapse: "collapse",
                  "& td, & th": {
                    borderBottom: "1px solid",
                    borderRight: "1px solid",
                    borderColor: "divider",
                  },
                  "& tr:last-of-type td": {
                    borderBottom: "none",
                  },
                  "& td:last-of-type, & th:last-of-type": {
                    borderRight: "none",
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell onClick={() => handleAdminSort("full_name")} sx={{ cursor: "pointer" }}>User name <AdminSortIcon field="full_name" /></TableCell>
                    <TableCell align="right" onClick={() => handleAdminSort("amount")} sx={{ cursor: "pointer" }}>Amount <AdminSortIcon field="amount" /></TableCell>
                    <TableCell onClick={() => handleAdminSort("payment_method")} sx={{ cursor: "pointer" }}>Payment method <AdminSortIcon field="payment_method" /></TableCell>
                    <TableCell onClick={() => handleAdminSort("transaction_id")} sx={{ cursor: "pointer" }}>Transaction ID <AdminSortIcon field="transaction_id" /></TableCell>
                    <TableCell onClick={() => handleAdminSort("upi_id")} sx={{ cursor: "pointer" }}>UPI ID <AdminSortIcon field="upi_id" /></TableCell>
                    <TableCell onClick={() => handleAdminSort("paid_at")} sx={{ cursor: "pointer" }}>Paid at <AdminSortIcon field="paid_at" /></TableCell>
                    <TableCell onClick={() => handleAdminSort("created_at")} sx={{ cursor: "pointer" }}>Created at <AdminSortIcon field="created_at" /></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adminLoading ? (
                    <>
                      {Array.from({ length: adminRowsPerPage }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton variant="text" width="80%" height={24} /></TableCell>
                          <TableCell align="right"><Skeleton variant="text" width={56} height={24} sx={{ ml: "auto" }} /></TableCell>
                          <TableCell><Skeleton variant="text" width={80} height={24} /></TableCell>
                          <TableCell><Skeleton variant="text" width={140} height={24} /></TableCell>
                          <TableCell><Skeleton variant="text" width={100} height={24} /></TableCell>
                          <TableCell><Skeleton variant="text" width={80} height={24} /></TableCell>
                          <TableCell><Skeleton variant="text" width={100} height={24} /></TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : sortedAdminPaymentList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No payments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedAdminPaymentList.map((p) => (
                      <TableRow key={p.uuid}>
                        <TableCell>
                          <Link
                            to={`/${p.user_uuid}`}
                            style={{ fontWeight: 600, color: "inherit", textDecoration: "none" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {p.full_name ?? "—"}
                          </Link>
                        </TableCell>
                        <TableCell align="right">₹{p.amount ?? "—"}</TableCell>
                        <TableCell>{p.payment_method ?? "—"}</TableCell>
                        <TableCell>{p.transaction_id ?? "—"}</TableCell>
                        <TableCell>{p.upi_id ?? "—"}</TableCell>
                        <TableCell>{formatShortDate(p.paid_at)}</TableCell>
                        <TableCell>{formatDateTime(p.created_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={adminTotal}
                page={adminPage}
                onPageChange={handleAdminPageChange}
                rowsPerPage={adminRowsPerPage}
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                onRowsPerPageChange={handleAdminRowsPerPageChange}
              />
            </TableContainer>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardHeader
            title={
              <Badge color="error" badgeContent={notifications.filter((n) => !n.is_read).length}>
                <span>Payment Notifications</span>
              </Badge>
            }
            subheader='User requests from "I have completed the payment"'
          />
          <CardContent sx={{ pt: 0 }}>
            <TableContainer component={Paper} variant="outlined">
              <Table
                size="small"
                sx={{
                  borderCollapse: "collapse",
                  "& td, & th": {
                    borderBottom: "1px solid",
                    borderRight: "1px solid",
                    borderColor: "divider",
                  },
                  "& tr:last-of-type td": {
                    borderBottom: "none",
                  },
                  "& td:last-of-type, & th:last-of-type": {
                    borderRight: "none",
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>Batch</TableCell>
                    <TableCell onClick={() => handleNotifSort("full_name")} sx={{ cursor: "pointer" }}>
                      User <NotifSortIcon field="full_name" />
                    </TableCell>
                    <TableCell onClick={() => handleNotifSort("connection_id")} sx={{ cursor: "pointer" }}>
                      Connection <NotifSortIcon field="connection_id" />
                    </TableCell>
                    <TableCell align="right" onClick={() => handleNotifSort("amount")} sx={{ cursor: "pointer" }}>
                      Amount <NotifSortIcon field="amount" />
                    </TableCell>
                    <TableCell onClick={() => handleNotifSort("message")} sx={{ cursor: "pointer" }}>
                      Message <NotifSortIcon field="message" />
                    </TableCell>
                    <TableCell onClick={() => handleNotifSort("created_at")} sx={{ cursor: "pointer" }}>
                      Received <NotifSortIcon field="created_at" />
                    </TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {notificationLoading ? (
                    <>
                      {Array.from({ length: notifRowsPerPage }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton variant="text" width={56} height={24} /></TableCell>
                          <TableCell><Skeleton variant="text" width="70%" height={24} /></TableCell>
                          <TableCell><Skeleton variant="text" width={64} height={24} /></TableCell>
                          <TableCell align="right"><Skeleton variant="text" width={48} height={24} sx={{ ml: "auto" }} /></TableCell>
                          <TableCell><Skeleton variant="text" width="80%" height={24} /></TableCell>
                          <TableCell><Skeleton variant="text" width={100} height={24} /></TableCell>
                          <TableCell><Skeleton variant="rounded" width={88} height={32} /></TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : notifications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No notifications
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedNotifications.map((n, index) => (
                      <TableRow key={n.uuid} hover>
                        <TableCell>{`Batch ${notifPage * notifRowsPerPage + index + 1}`}</TableCell>
                        <TableCell>
                          <Link
                            to={`/${n.user_id}`}
                            style={{ fontWeight: 600, color: "inherit", textDecoration: "none" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {n.full_name ?? "—"}
                          </Link>
                        </TableCell>
                        <TableCell>{n.connection_id || "—"}</TableCell>
                        <TableCell align="right">₹{n.details?.amount ?? 0}</TableCell>
                        <TableCell>{n.details?.message || "—"}</TableCell>
                        <TableCell>{formatDateTime(n.created_at)}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleApproveNotification(n.uuid)}
                            disabled={
                              approvingUuid === n.uuid ||
                              paidNotificationUuids[n.uuid] === true ||
                              n.is_paid === true
                            }
                          >
                            {approvingUuid === n.uuid
                              ? "Approving..."
                              : paidNotificationUuids[n.uuid] === true
                                ? "Paid"
                                : n.is_paid === true
                                  ? "Paid"
                                  : "Mark Paid"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={sortedNotifications.length}
                page={notifPage}
                onPageChange={handleNotifPageChange}
                rowsPerPage={notifRowsPerPage}
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                onRowsPerPageChange={handleNotifRowsPerPageChange}
              />
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto", width: "100%" }}>
      <Typography
        variant="h5"
        fontWeight={600}
        sx={{
          mb: 2,
          color: "text.primary",
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          px: 0.5,
          borderRadius: 1,
          bgcolor: "action.hover",
        }}
      >
        My payments
      </Typography>
      <Box sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="body2" sx={{ color: "text.primary" }}>
          Total Paid: <strong>₹{userTotalPaidAmount.toFixed(2)}</strong>
        </Typography>
      </Box>
      <Card sx={{ mt: 2 }} variant="outlined">
        <CardHeader
          title="Payment History"
          subheader="Latest records per page (10–50) — click a row to open profile"
        />
        <CardContent sx={{ pt: 0 }}>
          <TableContainer component={Paper} variant="outlined">
            <Table
              size="small"
              sx={{
                borderCollapse: "collapse",
                "& td, & th": {
                  borderBottom: "1px solid",
                  borderRight: "1px solid",
                  borderColor: "divider",
                },
                "& tr:last-of-type td": {
                  borderBottom: "none",
                },
                "& td:last-of-type, & th:last-of-type": {
                  borderRight: "none",
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>Transaction ID</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Month</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Payment Method</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <>
                    {Array.from({ length: rowsPerPage }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton variant="text" width={120} height={24} /></TableCell>
                        <TableCell><Skeleton variant="text" width={80} height={24} /></TableCell>
                        <TableCell><Skeleton variant="text" width={70} height={24} /></TableCell>
                        <TableCell><Skeleton variant="text" width={56} height={24} /></TableCell>
                        <TableCell><Skeleton variant="text" width={90} height={24} /></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                      No payment records found
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => (
                    <TableRow
                      key={p.uuid}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => handleRowClick(p)}
                    >
                      <TableCell>{p.transaction_id || p.uuid || "—"}</TableCell>
                      <TableCell>{formatShortDate(p.paid_at)}</TableCell>
                      <TableCell>{p.month != null && p.year != null ? `${p.month} ${p.year}` : "—"}</TableCell>
                      <TableCell>₹{p.amount ?? 0}</TableCell>
                      <TableCell>{p.payment_method || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={handlePageChange}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
              onRowsPerPageChange={handleRowsPerPageChange}
            />
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PaymentsPage;
