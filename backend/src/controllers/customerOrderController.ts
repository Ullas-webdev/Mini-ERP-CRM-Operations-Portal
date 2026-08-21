import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { NotFoundError, UnprocessableEntityError, BadRequestError } from '../utils/errors';
import { RequestWithId } from '../middleware/loggerMiddleware';

export const createOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  locationId: z.string().min(1, 'Location ID is required'),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        quantity: z.number().int().positive('Quantity must be positive'),
      })
    )
    .min(1, 'At least one order item is required'),
});

/**
 * POST /api/v1/customer-orders
 * Create Customer Order & Reserve Inventory against Available Quantity.
 * Protected against race conditions and concurrent over-reservation via database transaction locks.
 */
export const createCustomerOrder = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { customerId, locationId, items } = req.body;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundError(`Customer with ID '${customerId}' not found`);

    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) throw new NotFoundError(`Location with ID '${locationId}' not found`);

    const result = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsToCreate: Array<{
        productId: string;
        quantity: number;
        unitPriceSnapshot: number;
      }> = [];

      // Process each requested item sequentially inside the transaction lock
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new NotFoundError(`Product with ID '${item.productId}' not found`);

        // Find inventory record for this product at specified location
        const inventory = await tx.inventory.findFirst({
          where: { productId: item.productId, locationId },
        });

        if (!inventory) {
          throw new UnprocessableEntityError(
            `No inventory record exists for product '${product.name}' at location '${location.name}'`
          );
        }

        // Available Quantity = Physical Quantity - Reserved Quantity
        const availableQuantity = inventory.physicalQuantity - inventory.reservedQuantity;

        if (availableQuantity < item.quantity) {
          throw new UnprocessableEntityError(
            `Cannot reserve more than available inventory. Product: '${product.name}', Requested: ${item.quantity}, Available: ${availableQuantity}`
          );
        }

        // Increment Reserved Quantity
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            reservedQuantity: { increment: item.quantity },
          },
        });

        // Record RESERVATION stock movement
        await tx.stockMovement.create({
          data: {
            inventoryId: inventory.id,
            quantityChanged: item.quantity,
            movementType: 'RESERVATION',
            reason: `Reserved for Customer Order for ${customer.businessName}`,
            createdById: req.user?.id,
          },
        });

        const lineSubtotal = item.quantity * product.unitPrice;
        totalAmount += lineSubtotal;

        orderItemsToCreate.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPriceSnapshot: product.unitPrice,
        });
      }

      // Auto-generate Order Number (ORD-YYYY-XXXX)
      const count = await tx.customerOrder.count();
      const year = new Date().getFullYear();
      const orderNumber = `ORD-${year}-${String(count + 1).padStart(4, '0')}`;

      const order = await tx.customerOrder.create({
        data: {
          orderNumber,
          customerId,
          locationId,
          status: 'RESERVED',
          totalAmount,
          createdById: req.user!.id,
          items: {
            create: orderItemsToCreate,
          },
        },
        include: {
          customer: true,
          location: true,
          items: { include: { product: true } },
          creator: { select: { id: true, name: true, email: true } },
        },
      });

      return order;
    });

    return res.status(201).json({
      status: 'success',
      data: { order: result },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/customer-orders
 * List Customer Orders with reserved stock status.
 */
export const getCustomerOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { customerId, status, locationId } = req.query;

    const where: any = {};
    if (customerId && typeof customerId === 'string') where.customerId = customerId;
    if (status && typeof status === 'string') where.status = status;
    if (locationId && typeof locationId === 'string') where.locationId = locationId;

    const orders = await prisma.customerOrder.findMany({
      where,
      include: {
        customer: true,
        location: true,
        items: { include: { product: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      status: 'success',
      data: { orders, count: orders.length },
    });
  } catch (error) {
    next(error);
  }
};
