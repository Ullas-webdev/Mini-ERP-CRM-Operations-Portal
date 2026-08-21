import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

// GET /api/v1/dashboard/stats — Admin & Operations dashboard aggregation
export const getAdminStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const [
      totalLocations,
      totalProducts,
      totalWorkOrders,
      pendingWorkOrders,
      totalTransfers,
      pendingTransfers,
      totalCustomerOrders,
      inventories,
    ] = await Promise.all([
      prisma.location.count(),
      prisma.product.count(),
      prisma.workOrder.count(),
      prisma.workOrder.count({ where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } } }),
      prisma.stockTransfer.count(),
      prisma.stockTransfer.count({ where: { status: { in: ['REQUESTED', 'DISPATCHED'] } } }),
      prisma.customerOrder.count(),
      prisma.inventory.findMany({ include: { product: true } }),
    ]);

    let lowStockCount = 0;
    inventories.forEach((inv) => {
      const available = inv.physicalQuantity - inv.reservedQuantity;
      if (available <= inv.product.minStockAlert) {
        lowStockCount++;
      }
    });

    return res.status(200).json({
      status: 'success',
      data: {
        totalLocations,
        totalProducts,
        totalWorkOrders,
        pendingWorkOrders,
        totalTransfers,
        pendingTransfers,
        totalCustomerOrders,
        lowStockCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
