import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { RequestWithId } from '../middleware/loggerMiddleware';

export const createWorkOrderSchema = z.object({
  locationId: z.string().min(1, 'Location ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
  requiredQuantity: z.number().int().positive('Required quantity must be positive'),
  assignedUserId: z.string().min(1, 'Assigned User ID is required'),
});

export const updateWorkOrderStatusSchema = z.object({
  status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED']),
});

/**
 * POST /api/v1/work-orders
 * Admin creates a Work Order and automatically computes material shortage.
 */
export const createWorkOrder = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { locationId, productId, requiredQuantity, assignedUserId } = req.body;

    // Verify entities
    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) throw new NotFoundError(`Location with ID '${locationId}' not found`);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundError(`Product with ID '${productId}' not found`);

    const assignedUser = await prisma.user.findUnique({ where: { id: assignedUserId } });
    if (!assignedUser) throw new NotFoundError(`Assigned User with ID '${assignedUserId}' not found`);

    // Calculate Available Quantity at Location across all batches
    const inventories = await prisma.inventory.findMany({
      where: { productId, locationId },
    });

    const totalPhysical = inventories.reduce((sum, inv) => sum + inv.physicalQuantity, 0);
    const totalReserved = inventories.reduce((sum, inv) => sum + inv.reservedQuantity, 0);
    const totalAvailable = Math.max(0, totalPhysical - totalReserved);

    // Shortage = Max(0, Required Quantity - Available at Location)
    const shortage = Math.max(0, requiredQuantity - totalAvailable);

    // Auto-generate Work Order Number (WO-YYYY-XXXX)
    const count = await prisma.workOrder.count();
    const year = new Date().getFullYear();
    const workOrderNumber = `WO-${year}-${String(count + 1).padStart(4, '0')}`;

    const workOrder = await prisma.workOrder.create({
      data: {
        workOrderNumber,
        locationId,
        productId,
        requiredQuantity,
        assignedUserId,
        createdById: req.user!.id,
        status: 'ASSIGNED',
      },
      include: {
        location: true,
        product: true,
        assignedUser: { select: { id: true, name: true, email: true, role: true } },
        creator: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return res.status(201).json({
      status: 'success',
      data: {
        workOrder: {
          ...workOrder,
          availableQuantityAtLocation: totalAvailable,
          shortage,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/work-orders
 * List Work Orders with live calculated material shortage.
 */
export const getWorkOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { locationId, status, assignedUserId } = req.query;

    const where: any = {};

    if (locationId && typeof locationId === 'string') {
      where.locationId = locationId;
    }

    if (status && typeof status === 'string') {
      where.status = status;
    }

    if (assignedUserId && typeof assignedUserId === 'string') {
      where.assignedUserId = assignedUserId;
    }

    const rawWorkOrders = await prisma.workOrder.findMany({
      where,
      include: {
        location: true,
        product: true,
        assignedUser: { select: { id: true, name: true, email: true, role: true } },
        creator: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate shortage for each work order dynamically based on current inventory
    const workOrders = await Promise.all(
      rawWorkOrders.map(async (wo) => {
        const inventories = await prisma.inventory.findMany({
          where: { productId: wo.productId, locationId: wo.locationId },
        });

        const totalPhysical = inventories.reduce((sum, inv) => sum + inv.physicalQuantity, 0);
        const totalReserved = inventories.reduce((sum, inv) => sum + inv.reservedQuantity, 0);
        const availableAtLocation = Math.max(0, totalPhysical - totalReserved);
        const shortage = Math.max(0, wo.requiredQuantity - availableAtLocation);

        return {
          ...wo,
          availableQuantityAtLocation: availableAtLocation,
          shortage,
        };
      })
    );

    return res.status(200).json({
      status: 'success',
      data: {
        workOrders,
        count: workOrders.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/work-orders/:id/status
 * Update Work Order Status (ASSIGNED -> IN_PROGRESS -> COMPLETED).
 */
export const updateWorkOrderStatus = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existingWO = await prisma.workOrder.findUnique({ where: { id } });
    if (!existingWO) throw new NotFoundError(`Work Order with ID '${id}' not found`);

    const updatedWO = await prisma.workOrder.update({
      where: { id },
      data: { status },
      include: {
        location: true,
        product: true,
        assignedUser: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return res.status(200).json({
      status: 'success',
      data: {
        workOrder: updatedWO,
      },
    });
  } catch (error) {
    next(error);
  }
};
