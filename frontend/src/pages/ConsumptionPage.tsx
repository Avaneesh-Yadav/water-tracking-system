import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  Skeleton,
  TablePagination,
} from "@mui/material";
import Description from "@mui/icons-material/Description";
import MeterPhotoThumb from "@/components/MeterPhotoThumb";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import SwapVert from "@mui/icons-material/SwapVert";
import {
  getConsumptionHistory,
  getAllConsumptionAdmin,
  generatePaymentQR,
  notifyPaymentCompleted,
} from "@/services/apiService";
import type { ConsumptionRecord, QRData } from "@/services/apiService";
import { toast } from "@/hooks/use-toast";
import PaymentDialog from "@/components/PaymentDialog";
import { isStaffRole } from "@/utils/roles";
import Print from "@mui/icons-material/Print";

type AdminConsumptionSortField = "full_name" | "month" | "consumption_liters" | "created_at" | "updated_at";

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const ConsumptionPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"USER" | "ADMIN" | "SUPER_ADMIN">("USER");
  const [adminConsumptionList, setAdminConsumptionList] = useState<ConsumptionRecord[]>([]);
  const [consumption, setConsumption] = useState<ConsumptionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [adminPage, setAdminPage] = useState(0);
  const [adminRowsPerPage, setAdminRowsPerPage] = useState(10);
  const [adminTotal, setAdminTotal] = useState(0);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSortField, setAdminSortField] = useState<AdminConsumptionSortField>("created_at");
  const [adminSortOrder, setAdminSortOrder] = useState<"asc" | "desc">("desc");
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [selectedBill, setSelectedBill] = useState<ConsumptionRecord | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  const userTotals = useMemo(() => {
    if (!consumption || consumption.length === 0) return { totalLiters: 0, totalAmount: 0 };
    const totalLiters = consumption.reduce((sum, r) => sum + (Number(r.consumption_liters) || 0), 0);
    const totalAmount = consumption.reduce((sum, r) => sum + (Number((r as any).amount) || 0), 0);
    return { totalLiters, totalAmount };
  }, [consumption]);

  const fetchAdminConsumption = useCallback(async (pageNum: number, limit: number) => {
    setAdminLoading(true);
    try {
      const res = await getAllConsumptionAdmin({ page: pageNum + 1, limit });
      if (Array.isArray(res)) {
        setAdminConsumptionList(res);
        setAdminTotal(res.length);
      } else {
        setAdminConsumptionList(res?.records ?? []);
        setAdminTotal(res?.total ?? 0);
      }
    } catch {
      setAdminConsumptionList([]);
      setAdminTotal(0);
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const fetchUserConsumption = useCallback(async (pageNum: number, limit: number) => {
    const res = await getConsumptionHistory({ page: pageNum + 1, limit });
    if (Array.isArray(res)) {
      setConsumption(res);
      setTotal(res.length);
    } else {
      setConsumption(res.history || []);
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
          await fetchAdminConsumption(0, adminRowsPerPage);
        } else {
          await fetchUserConsumption(0, rowsPerPage);
        }
      } catch {
        setConsumption([]);
        setAdminConsumptionList([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [fetchUserConsumption, rowsPerPage, fetchAdminConsumption]);

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
    setLoading(true);
    fetchUserConsumption(newPage, rowsPerPage).finally(() => setLoading(false));
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
    setLoading(true);
    fetchUserConsumption(0, parseInt(e.target.value, 10)).finally(() => setLoading(false));
  };

  const handleStatusClick = async (uuid: string) => {
    const bill = consumption.find((c) => c.uuid === uuid);
    if (!bill || bill.status === "PAID") return;
    try {
      const qr = await generatePaymentQR(uuid);
      setSelectedBill(bill);
      setQrData(qr);
      toast({
        title: "Payment Initiated",
        description: `Generating QR code for ₹${bill.amount} - ${bill.month} ${bill.year}`,
      });
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? error?.message ?? "Failed to generate QR code";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleConfirmPaid = async (message: string) => {
    if (!qrData || !selectedBill) return;
    setProcessingPayment(true);
    try {
      await notifyPaymentCompleted({
        consumption_uuid: selectedBill.uuid,
        amount: qrData.amount,
        payment_method: "UPI",
        upi_id: qrData.upi_id,
        message,
      });
      toast({
        title: "Payment Submitted",
        description: "Payment request sent to admin for verification.",
      });
      setQrData(null);
      setSelectedBill(null);
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? error?.message ?? "Failed to submit payment";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading && consumption.length === 0) {
    return (
      <Box sx={{ maxWidth: 1280, mx: "auto", width: "100%" }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
        <Card variant="outlined">
          <CardHeader
            title={<Skeleton variant="text" width={180} height={28} />}
            subheader={<Skeleton variant="text" width={280} height={20} sx={{ mt: 0.5 }} />}
          />
          <CardContent sx={{ pt: 0 }}>
            <TableContainer component={Paper} variant="outlined">
              <Table
                size="small"
                sx={{
                  "& td, & th": {
                    borderColor: "divider",
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>Month</TableCell>
                    <TableCell>Meter Reading</TableCell>
                    <TableCell>Consumption (L)</TableCell>
                    <TableCell>Amount (₹)</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Photo</TableCell>
                    <TableCell>Bill</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton variant="text" width={60} height={24} /></TableCell>
                      <TableCell><Skeleton variant="text" width={50} height={24} /></TableCell>
                      <TableCell><Skeleton variant="text" width={50} height={24} /></TableCell>
                      <TableCell><Skeleton variant="text" width={48} height={24} /></TableCell>
                      <TableCell><Skeleton variant="rounded" width={56} height={24} /></TableCell>
                      <TableCell align="center"><Skeleton variant="rounded" width={36} height={36} sx={{ mx: "auto" }} /></TableCell>
                      <TableCell><Skeleton variant="text" width={40} height={24} /></TableCell>
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

  const handleAdminPageChange = (_: unknown, newPage: number) => {
    setAdminPage(newPage);
    setAdminLoading(true);
    fetchAdminConsumption(newPage, adminRowsPerPage).finally(() => setAdminLoading(false));
  };

  const handleAdminRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(e.target.value, 10);
    setAdminRowsPerPage(newLimit);
    setAdminPage(0);
    setAdminLoading(true);
    fetchAdminConsumption(0, newLimit).finally(() => setAdminLoading(false));
  };

  const handleAdminSort = (field: AdminConsumptionSortField) => {
    if (adminSortField === field) {
      setAdminSortOrder(adminSortOrder === "asc" ? "desc" : "asc");
    } else {
      setAdminSortField(field);
      setAdminSortOrder("desc");
    }
  };

  const AdminSortIcon = ({ field }: { field: AdminConsumptionSortField }) => {
    if (adminSortField !== field) return <SwapVert sx={{ ml: 0.5, fontSize: 20, color: "grey.400" }} />;
    return adminSortOrder === "asc" ? (
      <ArrowUpward sx={{ ml: 0.5, fontSize: 20, color: "primary.main" }} />
    ) : (
      <ArrowDownward sx={{ ml: 0.5, fontSize: 20, color: "primary.main" }} />
    );
  };

  const sortedAdminConsumptionList = [...adminConsumptionList].sort((a, b) => {
    let aVal: string | number = adminSortField === "full_name" ? (a.full_name ?? "") : adminSortField === "month" ? `${a.month} ${a.year}` : adminSortField === "consumption_liters" ? Number(a.consumption_liters) : adminSortField === "created_at" ? new Date(a.created_at || 0).getTime() : new Date(a.updated_at || 0).getTime();
    let bVal: string | number = adminSortField === "full_name" ? (b.full_name ?? "") : adminSortField === "month" ? `${b.month} ${b.year}` : adminSortField === "consumption_liters" ? Number(b.consumption_liters) : adminSortField === "created_at" ? new Date(b.created_at || 0).getTime() : new Date(b.updated_at || 0).getTime();
    if (typeof aVal === "string" && typeof bVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    if (aVal < bVal) return adminSortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return adminSortOrder === "asc" ? 1 : -1;
    return 0;
  });

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
          Consumption History
        </Typography>
        <Card variant="outlined">
          <CardHeader
            title="All consumption records"
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
                    <TableCell onClick={() => handleAdminSort("month")} sx={{ cursor: "pointer" }}>Month <AdminSortIcon field="month" /></TableCell>
                    <TableCell align="right">Prev</TableCell>
                    <TableCell align="right">Curr</TableCell>
                    <TableCell align="right" onClick={() => handleAdminSort("consumption_liters")} sx={{ cursor: "pointer" }}>Consumption (L) <AdminSortIcon field="consumption_liters" /></TableCell>
                    <TableCell onClick={() => handleAdminSort("created_at")} sx={{ cursor: "pointer" }}>Created at <AdminSortIcon field="created_at" /></TableCell>
                    <TableCell onClick={() => handleAdminSort("updated_at")} sx={{ cursor: "pointer" }}>Updated at <AdminSortIcon field="updated_at" /></TableCell>
                    <TableCell align="center">Photo</TableCell>
                    <TableCell>Bill</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adminLoading ? (
                    <>
                      {Array.from({ length: adminRowsPerPage }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton variant="text" width="80%" height={24} /></TableCell>
                          <TableCell><Skeleton variant="text" width={70} height={24} /></TableCell>
                          <TableCell align="right"><Skeleton variant="text" width={40} height={24} sx={{ ml: "auto" }} /></TableCell>
                          <TableCell align="right"><Skeleton variant="text" width={40} height={24} sx={{ ml: "auto" }} /></TableCell>
                          <TableCell align="right"><Skeleton variant="text" width={48} height={24} sx={{ ml: "auto" }} /></TableCell>
                          <TableCell><Skeleton variant="text" width={100} height={24} /></TableCell>
                          <TableCell><Skeleton variant="text" width={100} height={24} /></TableCell>
                          <TableCell align="center"><Skeleton variant="rounded" width={36} height={36} sx={{ mx: "auto" }} /></TableCell>
                          <TableCell><Skeleton variant="text" width={48} height={24} /></TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : sortedAdminConsumptionList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        No consumption records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedAdminConsumptionList.map((r) => (
                      <TableRow key={r.uuid}>
                        <TableCell>
                          <Link
                            to={`/${r.user_uuid}`}
                            style={{ fontWeight: 600, color: "inherit", textDecoration: "none" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {r.full_name ?? "—"}
                          </Link>
                        </TableCell>
                        <TableCell>{`${r.month} ${r.year}`}</TableCell>
                        <TableCell align="right">{r.previous_meter_reading != null ? Number(r.previous_meter_reading) : "—"}</TableCell>
                        <TableCell align="right">{r.current_meter_reading != null ? Number(r.current_meter_reading) : "—"}</TableCell>
                        <TableCell align="right">{r.consumption_liters != null ? Number(r.consumption_liters) : "—"}</TableCell>
                        <TableCell>{formatDate(r.created_at)}</TableCell>
                        <TableCell>{formatDate(r.updated_at)}</TableCell>
                        <TableCell align="center">
                          <MeterPhotoThumb path={r.meter_photo_path} size={36} />
                        </TableCell>
                        <TableCell>
                          <Link to={`/bill/${r.uuid}`} target="_blank" rel="noopener noreferrer" title="Print Bill" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                           <Print sx={{ fontSize: 18 }} color="primary" />
                          </Link>
                        </TableCell>
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
        My consumption
      </Typography>
      <Box sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="body2" sx={{ color: "text.primary" }}>
          Total Consumption: <strong>{userTotals.totalLiters.toFixed(2)} L</strong>
        </Typography>
        <Typography variant="body2" sx={{ color: "text.primary" }}>
          Total Amount: <strong>₹{userTotals.totalAmount.toFixed(2)}</strong>
        </Typography>
      </Box>
      <Card sx={{ mt: 2 }} variant="outlined">
        <CardHeader
          title="Water Consumption History"
          subheader="Latest records per page (10–50)"
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
                  <TableCell>Month</TableCell>
                  <TableCell>Meter Reading</TableCell>
                  <TableCell>Consumption (L)</TableCell>
                  <TableCell>Amount (₹)</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Photo</TableCell>
                  <TableCell>Bill</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <>
                    {Array.from({ length: rowsPerPage }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton variant="text" width={60} height={24} /></TableCell>
                        <TableCell><Skeleton variant="text" width={50} height={24} /></TableCell>
                        <TableCell><Skeleton variant="text" width={50} height={24} /></TableCell>
                        <TableCell><Skeleton variant="text" width={48} height={24} /></TableCell>
                        <TableCell><Skeleton variant="rounded" width={56} height={24} /></TableCell>
                        <TableCell align="center"><Skeleton variant="rounded" width={36} height={36} sx={{ mx: "auto" }} /></TableCell>
                        <TableCell><Skeleton variant="text" width={40} height={24} /></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : consumption.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                      No consumption records
                    </TableCell>
                  </TableRow>
                ) : (
                  consumption.map((r) => (
                    <TableRow key={r.uuid}>
                      <TableCell>{`${r.month} ${r.year}`}</TableCell>
                      <TableCell>
                        {r.current_meter_reading != null
                          ? Number(r.current_meter_reading)
                          : Number(r.consumption_liters) || 0}
                      </TableCell>
                      <TableCell>{Number(r.consumption_liters) || 0}</TableCell>
                      <TableCell>₹{Number(r.amount) || 0}</TableCell>
                      <TableCell
                        onClick={() => r.status === "UNPAID" && handleStatusClick(r.uuid)}
                        sx={{
                          cursor: r.status === "UNPAID" ? "pointer" : "default",
                          color: r.status === "UNPAID" ? "primary.main" : "text.primary",
                          textDecoration: r.status === "UNPAID" ? "underline" : "none",
                          fontWeight: r.status === "UNPAID" ? 600 : 400,
                        }}
                      >
                        {r.status === "PAID" ? "Paid" : "Unpaid"}
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <MeterPhotoThumb path={r.meter_photo_path} size={36} />
                      </TableCell>
                      <TableCell>
                        <Link to={`/bill/${r.uuid}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }} onClick={(e) => e.stopPropagation()}>
                          <Description sx={{ fontSize: 18 }} /> Print
                        </Link>
                      </TableCell>
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

      <PaymentDialog
        open={!!qrData && !!selectedBill}
        qrData={qrData}
        contextLabel={selectedBill ? `Payment for ${selectedBill.month} ${selectedBill.year}` : ""}
        processing={processingPayment}
        onConfirm={handleConfirmPaid}
        onClose={() => {
          setQrData(null);
          setSelectedBill(null);
        }}
      />
    </Box>
  );
};

export default ConsumptionPage;
