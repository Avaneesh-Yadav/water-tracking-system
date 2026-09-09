import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../types/express";
import { isMeterReader, isOpsRole, isStaffRole } from "../utils/roles";

export function requireOps(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }
  if (!isOpsRole(req.user.role)) {
    res.status(403).json({ message: "Staff or meter reader access required." });
    return;
  }
  next();
}

export function requireReaderOnlySelfParams(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (isMeterReader(req.user?.role) && !isStaffRole(req.user?.role)) {
    (req as AuthRequest & { readerScope?: boolean }).readerScope = true;
  }
  next();
}
