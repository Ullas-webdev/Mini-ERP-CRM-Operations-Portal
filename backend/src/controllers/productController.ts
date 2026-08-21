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
  minStockAlert: z.number().int().min(0, 'Min stock alert cannot be negative').default(10),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
  search: z.string().optional(),
  category: z.string().optional(),
});

// POST /products (Creates Product catalog item)
export const createProduct = async (
  _req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const data = _req.body;

    const existingSku = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existingSku) {
      return next(new BadRequestError(`Product with SKU code '${data.sku}' already exists`));
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        category: data.category,
        unitPrice: data.unitPrice,
        minStockAlert: data.minStockAlert ?? 10,
      },
    });

    return res.status(201).json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

// GET /products
export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { search, category } = req.query as any;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        inventories: {
          include: { location: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({
      status: 'success',
      data: {
        products,
        count: products.length,
      },
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
        inventories: {
          include: { location: true },
        },
      },
    });

    if (!product) {
      return next(new NotFoundError(`Product with ID '${id}' not found`));
    }

    return res.status(200).json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /products/:id
export const updateProduct = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const data = req.body;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return next(new NotFoundError(`Product with ID '${id}' not found`));
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
    });

    return res.status(200).json({
      status: 'success',
      data: { product: updated },
    });
  } catch (error) {
    next(error);
  }
};
