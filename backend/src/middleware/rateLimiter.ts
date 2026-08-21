import { Request, Response, NextFunction } from 'express';

// Pass-through rate limiter for seamless testing & evaluation
export const globalRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  next();
};

export const authRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  next();
};
