import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { RequestWithId } from './loggerMiddleware';
import { logger } from '../utils/logger';

export const auditLog = (action: string, entityType: string) => {
  return async (req: RequestWithId, res: Response, next: NextFunction) => {
    let beforeState: any = null;

    // Optional: Capture beforeState if entityId is present in params
    const entityIdParam = req.params.id || req.params.entityId;

    if (entityIdParam && (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
      try {
        // Attempt generic query by entityType
        const modelName = entityType.toLowerCase();
        if ((prisma as any)[modelName]) {
          beforeState = await (prisma as any)[modelName].findUnique({
            where: { id: entityIdParam },
          });
        }
      } catch {
        // Ignore beforeState lookup failures cleanly
        beforeState = null;
      }
    }

    // Intercept res.json to capture afterState
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      // Process audit log after sending response
      process.nextTick(async () => {
        try {
          const afterState = body?.data || body;
          const entityId = entityIdParam || afterState?.id || null;

          await prisma.auditLog.create({
            data: {
              userId: req.user?.id || null,
              action,
              entityType,
              entityId: entityId ? String(entityId) : null,
              beforeState: beforeState ? JSON.stringify(beforeState) : null,
              afterState: afterState ? JSON.stringify(afterState) : null,
              ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
            },
          });
        } catch (auditErr) {
          logger.error({ auditErr }, 'Failed to record audit log entry');
        }
      });

      return originalJson(body);
    };

    next();
  };
};
