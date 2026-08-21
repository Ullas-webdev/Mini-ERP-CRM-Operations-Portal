import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { NotFoundError, BadRequestError, UnprocessableEntityError, ConflictError } from '../utils/errors';
import { RequestWithId } from '../middleware/loggerMiddleware';

export const createTransferSchema = z.object({
  sourceLocationId: z.string().min(1, 'Source location ID is required'),
  destinationLocationId: z.string().min(1, 'Destination location ID is required'),
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Transfer quantity must be positive'),
}).refine((data) => data.sourceLocationId !== data.destinationLocationId, {
  message: 'Source and Destination locations must be different',
  path: ['destinationLocationId'],
});

/**
 * POST /api/v1/transfers
 * Create a new Internal Stock Transfer request in REQUESTED status. No stock movement occurs yet.
 */
export const createTransfer = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { sourceLocationId, destinationLocationId, productId, quantity } = req.body;

    // Verify entities
    const sourceLoc = await prisma.location.findUnique({ where: { id: sourceLocationId } });
    if (!sourceLoc) throw new NotFoundError(`Source location with ID '${sourceLocationId}' not found`);

    const destLoc = await prisma.location.findUnique({ where: { id: destinationLocationId } });
    if (!destLoc) throw new NotFoundError(`Destination location with ID '${destinationLocationId}' not found`);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundError(`Product with ID '${productId}' not found`);

    const count = await prisma.stockTransfer.count();
    const year = new Date().getFullYear();
    const transferNumber = `TR-${year}-${String(count + 1).padStart(4, '0')}`;

    const transfer = await prisma.stockTransfer.create({
      data: {
        transferNumber,
        sourceLocationId,
        destinationLocationId,
        productId,
        quantity,
        status: 'REQUESTED',
        createdById: req.user!.id,
      },
      include: {
        sourceLocation: true,
        destinationLocation: true,
        product: true,
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(201).json({
      status: 'success',
      data: { transfer },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/transfers
 * List Internal Stock Transfers.
 */
export const getTransfers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { status, sourceLocationId, destinationLocationId } = req.query;

    const where: any = {};
    if (status && typeof status === 'string') where.status = status;
    if (sourceLocationId && typeof sourceLocationId === 'string') where.sourceLocationId = sourceLocationId;
    if (destinationLocationId && typeof destinationLocationId === 'string') where.destinationLocationId = destinationLocationId;

    const transfers = await prisma.stockTransfer.findMany({
      where,
      include: {
        sourceLocation: true,
        destinationLocation: true,
        product: true,
        creator: { select: { id: true, name: true, email: true } },
        dispatcher: { select: { id: true, name: true, email: true } },
        receiver: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      status: 'success',
      data: { transfers, count: transfers.length },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/transfers/:id/dispatch
 * Dispatch Stock Transfer (REQUESTED -> DISPATCHED).
 * Source inventory decreases immediately. Destination inventory does NOT increase yet.
 */
export const dispatchTransfer = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const updatedTransfer = await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id },
        include: { sourceLocation: true, destinationLocation: true, product: true },
      });

      if (!transfer) throw new NotFoundError(`Stock Transfer with ID '${id}' not found`);

      if (transfer.status !== 'REQUESTED') {
        throw new BadRequestError(`Cannot dispatch transfer in '${transfer.status}' status. Must be 'REQUESTED'.`);
      }

      // Find source inventory record
      const sourceInv = await tx.inventory.findFirst({
        where: { productId: transfer.productId, locationId: transfer.sourceLocationId },
      });

      if (!sourceInv) {
        throw new UnprocessableEntityError(`No inventory record found for product '${transfer.product.name}' at source location '${transfer.sourceLocation.name}'.`);
      }

      const availableQuantity = sourceInv.physicalQuantity - sourceInv.reservedQuantity;

      if (availableQuantity < transfer.quantity) {
        throw new UnprocessableEntityError(
          `Cannot transfer more than available stock. Requested: ${transfer.quantity}, Available at source: ${availableQuantity}`
        );
      }

      // Decrement Source physical quantity
      const updatedSourceInv = await tx.inventory.update({
        where: { id: sourceInv.id },
        data: { physicalQuantity: { decrement: transfer.quantity } },
      });

      // Record TRANSFER_DISPATCH stock movement
      await tx.stockMovement.create({
        data: {
          inventoryId: sourceInv.id,
          quantityChanged: transfer.quantity,
          movementType: 'TRANSFER_DISPATCH',
          reason: `Dispatched Stock Transfer #${transfer.transferNumber} to ${transfer.destinationLocation.name}`,
          referenceId: transfer.id,
          createdById: req.user?.id,
        },
      });

      // Update Stock Transfer status to DISPATCHED
      const updated = await tx.stockTransfer.update({
        where: { id },
        data: {
          status: 'DISPATCHED',
          dispatchedAt: new Date(),
          dispatchedById: req.user?.id,
        },
        include: {
          sourceLocation: true,
          destinationLocation: true,
          product: true,
        },
      });

      return updated;
    });

    return res.status(200).json({
      status: 'success',
      data: { transfer: updatedTransfer },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/transfers/:id/receive
 * Receive Stock Transfer (DISPATCHED -> RECEIVED).
 * Destination inventory increases. Prevents receiving a REQUESTED transfer or double-receiving a RECEIVED transfer.
 */
export const receiveTransfer = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const updatedTransfer = await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id },
        include: { sourceLocation: true, destinationLocation: true, product: true },
      });

      if (!transfer) throw new NotFoundError(`Stock Transfer with ID '${id}' not found`);

      if (transfer.status === 'RECEIVED') {
        throw new ConflictError(`Stock Transfer #${transfer.transferNumber} has already been received. Double-receive prevented.`);
      }

      if (transfer.status !== 'DISPATCHED') {
        throw new BadRequestError(`Cannot receive transfer in '${transfer.status}' status. Transfer must be 'DISPATCHED' first.`);
      }

      // Upsert destination inventory record
      const destInv = await tx.inventory.findFirst({
        where: { productId: transfer.productId, locationId: transfer.destinationLocationId },
      });

      let targetInvId: string;

      if (destInv) {
        const updatedDest = await tx.inventory.update({
          where: { id: destInv.id },
          data: { physicalQuantity: { increment: transfer.quantity } },
        });
        targetInvId = updatedDest.id;
      } else {
        const createdDest = await tx.inventory.create({
          data: {
            productId: transfer.productId,
            locationId: transfer.destinationLocationId,
            batchNumber: 'DEFAULT',
            physicalQuantity: transfer.quantity,
            reservedQuantity: 0,
          },
        });
        targetInvId = createdDest.id;
      }

      // Record TRANSFER_RECEIPT stock movement
      await tx.stockMovement.create({
        data: {
          inventoryId: targetInvId,
          quantityChanged: transfer.quantity,
          movementType: 'TRANSFER_RECEIPT',
          reason: `Received Stock Transfer #${transfer.transferNumber} from ${transfer.sourceLocation.name}`,
          referenceId: transfer.id,
          createdById: req.user?.id,
        },
      });

      // Update Transfer status to RECEIVED
      const updated = await tx.stockTransfer.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
          receivedById: req.user?.id,
        },
        include: {
          sourceLocation: true,
          destinationLocation: true,
          product: true,
        },
      });

      return updated;
    });

    return res.status(200).json({
      status: 'success',
      data: { transfer: updatedTransfer },
    });
  } catch (error) {
    next(error);
  }
};
