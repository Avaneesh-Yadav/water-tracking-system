import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../types/express";
import { isStaffRole } from "../utils/roles";

const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }
  if (!isStaffRole(req.user.role)) {
    res.status(403).json({ message: "Admin access required." });
    return;
  }
  next();
};

export default requireAdmin;
