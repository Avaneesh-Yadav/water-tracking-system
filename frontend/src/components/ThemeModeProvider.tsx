import React, { createContext, useContext, useState, useEffect } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { getTheme } from "@/theme";

type Theme = "light" | "dark";

const getStoredTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  if (typeof window.matchMedia !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
};

type ThemeModeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export const useThemeMode = () => {
  const ctx = useContext(ThemeModeContext);
  return ctx;
};

export const ThemeModeProvider = (props: { children: React.ReactNode }) => {
  const { children } = props;
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  const muiTheme = getTheme(theme);

  // Only pass theme and children to MUI ThemeProvider so dev-injected props
  // (data-lov-id, data-component-*, etc.) are not forwarded and don't trigger prop-type warnings.
  const themeProviderProps = { theme: muiTheme, children };

  return (
    <ThemeModeContext.Provider value={{ theme, toggleTheme }}>
      <ThemeProvider {...themeProviderProps} />
    </ThemeModeContext.Provider>
  );
};
