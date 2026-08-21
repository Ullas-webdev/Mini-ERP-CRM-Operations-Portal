import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { NotFoundError, BadRequestError, UnprocessableEntityError } from '../utils/errors';
import { RequestWithId } from '../middleware/loggerMiddleware';

export const createInventorySchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  locationId: z.string().min(1, 'Location ID is required'),
  batchNumber: z.string().optional().default('DEFAULT'),
  physicalQuantity: z.number().int().min(0, 'Physical quantity must be non-negative'),
});

export const adjustInventorySchema = z.object({
  inventoryId: z.string().min(1, 'Inventory ID is required'),
  quantityChanged: z.number().int().refine((val) => val !== 0, 'Quantity changed cannot be zero'),
  movementType: z.enum(['IN', 'OUT']),
  reason: z.string().min(3, 'Reason is required'),
});

/**
 * GET /api/v1/inventory
 * List all inventory records with calculated Available Quantity (Physical - Reserved).
 */
export const getInventory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { locationId, productId, search } = req.query;

    const where: any = {};

    if (locationId && typeof locationId === 'string') {
      where.locationId = locationId;
    }

    if (productId && typeof productId === 'string') {
      where.productId = productId;
    }

    if (search && typeof search === 'string') {
      where.product = {
        OR: [
          { name: { contains: search } },
          { sku: { contains: search } },
          { category: { contains: search } },
        ],
      };
    }

    const rawInventories = await prisma.inventory.findMany({
      where,
      include: {
        product: true,
        location: true,
      },
      orderBy: [{ location: { name: 'asc' } }, { product: { name: 'asc' } }],
    });

    const inventories = rawInventories.map((inv) => {
      const availableQuantity = Math.max(0, inv.physicalQuantity - inv.reservedQuantity);
      const isLowStock = availableQuantity <= inv.product.minStockAlert;
      return {
        ...inv,
        availableQuantity,
        isLowStock,
      };
    });

    return res.status(200).json({
      status: 'success',
      data: {
        inventories,
        count: inventories.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/inventory
 * Create or initialize batch inventory for a product at a location.
 */
export const createInventory = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { productId, locationId, batchNumber, physicalQuantity } = req.body;

    // Verify product & location exist
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundError(`Product with ID '${productId}' not found`);

    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) throw new NotFoundError(`Location with ID '${locationId}' not found`);

    const batch = batchNumber || 'DEFAULT';

    const inventory = await prisma.$transaction(async (tx) => {
      const existing = await tx.inventory.findUnique({
        where: {
          productId_locationId_batchNumber: {
            productId,
            locationId,
            batchNumber: batch,
          },
        },
      });

      if (existing) {
        const updated = await tx.inventory.update({
          where: { id: existing.id },
          data: {
            physicalQuantity: { increment: physicalQuantity },
          },
          include: { product: true, location: true },
        });

        await tx.stockMovement.create({
          data: {
            inventoryId: updated.id,
            quantityChanged: physicalQuantity,
            movementType: 'IN',
            reason: 'Manual Inventory Batch Upsert',
            createdById: req.user?.id,
          },
        });

        return updated;
      }

      const created = await tx.inventory.create({
        data: {
          productId,
          locationId,
          batchNumber: batch,
          physicalQuantity,
          reservedQuantity: 0,
        },
        include: { product: true, location: true },
      });

      await tx.stockMovement.create({
        data: {
          inventoryId: created.id,
          quantityChanged: physicalQuantity,
          movementType: 'IN',
          reason: 'Initial Inventory Setup',
          createdById: req.user?.id,
        },
      });

      return created;
    });

    return res.status(201).json({
      status: 'success',
      data: {
        inventory: {
          ...inventory,
          availableQuantity: inventory.physicalQuantity - inventory.reservedQuantity,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/inventory/adjust
 * Adjust physical stock levels (IN / OUT) with ledger audit entry.
 */
export const adjustInventory = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { inventoryId, quantityChanged, movementType, reason } = req.body;

    const updatedInventory = await prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findUnique({
        where: { id: inventoryId },
        include: { product: true, location: true },
      });

      if (!inv) throw new NotFoundError(`Inventory record with ID '${inventoryId}' not found`);

      if (movementType === 'OUT') {
        const currentAvailable = inv.physicalQuantity - inv.reservedQuantity;
        if (currentAvailable < Math.abs(quantityChanged)) {
          throw new UnprocessableEntityError(
            `Cannot adjust stock below available quantity. Requested reduction: ${Math.abs(quantityChanged)}, Available: ${currentAvailable}`
          );
        }
      }

      const delta = movementType === 'IN' ? Math.abs(quantityChanged) : -Math.abs(quantityChanged);
      const newPhysical = inv.physicalQuantity + delta;

      if (newPhysical < 0) {
        throw new UnprocessableEntityError('Inventory adjustment would result in negative physical quantity');
      }

      const updated = await tx.inventory.update({
        where: { id: inventoryId },
        data: { physicalQuantity: newPhysical },
        include: { product: true, location: true },
      });

      await tx.stockMovement.create({
        data: {
          inventoryId: updated.id,
          quantityChanged: Math.abs(quantityChanged),
          movementType,
          reason,
          createdById: req.user?.id,
        },
      });

      return updated;
    });

    return res.status(200).json({
      status: 'success',
      data: {
        inventory: {
          ...updatedInventory,
          availableQuantity: updatedInventory.physicalQuantity - updatedInventory.reservedQuantity,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
