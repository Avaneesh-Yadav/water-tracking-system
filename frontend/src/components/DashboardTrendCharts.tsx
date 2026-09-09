import React, { useId, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  useTheme,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export type ConsumptionMonthRow = { month: string; liters: number; amount: number };
export type PaymentsMonthRow = { month: string; amount: number };

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const compactNum = (n: number) => {
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
};

/** Shared card chrome + theme for dashboard charts */
function useDashboardChartChrome() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const cardSx = {
    borderRadius: 4,
    overflow: "hidden",
    boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.35)" : "0 12px 32px rgba(15, 23, 42, 0.08)",
  };
  const headerSx = {
    pb: 1,
    pt: 2.5,
    px: 2.5,
    background: isDark
      ? `linear-gradient(135deg, ${theme.palette.primary.dark}22 0%, transparent 55%)`
      : `linear-gradient(135deg, ${theme.palette.primary.main}12 0%, transparent 50%)`,
    borderBottom: "1px solid",
    borderColor: "divider",
    "& .MuiCardHeader-title": {
      fontWeight: 700,
      fontSize: "1.05rem",
      letterSpacing: "-0.02em",
    },
    "& .MuiCardHeader-subheader": {
      mt: 0.5,
      fontSize: "0.8125rem",
      lineHeight: 1.45,
    },
  };
  return { theme, cardSx, headerSx };
}

function DualConsumptionTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <Box
      sx={{
        px: 1.75,
        py: 1.25,
        borderRadius: 2,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 8px 30px rgba(15, 23, 42, 0.12)",
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.75 }}>
        {label}
      </Typography>
      {payload.map((p: { name?: string; value?: number; color?: string; dataKey?: string }) => (
        <Typography key={String(p.dataKey)} variant="body2" sx={{ color: p.color, fontWeight: 600 }}>
          {p.dataKey === "liters" ? `${Number(p.value).toLocaleString("en-IN")} L` : inr(Number(p.value))}
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 500 }}>
            {p.dataKey === "liters" ? "volume" : "billed"}
          </Typography>
        </Typography>
      ))}
    </Box>
  );
}

function PaymentTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v = Number(payload[0]?.value);
  return (
    <Box
      sx={{
        px: 1.75,
        py: 1.25,
        borderRadius: 2,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 8px 30px rgba(15, 23, 42, 0.12)",
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700} color="success.main">
        {inr(v)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Total received this month
      </Typography>
    </Box>
  );
}

export function ConsumptionMonthCard({
  title,
  subheader,
  data,
}: {
  title: string;
  subheader: string;
  data: ConsumptionMonthRow[];
}) {
  const { theme, cardSx, headerSx } = useDashboardChartChrome();
  const uid = useId().replace(/:/g, "");
  const gLiters = `grad-liters-${uid}`;
  const gAmount = `grad-amount-${uid}`;

  const axisMuted = theme.palette.text.secondary;
  const gridStroke = theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15, 23, 42, 0.07)";

  const literStop0 = theme.palette.mode === "dark" ? "#60a5fa" : "#3b82f6";
  const literStop1 = theme.palette.mode === "dark" ? "#1d4ed8" : "#1d4ed8";
  const amountStop0 = theme.palette.mode === "dark" ? "#5eead4" : "#2dd4bf";
  const amountStop1 = theme.palette.mode === "dark" ? "#0f766e" : "#0f766e";

  const chart = useMemo(
    () => (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 16, right: 8, left: 0, bottom: 4 }}
          barCategoryGap="32%"
          barGap={6}
        >
          <defs>
            <linearGradient id={gLiters} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={literStop0} stopOpacity={1} />
              <stop offset="100%" stopColor={literStop1} stopOpacity={0.88} />
            </linearGradient>
            <linearGradient id={gAmount} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={amountStop0} stopOpacity={1} />
              <stop offset="100%" stopColor={amountStop1} stopOpacity={0.88} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 6" vertical={false} stroke={gridStroke} />
          <XAxis
            dataKey="month"
            tick={{ fill: axisMuted, fontSize: 11, fontWeight: 500 }}
            tickLine={false}
            axisLine={{ stroke: gridStroke }}
            tickMargin={10}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: axisMuted, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={compactNum}
            width={44}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: axisMuted, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `₹${compactNum(v)}`}
            width={52}
          />
          <Tooltip content={<DualConsumptionTooltip />} cursor={{ fill: theme.palette.action.hover, opacity: 0.35 }} />
          <Legend
            wrapperStyle={{ paddingTop: 12 }}
            formatter={(value) => (
              <span style={{ color: theme.palette.text.secondary, fontSize: 12, fontWeight: 500 }}>{value}</span>
            )}
          />
          <Bar
            yAxisId="left"
            dataKey="liters"
            name="Liters (L)"
            fill={`url(#${gLiters})`}
            maxBarSize={48}
            radius={[6, 6, 0, 0]}
          />
          <Bar
            yAxisId="right"
            dataKey="amount"
            name="Amount (₹)"
            fill={`url(#${gAmount})`}
            maxBarSize={48}
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    ),
    [data, gLiters, gAmount, axisMuted, gridStroke, literStop0, literStop1, amountStop0, amountStop1, theme]
  );

  if (data.length === 0) {
    return (
      <Card sx={cardSx}>
        <CardHeader title={title} subheader={subheader} sx={headerSx} />
        <CardContent sx={{ pt: 0 }}>
          <Typography color="text.secondary" textAlign="center" py={5} variant="body2">
            No consumption data yet
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={cardSx}>
      <CardHeader title={title} subheader={subheader} sx={headerSx} />
      <CardContent sx={{ pt: 0, pb: 2.5, px: 2 }}>
        <Box sx={{ width: "100%", height: 308 }}>{chart}</Box>
      </CardContent>
    </Card>
  );
}

