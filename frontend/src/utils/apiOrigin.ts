import { API_URL } from "@/services/apiService";

/** Base URL for static files (e.g. /uploads/...) — strips trailing /api from VITE_API_URL */
export function getApiOrigin(): string {
  return (API_URL || "").replace(/\/api\/?$/i, "");
}

export function uploadFileUrl(path: string | null | undefined): string | null {
  if (!path || typeof path !== "string") return null;
  const origin = getApiOrigin();
  if (!origin) return path.startsWith("http") ? path : null;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${p}`;
}
