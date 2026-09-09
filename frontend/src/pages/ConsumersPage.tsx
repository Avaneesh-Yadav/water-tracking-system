import React, { useEffect, useState, useCallback } from "react";
import {
  TextField,
  InputAdornment,
  Card,
  CardContent,
  CardHeader,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TablePagination,
  Skeleton,
  Badge,
} from "@mui/material";
import Search from "@mui/icons-material/Search";
import List from "@mui/icons-material/List";
import Delete from "@mui/icons-material/Delete";
import Edit from "@mui/icons-material/Edit";
import Visibility from "@mui/icons-material/Visibility";
import Notifications from "@mui/icons-material/Notifications";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import SwapVert from "@mui/icons-material/SwapVert";
import { getAllUsers, deleteUserByUuid, getAdminUnreadPaymentNotificationCountByUser, markAdminPaymentNotificationsReadByUser } from "@/services/apiService";
import { toast } from "@/hooks/use-toast";
import { useNavigate, Link, useLocation } from "react-router-dom";
import CreateUserDialog from "@/components/CreateUserDialog";
import BulkImportDialog from "@/components/BulkImportDialog";
import { canDeleteTarget, isStaffRole, isSuperAdmin, roleChipColor, roleLabel } from "@/utils/roles";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

type SortField = "full_name" | "mobile_number" | "connection_id" | "role" | "created_at" | "updated_at" | "payment_status";
type SortOrder = "asc" | "desc";

const ConsumersPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEmployees = location.pathname.startsWith("/employees");
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("updated_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [rowMenuAnchor, setRowMenuAnchor] = useState<null | { el: HTMLElement; user: any }>(null);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserUuid = currentUser?.uuid;
  const currentRole = (currentUser?.role || "").toUpperCase();
  const [unreadPaymentNotificationsByUser, setUnreadPaymentNotificationsByUser] = useState<Record<string, number>>({});

  const fetchUsers = useCallback(async (pageNum: number, limit: number, q: string) => {
    setLoading(true);
    try {
      const response = await getAllUsers({
        page: pageNum + 1,
        limit,
        q: q.trim() || undefined,
        role: isEmployees ? "STAFF" : "USER",
        status: isEmployees ? undefined : "ACTIVE",
      });
      if (Array.isArray(response)) {
        setUsers(response);
        setTotal(response.length);
      } else {
        setUsers(response.users ?? []);
        setTotal(response.total ?? 0);
      }
    } catch {
      toast({
        title: "Failed to load users",
        description: "Could not fetch users from server.",
        variant: "destructive",
      });
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [isEmployees]);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, isEmployees]);

  useEffect(() => {
    if (isEmployees && (sortField === "connection_id" || sortField === "payment_status")) {
      setSortField("updated_at");
    }
  }, [isEmployees, sortField]);

  useEffect(() => {
    fetchUsers(page, rowsPerPage, searchTerm);
  }, [page, rowsPerPage, searchTerm, fetchUsers]);

  useEffect(() => {
    let cancelled = false;
    const loadCounts = async () => {
      if (!isStaffRole(currentRole) || isEmployees) return;
      const uuids = users.map((u) => u.uuid).filter(Boolean);
      if (uuids.length === 0) return;
      try {
        const entries = await Promise.all(
          uuids.map(async (u_uuid) => {
            const count = await getAdminUnreadPaymentNotificationCountByUser(u_uuid);
            return [u_uuid, count] as const;
          })
        );
        if (cancelled) return;
        setUnreadPaymentNotificationsByUser(Object.fromEntries(entries));
      } catch {
        if (cancelled) return;
        setUnreadPaymentNotificationsByUser({});
      }
    };
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [users, currentRole, isEmployees]);

  const tableColCount = isEmployees ? 6 : 9;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <SwapVert sx={{ ml: 0.5, fontSize: 20, color: "grey.400" }} />;
    return sortOrder === "asc" ? (
      <ArrowUpward sx={{ ml: 0.5, fontSize: 20, color: "primary.main" }} />
    ) : (
      <ArrowDownward sx={{ ml: 0.5, fontSize: 20, color: "primary.main" }} />
    );
  };
  const filteredUsers = [...users].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];
    if (sortField === "created_at" || sortField === "updated_at") {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    if (typeof aVal === "string" && typeof bVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const handlePageChange = (_: unknown, newPage: number) => setPage(newPage);
  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (uuid: string) => navigate(`/${uuid}`);
  const handleEdit = (uuid: string) => navigate(`/${uuid}/edit`);
  const handleDelete = async (uuid: string) => {
    try {
      await deleteUserByUuid(uuid);
      toast({ title: "Deleted", description: "User removed successfully." });
      fetchUsers(page, rowsPerPage, searchTerm);
    } catch {
      toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" });
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 2, color: "text.primary" }}>
        {isEmployees ? "Employee(s)" : "Consumers"}
      </Typography>

      <Card sx={{ borderRadius: 2 }}>
        <CardHeader
          title={loading ? <Skeleton variant="text" width={160} height={32} /> : isEmployees ? "Staff accounts" : "Consumer accounts"}
          subheader={
            loading ? (
              <Skeleton variant="text" width={220} height={20} sx={{ mt: 0.5 }} />
            ) : isEmployees ? (
              "Admin, Super Admin, and meter-reader logins. Search, sort, and open a profile."
            ) : (
              "Active consumer accounts only (role USER, status ACTIVE). Revoked or inactive accounts are hidden here."
            )
          }
          action={
            loading ? (
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Skeleton variant="rounded" width={320} height={40} />
                <Skeleton variant="rounded" width={100} height={40} />
                <Skeleton variant="rounded" width={120} height={40} />
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1, alignItems: "center" }}>
                <TextField
                  size="small"
                  placeholder={isEmployees ? "Search by name or mobile" : "Search by name, mobile, or ID"}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
                    ),
                    sx: { width: { xs: "100%", sm: 320 } },
                  }}
                />
                {!isEmployees && <BulkImportDialog onImportComplete={() => fetchUsers(page, rowsPerPage, searchTerm)} />}
                <CreateUserDialog onUserCreated={() => fetchUsers(page, rowsPerPage, searchTerm)} />
              </Box>
            )
          }
        />
        <CardContent sx={{ pt: 0 }}>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
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
                  <TableCell onClick={() => handleSort("full_name")} sx={{ cursor: "pointer" }}>Name <SortIcon field="full_name" /></TableCell>
                  <TableCell onClick={() => handleSort("mobile_number")} sx={{ cursor: "pointer" }}>Mobile <SortIcon field="mobile_number" /></TableCell>
                  {isEmployees && (
                    <TableCell onClick={() => handleSort("role")} sx={{ cursor: "pointer" }}>Role <SortIcon field="role" /></TableCell>
                  )}
                  {!isEmployees && (
                    <>
                      <TableCell onClick={() => handleSort("connection_id")} sx={{ cursor: "pointer" }}>Connection ID <SortIcon field="connection_id" /></TableCell>
                      <TableCell onClick={() => handleSort("role")} sx={{ cursor: "pointer" }}>Role <SortIcon field="role" /></TableCell>
                      <TableCell>Due</TableCell>
                      <TableCell onClick={() => handleSort("payment_status")} sx={{ cursor: "pointer" }}>Status <SortIcon field="payment_status" /></TableCell>
                    </>
                  )}
                  <TableCell onClick={() => handleSort("created_at")} sx={{ cursor: "pointer" }}>Created <SortIcon field="created_at" /></TableCell>
                  <TableCell onClick={() => handleSort("updated_at")} sx={{ cursor: "pointer" }}>Updated <SortIcon field="updated_at" /></TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <>
                    {Array.from({ length: rowsPerPage }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton variant="text" width="80%" height={24} /></TableCell>
                        <TableCell><Skeleton variant="text" width={100} height={24} /></TableCell>
                        {isEmployees && <TableCell><Skeleton variant="rounded" width={90} height={24} /></TableCell>}
                        {!isEmployees && (
                          <>
                            <TableCell><Skeleton variant="text" width={90} height={24} /></TableCell>
                            <TableCell><Skeleton variant="rounded" width={56} height={24} /></TableCell>
                            <TableCell><Skeleton variant="text" width={48} height={24} /></TableCell>
                            <TableCell><Skeleton variant="rounded" width={70} height={24} /></TableCell>
                          </>
                        )}
                        <TableCell><Skeleton variant="text" width={80} height={24} /></TableCell>
                        <TableCell><Skeleton variant="text" width={80} height={24} /></TableCell>
                        <TableCell align="right"><Skeleton variant="circular" width={32} height={32} sx={{ ml: "auto" }} /></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={tableColCount} align="center" sx={{ py: 4, color: "text.secondary" }}>No users found.</TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.uuid} hover sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                      <TableCell>
                        {isStaffRole(currentRole) ? (
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                            <Link
                              to={`/${user.uuid}`}
                              style={{ color: "inherit", fontWeight: 600, textDecoration: "none" }}
                            >
                              {user.full_name}
                            </Link>
                            {(unreadPaymentNotificationsByUser[user.uuid] ?? 0) > 0 && (
                              <Box
                                sx={{ ml: 2, display: "inline-flex", alignItems: "center", cursor: "pointer" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                (async () => {
                                  try {
                                    await markAdminPaymentNotificationsReadByUser(user.uuid);
                                    setUnreadPaymentNotificationsByUser((prev) => ({
                                      ...prev,
                                      [user.uuid]: 0,
                                    }));
                                  } catch {
                                    // If marking fails, still open payments so admin can review.
                                  }
                                  navigate(`/payments?user_uuid=${encodeURIComponent(user.uuid)}`);
                                })();
                                }}
                                role="button"
                                aria-label="Open payment notifications for this user"
                              >
                                <Badge
                                  color="error"
                                  badgeContent={unreadPaymentNotificationsByUser[user.uuid] ?? 0}
                                  max={99}
                                  showZero={false}
                                >
                                  <Notifications fontSize="small" sx={{ cursor: "pointer" }} />
                                </Badge>
                              </Box>
                            )}
                          </Box>
                        ) : (
                          <Link to={`/${user.uuid}`} style={{ color: "inherit", fontWeight: 600, textDecoration: "none" }}>
                            {user.full_name}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell>{user.mobile_number}</TableCell>
                      {isEmployees && (
                        <TableCell>
                          <Chip size="small" label={roleLabel(user.role)} color={roleChipColor(user.role)} />
                        </TableCell>
                      )}
                      {!isEmployees && (
                        <>
                          <TableCell>{user.connection_id}</TableCell>
                          <TableCell>
                            <Chip size="small" label={roleLabel(user.role)} color={roleChipColor(user.role)} />
                          </TableCell>
                          <TableCell sx={{ color: "error.main", fontWeight: 500 }}>₹{user.dueAmount || 0}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={user.payment_status}
                              color={user.payment_status === "COMPLETED" ? "success" : user.payment_status === "PENDING" ? "warning" : "error"}
                            />
                          </TableCell>
                        </>
                      )}
                      <TableCell sx={{ fontSize: "0.875rem" }}>
                        {new Date(user.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.875rem" }}>
                        {new Date(user.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => setRowMenuAnchor({ el: e.currentTarget, user })}
                          sx={{ bgcolor: "primary.main", color: "white", "&:hover": { bgcolor: "primary.dark" } }}
                        >
                          <List />
                        </IconButton>
                        <Menu
                          anchorEl={rowMenuAnchor?.el}
                          open={!!rowMenuAnchor && rowMenuAnchor.user?.uuid === user.uuid}
                          onClose={() => setRowMenuAnchor(null)}
                        >
                          <MenuItem onClick={() => { handleViewDetails(user.uuid); setRowMenuAnchor(null); }}>
                            <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
                            <ListItemText>View</ListItemText>
                          </MenuItem>
                          <MenuItem
                            disabled={isSuperAdmin(user.role) && !isSuperAdmin(currentRole)}
                            onClick={() => { handleEdit(user.uuid); setRowMenuAnchor(null); }}
                          >
                            <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
                            <ListItemText>Edit</ListItemText>
                          </MenuItem>
                          <MenuItem
                            disabled={!canDeleteTarget(currentRole, currentUserUuid, user.role, user.uuid)}
                            onClick={() => {
                              if (canDeleteTarget(currentRole, currentUserUuid, user.role, user.uuid)) handleDelete(user.uuid);
                              setRowMenuAnchor(null);
                            }}
                            sx={{ color: "error.main" }}
                          >
                            <ListItemIcon><Delete fontSize="small" /></ListItemIcon>
                            <ListItemText>Delete</ListItemText>
                          </MenuItem>
                        </Menu>
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
    </Box>
  );
};

export default ConsumersPage;
