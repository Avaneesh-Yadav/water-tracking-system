import { createTheme } from "@mui/material/styles";

// Original water blue theme (as when collapse was added)
const waterBlue = "#1565c0";
const waterBlueLight = "#1976d2";
const actionGray = "#616161";
const backgroundWhite = "#ffffff";

export function getTheme(mode) {
  return createTheme({
    palette: {
      mode: mode,
      background: {
        default: backgroundWhite,
        paper: backgroundWhite,
      },
      primary: {
        main: waterBlue,
        light: waterBlueLight,
        dark: "#0d47a1",
        contrastText: "#fff",
      },
      secondary: {
        main: actionGray,
        light: "#757575",
        dark: "#424242",
        contrastText: "#fff",
      },
      success: { main: "#2e7d32" },
      error: { main: "#d32f2f" },
      warning: { main: "#ed6c02" },
    },
    shape: { borderRadius: 12 },
    components: {
      // Select/Menu/Popover use Modal scroll-lock, which hides the scrollbar and
      // adds padding-right. Combined with html { scrollbar-gutter: stable } that
      // creates a right-side gap and shifts the whole UI left.
      MuiMenu: {
        defaultProps: { disableScrollLock: true },
      },
      MuiPopover: {
        defaultProps: { disableScrollLock: true },
      },
      MuiModal: {
        defaultProps: { disableScrollLock: true },
      },
      MuiSelect: {
        defaultProps: {
          MenuProps: { disableScrollLock: true },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: "none" },
          contained: {
            backgroundColor: actionGray,
            color: "#fff",
            "&:hover": { backgroundColor: "#424242" },
          },
          containedPrimary: {
            backgroundColor: waterBlue,
            "&:hover": { backgroundColor: "#0d47a1" },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: "rgba(255, 255, 255, 0.14)",
            backdropFilter: "blur(34px) saturate(180%)",
            WebkitBackdropFilter: "blur(34px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.35)",
            boxShadow: "0 10px 40px rgba(2, 6, 23, 0.10)",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: "rgba(255, 255, 255, 0.10)",
            backdropFilter: "blur(34px) saturate(180%)",
            WebkitBackdropFilter: "blur(34px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.28)",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: "rgba(255, 255, 255, 0.10)",
            backgroundImage: `linear-gradient(90deg, rgba(255, 255, 255, 0.16), rgba(186, 230, 253, 0.10))`,
            backdropFilter: "blur(34px) saturate(180%)",
            WebkitBackdropFilter: "blur(34px) saturate(180%)",
          },
        },
      },
    },
  });
}

export const theme = getTheme("light");
