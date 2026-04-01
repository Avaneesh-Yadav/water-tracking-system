import {
  Card,
  CardHeader,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  Typography,
  Chip,
} from "@mui/material";
import MeterPhotoThumb from "@/components/MeterPhotoThumb";

type Consumption = {
  id?: string;
  month: string;
  reading: number;
  prevReading?: number;
  currReading?: number;
  consumption: number;
  amount: number;
  status: string;
  meter_photo_path?: string | null;
};

const ConsumptionHistory = ({ data }: { data: Consumption[] }) => {
  return (
    <Card sx={{ mt: 2 }} variant="outlined">
      <CardHeader
        title="Water Consumption History"
        subheader="Monthly water usage and billing details"
      />
      <CardContent sx={{ pt: 0 }}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Month</TableCell>
                <TableCell>Prev → Curr</TableCell>
                <TableCell>Display reading</TableCell>
                <TableCell>Consumption (L)</TableCell>
                <TableCell>Amount (₹)</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Reading Record</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={item.id ?? `${item.month}-${index}`}>
                  <TableCell>{item.month}</TableCell>
                  <TableCell>
                    {item.prevReading != null || item.currReading != null
                      ? `${item.prevReading ?? "—"} → ${item.currReading ?? "—"}`
                      : "—"}
                  </TableCell>
                  <TableCell>{item.reading}</TableCell>
                  <TableCell>{item.consumption}</TableCell>
                  <TableCell>₹{item.amount}</TableCell>
                  <TableCell>
                    <Chip size="small" label={item.status} color={item.status === "Paid" ? "success" : "warning"} />
                  </TableCell>
                  <TableCell align="center">
                    <MeterPhotoThumb path={item.meter_photo_path} size={36} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default ConsumptionHistory;
