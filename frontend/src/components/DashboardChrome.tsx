import React from "react";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { SystemStyleObject } from "@mui/system";

export function DashboardHero({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 2,
        mb: 3,
        p: { xs: 2, sm: 2.75 },
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        background: isDark
          ? `linear-gradient(128deg, ${alpha(theme.palette.primary.main, 0.18)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 50%)`
          : `linear-gradient(118deg, ${alpha(theme.palette.primary.main, 0.11)} 0%, ${alpha(theme.palette.info.main, 0.05)} 38%, ${theme.palette.background.paper} 72%)`,
        boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.25)" : "0 1px 2px rgba(15,23,42,0.04), 0 8px 28px rgba(15,23,42,0.06)",
      }}
    >
      <Box sx={{ minWidth: 0, flex: "1 1 240px" }}>
        <Typography
          variant="overline"
          sx={{
            letterSpacing: "0.12em",
            fontWeight: 800,
            color: "primary.main",
            display: "block",
            mb: 0.75,
            fontSize: "0.68rem",
          }}
        >
          {eyebrow}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.25, mb: 0.75 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640, lineHeight: 1.55 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
    </Box>
  );
}

type Accent = "primary" | "info" | "success" | "warning" | "error" | "neutral";

/** Plain style object only — avoids spreading `SxProps` (union with arrays) into `{ ... }`, which breaks TS. */
const cardBaseSx: SystemStyleObject<Theme> = {
  borderRadius: 3,
  border: "1px solid",
  borderColor: "divider",
  overflow: "hidden",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  boxShadow: (t) =>
    t.palette.mode === "dark"
      ? "0 4px 20px rgba(0,0,0,0.28)"
      : "0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 28px rgba(15, 23, 42, 0.07)",
};

export function DashboardPanel({
  accent = "neutral",
  title,
  subheader,
  headerIcon,
  children,
  footer,
  sx,
}: {
  accent?: Accent;
  title: string;
  subheader?: string;
  headerIcon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  sx?: SxProps<Theme>;
}) {
  const theme = useTheme();
  const topColor = accent === "neutral" ? "transparent" : theme.palette[accent].main;
  const sxRest = sx == null ? [] : Array.isArray(sx) ? sx : [sx];
  return (
    <Card
      sx={[
        cardBaseSx,
        accent !== "neutral" ? { borderTop: "3px solid", borderTopColor: topColor } : {},
        ...sxRest,
      ]}
    >
      <CardHeader
        avatar={
          headerIcon ? (
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: accent === "neutral" ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette[accent].main, 0.14),
                color: accent === "neutral" ? "primary.main" : `${accent}.main`,
              }}
            >
              {headerIcon}
            </Avatar>
          ) : undefined
        }
        title={title}
        subheader={subheader}
        titleTypographyProps={{ variant: "subtitle1", fontWeight: 700, letterSpacing: "-0.02em" }}
        subheaderTypographyProps={{ variant: "caption", sx: { mt: 0.35, lineHeight: 1.45, display: "block" } }}
        sx={{ pb: 1, alignItems: "flex-start", "& .MuiCardHeader-content": { minWidth: 0 } }}
      />
      <CardContent sx={{ pt: 0, flex: 1, display: "flex", flexDirection: "column" }}>{children}</CardContent>
      {footer}
    </Card>
  );
}

export function DashboardMetricRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 2,
        py: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-of-type": { borderBottom: "none", pb: 0 },
        "&:first-of-type": { pt: 0 },
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ textAlign: "right", wordBreak: "break-word" }}>
        {value}
      </Typography>
    </Box>
  );
}

export function AdminKpiTile({
  icon,
  label,
  value,
  hint,
  onClick,
  accent = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  onClick?: () => void;
  accent?: Accent;
}) {
  const theme = useTheme();
  const c = accent === "neutral" ? theme.palette.primary.main : theme.palette[accent].main;
  return (
    <Card
      onClick={onClick}
      sx={[
        cardBaseSx,
        {
          cursor: onClick ? "pointer" : "default",
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
          borderTop: "3px solid",
          borderTopColor: c,
          "&:hover": onClick
            ? {
                transform: "translateY(-2px)",
                boxShadow:
                  theme.palette.mode === "dark"
                    ? "0 8px 28px rgba(0,0,0,0.35)"
                    : "0 12px 32px rgba(15, 23, 42, 0.1)",
              }
            : {},
        },
      ]}
    >
      <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: alpha(c, 0.14),
              color: c,
            }}
          >
            {icon}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: "0.03em" }}>
              {label}
            </Typography>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: "-0.02em", lineHeight: 1.3, mt: 0.25 }}>
              {value}
            </Typography>
            {hint ? (
              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, display: "block", mt: 0.5 }}>
                {hint}
              </Typography>
            ) : null}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
