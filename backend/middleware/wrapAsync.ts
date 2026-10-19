import type { NextFunction } from "express";
import type { AuthRequest } from "../types/express";
import type { Response } from "express";

type Handler = (req: AuthRequest, res: Response, next: NextFunction) => unknown;

/**
 * Express 4 does not forward rejected promises, so an async handler that throws
 * leaves the request hanging with no response. Wrap every async handler in this
 * so the client gets a 500 instead of a timeout.
 */
export function wrapAsync(handler: Handler): Handler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch((e: any) => {
      if (res.headersSent) return;
      res.status(500).json({ message: e?.message || "Server error" });
    });
  };
}
