import React, { createContext, useContext, createElement } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { getTheme } from "@/theme";

type Theme = "light";

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
  const theme: Theme = "light";
  const toggleTheme = () => {};
  const muiTheme = getTheme("light");

  // createElement avoids lovable-tagger injecting data-lov-* / data-component-*
  // onto MUI ThemeProvider, which rejects unknown props in development.
  return (
    <ThemeModeContext.Provider value={{ theme, toggleTheme }}>
      {createElement(ThemeProvider, { theme: muiTheme }, children)}
    </ThemeModeContext.Provider>
  );
};
