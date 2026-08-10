import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { RequestWithId } from '../middleware/loggerMiddleware';
import { NotFoundError, ConflictError, AppError } from '../utils/errors';

export const challanLineItemSchema = z.object({
  productId: z.string().min(1, 'Product selection is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

export const createChallanSchema = z.object({
  customerId: z.string().min(1, 'Customer selection is required'),
  lineItems: z.array(challanLineItemSchema).min(1, 'At least one line item is required'),
});

export const updateChallanSchema = z.object({
  customerId: z.string().optional(),
  lineItems: z.array(challanLineItemSchema).optional(),
});

export const challanQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  status: z.string().optional(),
  customerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

// Helper function to generate sequential CH-YYYY-NNNN number
async function generateChallanNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `CH-${currentYear}-`;

  const count = await prisma.salesChallan.count({
    where: {
      challanNumber: {
        startsWith: yearPrefix,
      },
    },
  });

  const nextSeq = (count + 1).toString().padStart(4, '0');
  return `${yearPrefix}${nextSeq}`;
}

// POST /challans (Create Draft with Price/Name Snapshots)
export const createChallan = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { customerId, lineItems } = req.body;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return next(new NotFoundError(`Customer with ID ${customerId} not found`));
    }

    // Fetch product details for snapshot
    const productIds = lineItems.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalQuantity = 0;
    const snapshottedLineItems = [];

    for (const item of lineItems) {
      const prod = productMap.get(item.productId);
      if (!prod) {
        return next(new NotFoundError(`Product with ID ${item.productId} not found`));
      }

      totalQuantity += item.quantity;
      snapshottedLineItems.push({
        productId: prod.id,
        quantity: item.quantity,
        unitPriceSnapshot: prod.unitPrice,
        productNameSnapshot: prod.name,
      });
    }

    const challanNumber = await generateChallanNumber();

    const challan = await prisma.salesChallan.create({
      data: {
        challanNumber,
        customerId,
        status: 'DRAFT',
        totalQuantity,
        createdBy: req.user!.id,
        lineItems: {
          create: snapshottedLineItems,
        },
      },
      include: {
        customer: { select: { id: true, name: true, businessName: true, mobile: true, email: true } },
        lineItems: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

// GET /challans (Paginated, Searchable, Filterable)
export const getChallans = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { page = 1, limit = 10, status, customerId, startDate, endDate, search } = req.query as any;

    const whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }
    if (customerId) {
      whereClause.customerId = customerId;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }

    if (search) {
      whereClause.OR = [
        { challanNumber: { contains: search } },
        { customer: { businessName: { contains: search } } },
        { customer: { name: { contains: search } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, challans] = await Promise.all([
      prisma.salesChallan.count({ where: whereClause }),
      prisma.salesChallan.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          customer: {
            select: { id: true, name: true, businessName: true, mobile: true, email: true },
          },
          creator: {
            select: { id: true, name: true, email: true, role: true },
          },
          lineItems: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      success: true,
      data: {
        challans,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /challans/:id
export const getChallanById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: {
        customer: true,
        creator: {
          select: { id: true, name: true, email: true, role: true },
        },
        lineItems: {
          include: {
            product: {
              select: { id: true, sku: true, currentStock: true, minStockAlert: true },
            },
          },
        },
      },
    });

    if (!challan) {
      return next(new NotFoundError(`Sales Challan with ID ${id} not found`));
    }

    return res.status(200).json({
      success: true,
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /challans/:id (Edit DRAFT only)
export const updateChallan = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { customerId, lineItems } = req.body;

    const existing = await prisma.salesChallan.findUnique({
      where: { id },
      include: { lineItems: true },
    });

    if (!existing) {
      return next(new NotFoundError(`Sales Challan with ID ${id} not found`));
    }

    if (existing.status !== 'DRAFT') {
      return next(
        new ConflictError(
          `Challan '${existing.challanNumber}' is already ${existing.status}. Edits are permitted on DRAFT challans only.`
        )
      );
    }

    let totalQuantity = existing.totalQuantity;

    if (lineItems) {
      const productIds = lineItems.map((item: any) => item.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      totalQuantity = 0;
      const snapshottedLineItems = [];

      for (const item of lineItems) {
        const prod = productMap.get(item.productId);
        if (!prod) {
          return next(new NotFoundError(`Product with ID ${item.productId} not found`));
        }

        totalQuantity += item.quantity;
        snapshottedLineItems.push({
          productId: prod.id,
          quantity: item.quantity,
          unitPriceSnapshot: prod.unitPrice,
          productNameSnapshot: prod.name,
        });
      }

      // Replace existing line items atomically
      await prisma.challanLineItem.deleteMany({ where: { challanId: id } });
      await prisma.challanLineItem.createMany({
        data: snapshottedLineItems.map((item) => ({ ...item, challanId: id })),
      });
    }

    const updated = await prisma.salesChallan.update({
      where: { id },
      data: {
        customerId: customerId || existing.customerId,
        totalQuantity,
      },
      include: {
        customer: true,
        lineItems: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// POST /challans/:id/confirm (Transactional Concurrency-Safe Stock Deduction)
export const confirmChallan = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current challan inside transaction
      const challan = await tx.salesChallan.findUnique({
        where: { id },
        include: {
          lineItems: true,
        },
      });

      if (!challan) {
        throw new NotFoundError(`Sales Challan with ID ${id} not found`);
      }

      if (challan.status === 'CONFIRMED') {
        throw new ConflictError(`Challan '${challan.challanNumber}' is already CONFIRMED.`);
      }

      if (challan.status === 'CANCELLED') {
        throw new ConflictError(`Cannot confirm a CANCELLED challan '${challan.challanNumber}'.`);
      }

      // 2. Re-fetch current stock for EVERY line item product inside transaction
      const shortages = [];

      for (const item of challan.lineItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundError(`Product '${item.productNameSnapshot}' not found`);
        }

        if (product.currentStock < item.quantity) {
          shortages.push({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            availableStock: product.currentStock,
            requestedQuantity: item.quantity,
            shortage: item.quantity - product.currentStock,
          });
        }
      }

      // 3. If ANY item has insufficient stock, ROLL BACK entire transaction and return detailed 400
      if (shortages.length > 0) {
        throw new AppError(
          400,
          'INSUFFICIENT_STOCK',
          `Cannot confirm Challan '${challan.challanNumber}' due to insufficient stock for ${shortages.length} product(s). No partial confirmation was applied.`,
          shortages
        );
      }

      // 4. If ALL sufficient, decrement stock for every product and create StockMovements (OUT)
      for (const item of challan.lineItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: {
              decrement: item.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantityChanged: item.quantity,
            movementType: 'OUT',
            reason: `Challan ${challan.challanNumber} confirmation fulfillment`,
            createdBy: req.user!.id,
          },
        });
      }

      // 5. Update challan status to CONFIRMED
      const confirmedChallan = await tx.salesChallan.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
        include: {
          customer: true,
          lineItems: true,
        },
      });

      return confirmedChallan;
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// POST /challans/:id/cancel (Reverses Stock if CONFIRMED)
export const cancelChallan = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const challan = await tx.salesChallan.findUnique({
        where: { id },
        include: { lineItems: true },
      });

      if (!challan) {
        throw new NotFoundError(`Sales Challan with ID ${id} not found`);
      }

      if (challan.status === 'CANCELLED') {
        throw new ConflictError(`Challan '${challan.challanNumber}' is already CANCELLED.`);
      }

      // If CONFIRMED, reverse stock allocations via IN StockMovements
      if (challan.status === 'CONFIRMED') {
        for (const item of challan.lineItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: {
                increment: item.quantity,
              },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantityChanged: item.quantity,
              movementType: 'IN',
              reason: `Challan ${challan.challanNumber} cancellation reversal`,
              createdBy: req.user!.id,
            },
          });
        }
      }

      const cancelledChallan = await tx.salesChallan.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
        include: {
          customer: true,
          lineItems: true,
        },
      });

      return cancelledChallan;
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
