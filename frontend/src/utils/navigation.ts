/**
 * Centralized back/return navigation.
 * Use getBackPath() or useBack() so back button behavior is consistent app-wide.
 */

const STATIC_SEGMENTS = new Set([
  "",
  "register",
  "login",
  "forgot-password",
  "unauthorized",
]);

/**
 * Returns the path to navigate to when user clicks "Back".
 * - From /:uuid/edit → /:uuid (profile view)
 * - From /:uuid (profile view) → / (dashboard)
 * - From /unauthorized or other → / (dashboard)
 */
export function getBackPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 2 && segments[1] === "edit") {
    return `/${segments[0]}`;
  }
  if (segments.length === 1 && !STATIC_SEGMENTS.has(segments[0])) {
    return "/";
  }
  return "/";
}
