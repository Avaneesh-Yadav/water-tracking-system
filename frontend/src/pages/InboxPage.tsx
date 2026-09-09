import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import InboxOutlined from "@mui/icons-material/InboxOutlined";
import MarkEmailRead from "@mui/icons-material/MarkEmailRead";
import DoneAll from "@mui/icons-material/DoneAll";
import Refresh from "@mui/icons-material/Refresh";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import CampaignOutlined from "@mui/icons-material/CampaignOutlined";
import { getMyNotifications } from "@/services/apiService";
import { opsApi } from "@/services/opsService";
import type { NotificationRecord } from "@/services/apiService";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";

type Filter = "all" | "unread";

function isUnread(n: NotificationRecord): boolean {
  return !n.is_read;
}

function titleOf(n: NotificationRecord): string {
  const d: any = n.details;
  if (d && typeof d === "object") {
    return String(d.title || d.subject || relatedLabel(n.related_to));
  }
  try {
    const parsed = JSON.parse(n.notification_details);
    return String(parsed.title || parsed.subject || relatedLabel(n.related_to));
  } catch {
    return relatedLabel(n.related_to);
  }
}

function bodyOf(n: NotificationRecord): string {
  const d: any = n.details;
  if (d && typeof d === "object") {
    return String(d.body || d.message || d.title || JSON.stringify(d));
  }
  try {
    const parsed = JSON.parse(n.notification_details);
    return String(parsed.body || parsed.message || parsed.title || n.notification_details);
  } catch {
    return n.notification_details || "—";
  }
}

function relatedLabel(relatedTo?: string): string {
  const key = String(relatedTo || "").toUpperCase();
  if (key.includes("PAYMENT")) return "Payment";
  if (key.includes("BILL") || key.includes("CONSUMPTION")) return "Bill";
  if (key.includes("TICKET") || key.includes("SERVICE")) return "Service desk";
  if (key.includes("CONNECTION")) return "Connection";
  if (key.includes("SMS") || key.includes("ALERT")) return "Alert";
  return relatedTo ? relatedTo.replace(/_/g, " ") : "Notice";
}

function relatedIcon(relatedTo?: string) {
  const key = String(relatedTo || "").toUpperCase();
  if (key.includes("PAYMENT")) return <PaymentsOutlined fontSize="small" />;
  if (key.includes("BILL") || key.includes("CONSUMPTION")) return <ReceiptLongOutlined fontSize="small" />;
  if (key.includes("TICKET") || key.includes("SERVICE")) return <CampaignOutlined fontSize="small" />;
  return <CampaignOutlined fontSize="small" />;
}

