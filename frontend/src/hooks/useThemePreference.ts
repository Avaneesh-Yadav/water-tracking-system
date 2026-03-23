import { useContext } from "react";
import { useThemeMode } from "@/components/ThemeModeProvider";

/**
 * Use theme preference (light/dark). Must be used inside ThemeModeProvider.
 * Toggling updates MUI theme and persists to localStorage.
 */
export const useThemePreference = () => {
  const ctx = useThemeMode();
  if (!ctx) {
    throw new Error("useThemePreference must be used within ThemeModeProvider");
  }
  return ctx;
};


