import { createTheme, PaletteMode } from "@mui/material/styles";

// Original water blue theme (as when collapse was added)
const waterBlue = "#1565c0";
const waterBlueLight = "#1976d2";
const actionGray = "#616161";
const backgroundWhite = "#ffffff";

export function getTheme(mode: PaletteMode) {
  const isDark = mode === "dark";
  return createTheme({
    palette: {
      mode,
      background: {
        default: isDark ? "#121212" : backgroundWhite,
        paper: isDark ? "#1e1e1e" : backgroundWhite,
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
            backgroundColor: isDark ? "#1e1e1e" : backgroundWhite,
            border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(21, 101, 192, 0.25)"}`,
            boxShadow: isDark ? "none" : "0 2px 8px rgba(21, 101, 192, 0.08)",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? "#1e1e1e" : backgroundWhite,
            border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(21, 101, 192, 0.2)"}`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: waterBlue,
            background: `linear-gradient(90deg, ${waterBlue}, ${waterBlueLight})`,
          },
        },
      },
    },
  });
}

export const theme = getTheme("light");