function relatedColor(relatedTo?: string): "primary" | "secondary" | "warning" | "success" | "default" {
  const key = String(relatedTo || "").toUpperCase();
  if (key.includes("PAYMENT")) return "success";
  if (key.includes("BILL") || key.includes("CONSUMPTION")) return "primary";
  if (key.includes("TICKET") || key.includes("SERVICE")) return "warning";
  if (key.includes("ALERT")) return "warning";
  return "default";
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InboxPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyUuid, setBusyUuid] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getMyNotifications());
    } catch {
      setRows([]);
      toast({ title: "Inbox", description: "Could not load messages.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = useMemo(() => rows.filter(isUnread).length, [rows]);
  const visible = useMemo(
    () => (filter === "unread" ? rows.filter(isUnread) : rows),
    [rows, filter]
  );

  const markRead = async (uuid: string) => {
    setBusyUuid(uuid);
    try {
      await opsApi.markRead(uuid);
      setRows((prev) =>
        prev.map((n) => (n.uuid === uuid ? { ...n, is_read: 1 } : n))
      );
    } catch {
      toast({ title: "Inbox", description: "Could not mark as read.", variant: "destructive" });
    } finally {
      setBusyUuid(null);
    }
  };

  const markAll = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await opsApi.markAllRead();
      setRows((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      toast({ title: "Inbox", description: "All messages marked as read." });
    } catch {
      toast({ title: "Inbox", description: "Could not mark all as read.", variant: "destructive" });
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 880, mx: "auto", width: "100%" }}>
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
        <InboxOutlined fontSize="small" />
        {t("inbox")}
        {unreadCount > 0 && (
          <Chip size="small" color="error" label={`${unreadCount} unread`} sx={{ ml: 0.5, height: 22 }} />
        )}
      </Typography>

      <Card variant="outlined">
        <CardHeader
          title="Messages"
          subheader={
            loading
              ? "Loading…"
              : unreadCount > 0
                ? `${unreadCount} unread of ${rows.length}`
                : rows.length === 0
                  ? "No messages yet"
                  : `All ${rows.length} messages read`
          }
          action={
            <Stack direction="row" spacing={1} alignItems="center" sx={{ pr: 0.5 }}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={filter}
                onChange={(_, v: Filter | null) => {
                  if (v) setFilter(v);
                }}
                aria-label="Inbox filter"
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="unread">Unread</ToggleButton>
              </ToggleButtonGroup>
              <Tooltip title="Refresh">
                <span>
                  <IconButton onClick={load} disabled={loading} aria-label="Refresh inbox">
                    <Refresh />
                  </IconButton>
                </span>
              </Tooltip>
              <Button
                variant="outlined"
                size="small"
                startIcon={markingAll ? <CircularProgress size={14} /> : <DoneAll />}
                disabled={markingAll || unreadCount === 0}
                onClick={markAll}
              >
                Mark all read
              </Button>
            </Stack>
          }
          sx={{
            flexWrap: "wrap",
            gap: 1,
            "& .MuiCardHeader-action": { m: 0, alignSelf: "center" },
          }}
        />
        <Divider />
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          {loading ? (
            <Box>
              {Array.from({ length: 5 }).map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "12px 1fr auto",
                    gap: 1.5,
                    alignItems: "flex-start",
                    px: 2,
                    py: 1.75,
                    borderBottom: i === 4 ? "none" : "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Skeleton variant="circular" width={8} height={8} sx={{ mt: 1 }} />
                  <Box>
                    <Skeleton variant="text" width="40%" height={22} />
                    <Skeleton variant="text" width="85%" height={18} />
                  </Box>
                  <Skeleton variant="text" width={64} height={18} />
                </Box>
              ))}
            </Box>
          ) : visible.length === 0 ? (
            <Box sx={{ py: 8, px: 3, textAlign: "center" }}>
              <InboxOutlined sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
              <Typography fontWeight={600}>
                {filter === "unread" ? "You're all caught up" : "No messages yet"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {filter === "unread"
                  ? "There are no unread messages in your inbox."
                  : "Billing alerts, payment updates, and notices will show up here."}
              </Typography>
              {filter === "unread" && rows.length > 0 && (
                <Button sx={{ mt: 2 }} onClick={() => setFilter("all")}>
                  Show all messages
                </Button>
              )}
            </Box>
          ) : (
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
              {visible.map((n, index) => {
                const unread = isUnread(n);
                const busy = busyUuid === n.uuid;
                return (
                  <Box
                    component="li"
                    key={n.uuid}
                    onClick={() => {
                      if (unread && !busy) markRead(n.uuid);
                    }}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "10px 1fr", sm: "10px 1fr auto" },
                      columnGap: 1.5,
                      rowGap: 0.75,
                      alignItems: "flex-start",
                      px: { xs: 1.5, sm: 2 },
                      py: 1.5,
                      cursor: unread ? "pointer" : "default",
                      bgcolor: unread ? "rgba(0, 113, 227, 0.06)" : "transparent",
                      borderBottom: index === visible.length - 1 ? "none" : "1px solid",
                      borderColor: "divider",
                      transition: "background-color 0.15s ease",
                      "&:hover": {
                        bgcolor: unread ? "rgba(0, 113, 227, 0.1)" : "action.hover",
                      },
                    }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        mt: 1,
                        bgcolor: unread ? "primary.main" : "transparent",
                        boxShadow: unread ? "0 0 0 3px rgba(0, 113, 227, 0.18)" : "none",
                      }}
                    />

                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.35, flexWrap: "wrap" }}>
                        <Chip
                          size="small"
                          icon={relatedIcon(n.related_to)}
                          label={relatedLabel(n.related_to)}
                          color={relatedColor(n.related_to)}
                          variant={unread ? "filled" : "outlined"}
                          sx={{ height: 24, "& .MuiChip-label": { px: 0.75 } }}
                        />
                        <Typography
                          variant="subtitle2"
                          fontWeight={unread ? 700 : 500}
                          noWrap
                          sx={{ flex: 1, minWidth: 0 }}
                        >
                          {titleOf(n)}
                        </Typography>
                      </Stack>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          fontWeight: unread ? 500 : 400,
                        }}
                      >
                        {bodyOf(n)}
                      </Typography>
                    </Box>

                    <Stack
                      direction={{ xs: "row", sm: "column" }}
                      alignItems={{ xs: "center", sm: "flex-end" }}
                      spacing={0.5}
                      sx={{ gridColumn: { xs: "2", sm: "auto" }, justifySelf: { xs: "start", sm: "end" } }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                        {formatWhen(n.created_at)}
                      </Typography>
                      {unread ? (
                        <Tooltip title="Mark as read">
                          <span>
                            <IconButton
                              size="small"
                              disabled={busy}
                              onClick={(e) => {
                                e.stopPropagation();
                                markRead(n.uuid);
                              }}
                              aria-label="Mark as read"
                            >
                              {busy ? <CircularProgress size={16} /> : <MarkEmailRead fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          Read
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
