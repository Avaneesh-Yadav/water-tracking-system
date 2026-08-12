import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthRequest } from "../types/express";
import type { JwtUserPayload } from "../types/domain";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const cookieHeader = req.headers.cookie || "";
  const cookies = cookieHeader.split(";").reduce<Record<string, string>>((acc, cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    acc[name] = rest.join("=").trim();
    return acc;
  }, {});

  const token = cookies["token"];

  if (!token) {
    res.status(403).json({ message: "No token provided." });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    const error = err as jwt.JsonWebTokenError & { name?: string };
    if (error.name === "TokenExpiredError") {
      res.status(401).json({ message: "Token expired.", code: "TOKEN_EXPIRED" });
      return;
    }
    res.status(401).json({ message: "Invalid token." });
  }
};

export default authenticate;
