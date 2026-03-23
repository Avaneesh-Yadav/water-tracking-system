import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getBackPath } from "@/utils/navigation";

/**
 * Hook that returns a goBack function using the shared back-path logic.
 * Use this (or BackButton) everywhere instead of navigate(-1) for consistent back behavior.
 */
export function useBack(): () => void {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(() => {
    navigate(getBackPath(location.pathname));
  }, [navigate, location.pathname]);
}
