import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../utils/prisma';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { RequestWithId } from './loggerMiddleware';

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';
}

export const authenticate = async (
  req: RequestWithId,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Verify user exists and is active in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      return next(new UnauthorizedError('User account not found'));
    }

    if (!user.isActive) {
      return next(new ForbiddenError('User account is disabled. Contact your administrator.'));
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS',
    };

    next();
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
      return next(error);
    }
    return next(new UnauthorizedError('Invalid or expired access token'));
  }
};

export const authorize = (...allowedRoles: Array<'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS'>) => {
  return (req: RequestWithId, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('User authentication required'));
    }

    if (!allowedRoles.includes(req.user.role as any)) {
      const attemptedPath = req.originalUrl || req.url || 'unknown';
      const attemptedMethod = req.method;

      // Asynchronously log security audit event without blocking execution
      process.nextTick(async () => {
        try {
          await prisma.auditLog.create({
            data: {
              userId: req.user?.id || null,
              action: 'SUSPICIOUS_ACCESS_ATTEMPT',
              entityType: 'SECURITY_GATEWAY',
              beforeState: JSON.stringify({
                userRole: req.user?.role,
                allowedRoles,
                method: attemptedMethod,
                path: attemptedPath,
              }),
              afterState: JSON.stringify({
                status: 403,
                reason: `Role '${req.user?.role}' forbidden from ${attemptedMethod} ${attemptedPath}`,
              }),
              ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
            },
          });
        } catch {
          // Ignore audit logging errors cleanly
        }
      });

      return next(
        new ForbiddenError(
          `User role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
};