export function PaymentsMonthCard({
  title,
  subheader,
  data,
}: {
  title: string;
  subheader: string;
  data: PaymentsMonthRow[];
}) {
  const { theme, cardSx, headerSx } = useDashboardChartChrome();
  const uid = useId().replace(/:/g, "");
  const gPay = `grad-pay-${uid}`;

  const axisMuted = theme.palette.text.secondary;
  const gridStroke = theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15, 23, 42, 0.07)";
  const pay0 = theme.palette.mode === "dark" ? "#5eead4" : "#14b8a6";
  const pay1 = theme.palette.mode === "dark" ? "#0f766e" : "#0f766e";

  const chart = useMemo(
    () => (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 4 }} barCategoryGap="36%" barGap={8}>
          <defs>
            <linearGradient id={gPay} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={pay0} stopOpacity={1} />
              <stop offset="100%" stopColor={pay1} stopOpacity={0.9} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 6" vertical={false} stroke={gridStroke} />
          <XAxis
            dataKey="month"
            tick={{ fill: axisMuted, fontSize: 11, fontWeight: 500 }}
            tickLine={false}
            axisLine={{ stroke: gridStroke }}
            tickMargin={10}
          />
          <YAxis
            tick={{ fill: axisMuted, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `₹${compactNum(v)}`}
            width={56}
          />
          <Tooltip content={<PaymentTooltip />} cursor={{ fill: theme.palette.action.hover, opacity: 0.35 }} />
          <Bar dataKey="amount" name="Payments" fill={`url(#${gPay})`} maxBarSize={52} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    ),
    [data, gPay, axisMuted, gridStroke, pay0, pay1, theme]
  );

  if (data.length === 0) {
    return (
      <Card sx={cardSx}>
        <CardHeader title={title} subheader={subheader} sx={headerSx} />
        <CardContent sx={{ pt: 0 }}>
          <Typography color="text.secondary" textAlign="center" py={5} variant="body2">
            No payment data yet
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={cardSx}>
      <CardHeader title={title} subheader={subheader} sx={headerSx} />
      <CardContent sx={{ pt: 0, pb: 2.5, px: 2 }}>
        <Box sx={{ width: "100%", height: 308 }}>{chart}</Box>
      </CardContent>
    </Card>
  );
}
