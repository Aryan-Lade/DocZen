import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized, no token' });
    return;
  }

  // 1. Verify the JWT — only a bad/expired token should cause a 401 here
  let decoded: { id: string };
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
    return;
  }

  // 2. Load the user — a DB hiccup must NOT masquerade as an auth failure,
  //    otherwise the client wrongly logs the user out on transient errors
  try {
    req.user = await User.findByPk(decoded.id);
  } catch (error) {
    console.error('[auth] DB error while loading user:', error);
    res.status(503).json({ success: false, message: 'Service temporarily unavailable, please retry' });
    return;
  }

  if (!req.user) {
    res.status(401).json({ success: false, message: 'User not found' });
    return;
  }

  next();
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return;
  }
  next();
};
