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
} from "@mui/material";

type Payment = {
  /** Shown in Transaction ID column */
  id: string;
  /** Stable row key from payment UUID */
  rowKey?: string;
  date: string;
  month: string;
  amount: number;
  method: string;
};

const PaymentHistory = ({ data }: { data: Payment[] }) => {
  return (
    <Card sx={{ mt: 2 }} variant="outlined">
      <CardHeader
        title="Payment History"
        subheader="Record of past payments made by the user"
      />
      <CardContent sx={{ pt: 0 }}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
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
              {data.length > 0 ? (
                data.map((payment, index) => (
                  <TableRow
                    key={payment.rowKey || `${payment.id}-${payment.date}-${payment.month}-${index}`}
                  >
                    <TableCell>{payment.id}</TableCell>
                    <TableCell>{payment.date}</TableCell>
                    <TableCell>{payment.month}</TableCell>
                    <TableCell>₹{payment.amount}</TableCell>
                    <TableCell>{payment.method}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No payment records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default PaymentHistory;
