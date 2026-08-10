import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { RequestWithId } from '../middleware/loggerMiddleware';
import { NotFoundError } from '../utils/errors';

// 15-character Indian GSTIN Regex
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
// 10 to 15 digit international/Indian mobile number format
const MOBILE_REGEX = /^\+?[0-9]{10,15}$/;

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters'),
  mobile: z.string().regex(MOBILE_REGEX, 'Mobile number must be a valid 10 to 15 digit number (e.g. +919876543210)'),
  email: z.string().email('Invalid email address format'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  gstNumber: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val?.trim() === '' ? null : val?.toUpperCase()))
    .refine(
      (val) => val === null || val === undefined || GSTIN_REGEX.test(val),
      { message: 'Invalid GSTIN format. Expected 15-character format (e.g. 27AAAAA0000A1Z5)' }
    ),
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).default('LEAD'),
  followUpDate: z.string().nullable().optional().transform((val) => (val ? new Date(val) : null)),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const createNoteSchema = z.object({
  note: z.string().min(1, 'Note content cannot be empty'),
});

export const customerQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  search: z.string().optional(),
  status: z.string().optional(),
  customerType: z.string().optional(),
});

// POST /customers
export const createCustomer = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const data = req.body;

    const customer = await prisma.customer.create({
      data: {
        ...data,
        createdBy: req.user!.id,
      },
    });

    return res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// GET /customers (Paginated, Searchable, Filterable)
export const getCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { page = 1, limit = 10, search, status, customerType } = req.query as any;

    const whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }
    if (customerType) {
      whereClause.customerType = customerType;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { mobile: { contains: search } },
        { businessName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where: whereClause }),
      prisma.customer.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              notes: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: {
        customers,
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

// GET /customers/:id
export const getCustomerById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            notes: true,
            salesChallans: true,
          },
        },
      },
    });

    if (!customer) {
      return next(new NotFoundError(`Customer with ID ${id} not found`));
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /customers/:id
export const updateCustomer = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return next(new NotFoundError(`Customer with ID ${id} not found`));
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      data: updatedCustomer,
    });
  } catch (error) {
    next(error);
  }
};

// POST /customers/:id/notes
export const addCustomerNote = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id: customerId } = req.params;
    const { note } = req.body;

    const existing = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!existing) {
      return next(new NotFoundError(`Customer with ID ${customerId} not found`));
    }

    const newNote = await prisma.customerNote.create({
      data: {
        customerId,
        authorId: req.user!.id,
        note,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: newNote,
    });
  } catch (error) {
    next(error);
  }
};

// GET /customers/:id/notes
export const getCustomerNotes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id: customerId } = req.params;

    const existing = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!existing) {
      return next(new NotFoundError(`Customer with ID ${customerId} not found`));
    }

    const notes = await prisma.customerNote.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: notes,
    });
  } catch (error) {
    next(error);
  }
};
