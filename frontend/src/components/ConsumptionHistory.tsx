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

type Consumption = {
  id?: string;
  month: string;
  reading: number;
  consumption: number;
  amount: number;
  status: string;
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
                <TableCell>Meter Reading</TableCell>
                <TableCell>Consumption (L)</TableCell>
                <TableCell>Amount (₹)</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={item.id ?? item.month ?? index}>
                  <TableCell>{item.month}</TableCell>
                  <TableCell>{item.reading}</TableCell>
                  <TableCell>{item.consumption}</TableCell>
                  <TableCell>₹{item.amount}</TableCell>
                  <TableCell>
                    <Chip size="small" label={item.status} color={item.status === "Paid" ? "success" : "warning"} />
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
