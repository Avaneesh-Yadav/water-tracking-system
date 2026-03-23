import { Button, ButtonProps } from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import { useBack } from "@/hooks/useBack";

type BackButtonProps = Omit<ButtonProps, "onClick" | "startIcon"> & {
  label?: string;
  showLabel?: boolean;
};

/**
 * Global back button: navigates using the shared back-path logic (dashboard / profile / edit hierarchy).
 * Use everywhere instead of custom navigate(-1) or ad-hoc paths.
 */
export default function BackButton({
  label = "Back",
  showLabel = true,
  children,
  ...buttonProps
}: BackButtonProps) {
  const goBack = useBack();
  return (
    <Button
      color="inherit"
      startIcon={<ArrowBack />}
      onClick={goBack}
      {...buttonProps}
    >
      {children ?? (showLabel ? label : null)}
    </Button>
  );
}
