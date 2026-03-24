import React, { createContext, useContext } from "react";
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

export const ThemeModeProvider = (props: { children: React.ReactNode }) => {
  const { children } = props;
  const theme: Theme = "light";
  const toggleTheme = () => {};
  const muiTheme = getTheme("light");

  // Only pass theme and children to MUI ThemeProvider so dev-injected props
  // (data-lov-id, data-component-*, etc.) are not forwarded and don't trigger prop-type warnings.
  const themeProviderProps = { theme: muiTheme, children };

  return (
    <ThemeModeContext.Provider value={{ theme, toggleTheme }}>
      <ThemeProvider {...themeProviderProps} />
    </ThemeModeContext.Provider>
  );
};
