import { Snackbar, Alert, AlertColor } from "@mui/material";
import { useToast } from "@/hooks/use-toast";

export function MuiToaster() {
  const { toasts, dismiss } = useToast();
  const current = toasts[0];
  const open = !!current?.open;

  const severity: AlertColor =
    current?.variant === "destructive" ? "error" : "success";

  return (
    <Snackbar
      open={open}
      autoHideDuration={5000}
      onClose={() => current && dismiss(current.id)}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        onClose={() => current && dismiss(current.id)}
        severity={severity}
        variant="filled"
        sx={{ width: "100%" }}
      >
        {current?.title && <strong>{current.title}</strong>}
        {current?.description && (
          <span style={{ display: "block", marginTop: 4 }}>
            {current.description}
          </span>
        )}
      </Alert>
    </Snackbar>
  );
}
