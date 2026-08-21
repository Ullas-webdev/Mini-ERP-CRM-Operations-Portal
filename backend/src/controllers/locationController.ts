import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

/**
 * GET /api/v1/locations
 * List all physical locations.
 */
export const getLocations = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { code: 'asc' },
    });

    return res.status(200).json({
      status: 'success',
      data: { locations, count: locations.length },
    });
  } catch (error) {
    next(error);
  }
};
