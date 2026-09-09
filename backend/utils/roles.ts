export const ROLES = {
  USER: "USER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
  METER_READER: "METER_READER",
} as const;

export type AppUserRole = (typeof ROLES)[keyof typeof ROLES];

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

export function isValidAssignableRole(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === ROLES.USER || r === ROLES.ADMIN || r === ROLES.SUPER_ADMIN || r === ROLES.METER_READER;
}

/** First Super Admin may be created by an Admin; later ones only by Super Admin. */
export function canAssignSuperAdmin(actorRole?: string | null, superAdminCount = 0): boolean {
  if (isSuperAdmin(actorRole)) return true;
  return isAdminRole(actorRole) && superAdminCount === 0;
}

export function canDeleteTarget(
  actorRole?: string | null,
  actorUuid?: string | null,
  targetRole?: string | null,
  targetUuid?: string | null
): { ok: boolean; message?: string } {
  if (!actorUuid || actorUuid === targetUuid) {
    return { ok: false, message: "You cannot delete your own account." };
  }
  if (isSuperAdmin(targetRole)) {
    return { ok: false, message: "Super Admin accounts cannot be deleted." };
  }
  if (isAdminRole(targetRole) && !isSuperAdmin(actorRole)) {
    return { ok: false, message: "Only a Super Admin can delete an Admin." };
  }
  if (!isStaffRole(actorRole)) {
    return { ok: false, message: "Admin access required." };
  }
  return { ok: true };
}

export function canEditTarget(
  actorRole?: string | null,
  targetRole?: string | null
): { ok: boolean; message?: string } {
  if (!isStaffRole(actorRole)) {
    return { ok: false, message: "Admin access required." };
  }
  if (isSuperAdmin(targetRole) && !isSuperAdmin(actorRole)) {
    return { ok: false, message: "Only a Super Admin can edit a Super Admin." };
  }
  return { ok: true };
}
