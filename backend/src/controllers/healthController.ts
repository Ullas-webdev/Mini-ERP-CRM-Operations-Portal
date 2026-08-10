import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';

export const getHealthStatus = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    let dbStatus = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (dbErr) {
      dbStatus = `error: ${(dbErr as Error).message}`;
    }

    const healthData = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      environment: env.NODE_ENV,
      memoryUsage: process.memoryUsage(),
    };

    return res.status(200).json({
      success: true,
      data: healthData,
    });
  } catch (error) {
    return next(error);
  }
};
