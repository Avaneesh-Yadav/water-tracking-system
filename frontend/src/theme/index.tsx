import { createTheme } from "@mui/material/styles";

/** Match AquaFlow auth tokens so the logged-in app feels like the same product. */
const waterBlue = "#0071e3";
const waterBlueLight = "#38bdf8";
const waterInk = "#142028";
const backgroundWash = "#d7ebf5";

export function getTheme(mode: "light" | "dark") {
  const dark = mode === "dark";
  return createTheme({
    palette: {
      mode: mode,
      background: {
        default: dark ? "#07141c" : backgroundWash,
        paper: dark ? "#102530" : "#ffffff",
      },
      primary: {
        main: waterBlue,
        light: waterBlueLight,
        dark: "#005bb5",
        contrastText: "#fff",
      },
      secondary: {
        main: dark ? "#7dd3fc" : "#3d6b82",
        light: "#5b8aa0",
        dark: "#2a4d5e",
        contrastText: dark ? "#07141c" : "#fff",
      },
      success: { main: "#0f766e" },
      error: { main: "#d32f2f" },
      warning: { main: "#ed6c02" },
      text: {
        primary: dark ? "#e8f1f6" : waterInk,
        secondary: dark ? "rgba(232, 241, 246, 0.68)" : "rgba(20, 32, 40, 0.62)",
      },
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: '"DM Sans", "Segoe UI", system-ui, sans-serif',
      button: { textTransform: "none", fontWeight: 600 },
    },
    components: {
      MuiMenu: {
        defaultProps: { disableScrollLock: true },
        styleOverrides: {
            paper: {
            backgroundColor: dark ? "rgba(16, 37, 48, 0.94)" : "rgba(255, 255, 255, 0.94)",
            color: dark ? "#e8f1f6" : undefined,
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
          },
        },
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
          root: { textTransform: "none", borderRadius: 999 },
          contained: {
            backgroundColor: waterBlue,
            color: "#fff",
            boxShadow: "0 8px 22px rgba(0, 113, 227, 0.28)",
            "&:hover": { backgroundColor: "#005bb5" },
          },
          containedPrimary: {
            backgroundColor: waterBlue,
            "&:hover": { backgroundColor: "#005bb5" },
          },
          containedSecondary: {
            backgroundColor: "#3d6b82",
            "&:hover": { backgroundColor: "#2a4d5e" },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: dark ? "rgba(16, 37, 48, 0.9)" : "rgba(255, 255, 255, 0.86)",
            backdropFilter: "blur(34px) saturate(180%)",
            WebkitBackdropFilter: "blur(34px) saturate(180%)",
            border: dark ? "1px solid rgba(125, 211, 252, 0.18)" : "1px solid rgba(20, 32, 40, 0.08)",
            boxShadow: "0 10px 40px rgba(2, 6, 23, 0.10)",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: dark ? "rgba(16, 37, 48, 0.94)" : "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(34px) saturate(180%)",
            WebkitBackdropFilter: "blur(34px) saturate(180%)",
            border: dark ? "1px solid rgba(125, 211, 252, 0.12)" : "1px solid rgba(20, 32, 40, 0.08)",
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            backgroundColor: dark ? "rgba(16, 37, 48, 0.96)" : "rgba(255, 255, 255, 0.96)",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: dark ? "rgba(7, 20, 28, 0.85)" : "rgba(255, 255, 255, 0.82)",
            backgroundImage: dark
              ? "linear-gradient(90deg, rgba(7, 20, 28, 0.9), rgba(14, 48, 64, 0.8))"
              : `linear-gradient(90deg, rgba(255, 255, 255, 0.88), rgba(224, 242, 254, 0.82))`,
            backdropFilter: "blur(34px) saturate(180%)",
            WebkitBackdropFilter: "blur(34px) saturate(180%)",
            color: dark ? "#e8f1f6" : waterInk,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 24,
            backgroundColor: dark ? "rgba(16, 37, 48, 0.97)" : "rgba(255, 255, 255, 0.97)",
          },
        },
      },
    },
  });
}

export const theme = getTheme("light");
