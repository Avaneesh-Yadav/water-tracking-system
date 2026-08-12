import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../types/express";

export type ControllerHandler = (
  req: AuthRequest,
  res: Response,
  next?: NextFunction
) => void | Promise<void>;

export type PublicControllerHandler = (
  req: AuthRequest,
  res: Response
) => void | Promise<void>;
