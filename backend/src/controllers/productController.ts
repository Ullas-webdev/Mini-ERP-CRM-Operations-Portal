import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { RequestWithId } from '../middleware/loggerMiddleware';
import { NotFoundError, BadRequestError } from '../utils/errors';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  sku: z.string().min(2, 'SKU code must be at least 2 characters').toUpperCase(),
  category: z.string().min(2, 'Category is required'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  currentStock: z.number().int().min(0, 'Initial stock cannot be negative').default(0),
  minStockAlert: z.number().int().min(0, 'Min stock alert cannot be negative').default(0),
  warehouseLocation: z.string().min(2, 'Warehouse location is required'),
});

export const updateProductSchema = createProductSchema.partial();

export const stockAdjustmentSchema = z.object({
  quantity: z.number().int().positive('Quantity must be a positive integer greater than 0'),
  movementType: z.enum(['IN', 'OUT']),
  reason: z.string().min(3, 'Reason for stock adjustment must be at least 3 characters'),
});

export const productQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  search: z.string().optional(),
  category: z.string().optional(),
  lowStock: z.string().optional(),
});

// POST /products (Creates Product + Initial StockMovement if currentStock > 0)
export const createProduct = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const data = req.body;

    const existingSku = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existingSku) {
      return next(new BadRequestError(`Product with SKU code '${data.sku}' already exists`));
    }

    const product = await prisma.$transaction(async (tx) => {
      const createdProd = await tx.product.create({
        data,
      });

      if (createdProd.currentStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: createdProd.id,
            quantityChanged: createdProd.currentStock,
            movementType: 'IN',
            reason: 'Initial physical inventory creation upload',
            createdBy: req.user!.id,
          },
        });
      }

      return createdProd;
    });

    return res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// GET /products (Paginated, Searchable, Filterable)
export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { search, category, lowStock } = req.query as any;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);

    const whereClause: any = {};

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { category: { contains: search } },
        { warehouseLocation: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;

    const allProducts = await prisma.product.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            stockMovements: true,
          },
        },
      },
    });

    // Apply low-stock filter if requested (currentStock <= minStockAlert)
    let filteredProducts = allProducts;
    if (lowStock === 'true') {
      filteredProducts = allProducts.filter((p) => p.currentStock <= p.minStockAlert);
    }

    const total = filteredProducts.length;
    const paginatedProducts = filteredProducts.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      success: true,
      data: {
        products: paginatedProducts,
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

// GET /products/low-stock
export const getLowStockProducts = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const allProducts = await prisma.product.findMany({
      orderBy: { currentStock: 'asc' },
    });

    const lowStockProducts = allProducts.filter((p) => p.currentStock <= p.minStockAlert);

    return res.status(200).json({
      success: true,
      data: lowStockProducts,
    });
  } catch (error) {
    next(error);
  }
};

// GET /products/:id
export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stockMovements: true,
          },
        },
      },
    });

    if (!product) {
      return next(new NotFoundError(`Product with ID ${id} not found`));
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /products/:id (Direct currentStock edits strictly blocked!)
export const updateProduct = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // STRICT SAFETY RULE: Strip currentStock to prevent direct manual edits
    delete updateData.currentStock;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return next(new NotFoundError(`Product with ID ${id} not found`));
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      data: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
};

// POST /products/:id/stock-adjustment (Transactional Ledger Adjustment + Negative Stock Check)
export const adjustStock = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id: productId } = req.params;
    const { quantity, movementType, reason } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch product inside transaction
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundError(`Product with ID ${productId} not found`);
      }

      // 2. Calculate target stock balance
      const newStock =
        movementType === 'IN'
          ? product.currentStock + quantity
          : product.currentStock - quantity;

      // 3. Reject negative stock deduction
      if (movementType === 'OUT' && newStock < 0) {
        throw new BadRequestError(
          `Stock adjustment rejected. Insufficient inventory (Current Stock: ${product.currentStock}, Requested OUT: ${quantity}). Operation cannot result in negative stock balance.`
        );
      }

      // 4. Create append-only StockMovement record
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          quantityChanged: quantity,
          movementType,
          reason,
          createdBy: req.user!.id,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      // 5. Atomically update Product.currentStock
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          currentStock: newStock,
        },
      });

      return { product: updatedProduct, movement };
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// GET /products/:id/movements (Paginated Movement Audit Ledger)
export const getProductMovements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id: productId } = req.params;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);

    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) {
      return next(new NotFoundError(`Product with ID ${productId} not found`));
    }

    const skip = (page - 1) * limit;

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where: { productId } }),
      prisma.stockMovement.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      success: true,
      data: {
        movements,
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
