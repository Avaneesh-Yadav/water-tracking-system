export const ROLES = {
  USER: "USER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
  METER_READER: "METER_READER",
} as const;

export function normalizeRole(role?: string | null): string {
  return String(role || "").toUpperCase().trim();
}

export function isSuperAdmin(role?: string | null): boolean {
  return normalizeRole(role) === ROLES.SUPER_ADMIN;
}

export function isAdminRole(role?: string | null): boolean {
  return normalizeRole(role) === ROLES.ADMIN;
}

export function isStaffRole(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === ROLES.ADMIN || r === ROLES.SUPER_ADMIN;
}

export function isMeterReader(role?: string | null): boolean {
  return normalizeRole(role) === ROLES.METER_READER;
}

export function isOpsRole(role?: string | null): boolean {
  return isStaffRole(role) || isMeterReader(role);
}

export function roleLabel(role?: string | null): string {
  const r = normalizeRole(role);
  if (r === ROLES.SUPER_ADMIN) return "Super Admin";
  if (r === ROLES.ADMIN) return "Admin";
  if (r === ROLES.METER_READER) return "Meter reader";
  if (r === ROLES.USER) return "User";
  return r || "User";
}

export function roleChipColor(role?: string | null): "warning" | "secondary" | "primary" {
  const r = normalizeRole(role);
  if (r === ROLES.SUPER_ADMIN) return "warning";
  if (r === ROLES.ADMIN) return "secondary";
  return "primary";
}

export function roleBadgeSx(role?: string | null): { bgcolor: string; color: string } {
  const r = normalizeRole(role);
  if (r === ROLES.SUPER_ADMIN) return { bgcolor: "warning.light", color: "warning.dark" };
  if (r === ROLES.ADMIN) return { bgcolor: "secondary.light", color: "secondary.dark" };
  return { bgcolor: "primary.light", color: "primary.dark" };
}

export function canDeleteTarget(
  actorRole?: string | null,
  actorUuid?: string | null,
  targetRole?: string | null,
  targetUuid?: string | null
): boolean {
  if (!actorUuid || actorUuid === targetUuid) return false;
  if (isSuperAdmin(targetRole)) return false;
  if (isAdminRole(targetRole)) return isSuperAdmin(actorRole);
  return isStaffRole(actorRole);
}

export function storedUserRole(): string {
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return "";
    return normalizeRole(JSON.parse(stored)?.role);
  } catch {
    return "";
  }
}
