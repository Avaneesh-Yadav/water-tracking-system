import type { Request } from "express";
import type { JwtUserPayload } from "./domain";

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

/** Authenticated request — `user` is set after authenticate middleware */
export type AuthRequest = Request;

export type AuthHandler = import("express").RequestHandler;
