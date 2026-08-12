import type { Response } from "express";
import type { AuthRequest } from "../types/express";
export const logoutUser = (req: AuthRequest, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  res.status(200).json({ message: 'Logged out successfully.' });
};
