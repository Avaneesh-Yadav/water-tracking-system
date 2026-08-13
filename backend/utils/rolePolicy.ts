import User from "../models/User";
import { canAssignSuperAdmin } from "./roles";
import type { RowDataPacket } from "mysql2";

export function getSuperAdminCount(): Promise<number> {
  return new Promise((resolve, reject) => {
    User.countByRole("SUPER_ADMIN", (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      const total = (rows as RowDataPacket[] | undefined)?.[0]?.total;
      resolve(Number(total ?? 0));
    });
  });
}

export async function actorCanAssignSuperAdmin(actorRole?: string | null): Promise<boolean> {
  const count = await getSuperAdminCount();
  return canAssignSuperAdmin(actorRole, count);
}
