import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../types/express";

const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }
  const role = (req.user.role || "").toUpperCase();
  if (role !== "ADMIN") {
    res.status(403).json({ message: "Admin access required." });
    return;
  }
  next();
};

export default requireAdmin;
