import React, { createContext, useContext, createElement, useMemo, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { getTheme } from "@/theme";

type Theme = "light" | "dark";

type ThemeModeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export const useThemeMode = () => {
  const ctx = useContext(ThemeModeContext);
  return ctx;
};

export const ThemeModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() =>
    localStorage.getItem("aquaflow_theme") === "dark" ? "dark" : "light"
  );
  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("aquaflow_theme", next);
      return next;
    });
  };
  const muiTheme = useMemo(() => getTheme(theme), [theme]);

  return (
    <ThemeModeContext.Provider value={{ theme, toggleTheme }}>
      {createElement(ThemeProvider, { theme: muiTheme }, children)}
    </ThemeModeContext.Provider>
  );
};
