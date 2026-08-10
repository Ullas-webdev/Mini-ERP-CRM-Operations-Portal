import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface RequestWithId extends Request {
  id?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export const loggerMiddleware = (
  req: RequestWithId,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.id = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const latency = Date.now() - start;
    const userId = req.user?.id || 'anonymous';
    const route = req.originalUrl || req.url;

    logger.info({
      requestId,
      userId,
      route,
      method: req.method,
      statusCode: res.statusCode,
      latencyMs: latency,
      userAgent: req.get('user-agent') || '',
      ip: req.ip || req.socket.remoteAddress || '',
    }, `${req.method} ${route} ${res.statusCode} - ${latency}ms`);
  });

  next();
};
