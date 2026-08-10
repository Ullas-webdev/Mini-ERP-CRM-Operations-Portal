import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { RequestWithId } from '../middleware/loggerMiddleware';

// GET /dashboard/stats — Admin dashboard aggregation
export const getAdminStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      customersByStatus,
      totalProducts,
      lowStockProducts,
      challansThisWeekRaw,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.product.count(),
      prisma.product.findMany({ where: {} }),
      prisma.salesChallan.findMany({
        where: {
          status: 'CONFIRMED',
          confirmedAt: { gte: startOfWeek },
        },
        select: { confirmedAt: true },
        orderBy: { confirmedAt: 'asc' },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      }),
    ]);

    const lowStockCount = lowStockProducts.filter(
      (p) => p.currentStock <= p.minStockAlert
    ).length;

    // Build challans-per-day for the past 7 days
    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = challansThisWeekRaw.filter((c) => {
        const challanDate = c.confirmedAt?.toISOString().split('T')[0];
        return challanDate === dateStr;
      }).length;
      days.push({ date: dateStr, count });
    }

    return res.status(200).json({
      success: true,
      data: {
        totalCustomers,
        customersByStatus: customersByStatus.map((s) => ({
          status: s.status,
          count: s._count.id,
        })),
        totalProducts,
        lowStockCount,
        challansThisWeek: days,
        recentAuditLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /dashboard/sales-summary — Sales role dashboard
export const getSalesSummary = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user!.id;
    const now = new Date();

    const [myLeads, draftChallans, recentConfirmed] = await Promise.all([
      prisma.customer.findMany({
        where: { status: 'LEAD', createdBy: userId },
        orderBy: { followUpDate: 'asc' },
        take: 10,
        select: {
          id: true,
          name: true,
          businessName: true,
          status: true,
          followUpDate: true,
          customerType: true,
          mobile: true,
        },
      }),
      prisma.salesChallan.findMany({
        where: { status: 'DRAFT', createdBy: userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          customer: { select: { id: true, name: true, businessName: true } },
          lineItems: true,
        },
      }),
      prisma.salesChallan.findMany({
        where: { status: 'CONFIRMED' },
        orderBy: { confirmedAt: 'desc' },
        take: 5,
        include: {
          customer: { select: { id: true, name: true, businessName: true } },
          lineItems: true,
        },
      }),
    ]);

    const overdueLeads = myLeads.filter(
      (c) => c.followUpDate && new Date(c.followUpDate) < now
    );

    return res.status(200).json({
      success: true,
      data: {
        myLeads,
        overdueFollowUpCount: overdueLeads.length,
        draftChallans,
        recentConfirmed,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /dashboard/warehouse-summary — Warehouse role dashboard
export const getWarehouseSummary = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const [allProducts, recentMovements] = await Promise.all([
      prisma.product.findMany({
        orderBy: { currentStock: 'asc' },
      }),
      prisma.stockMovement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          creator: { select: { id: true, name: true, role: true } },
        },
      }),
    ]);

    const lowStockProducts = allProducts.filter(
      (p) => p.currentStock <= p.minStockAlert
    );

    return res.status(200).json({
      success: true,
      data: {
        lowStockProducts,
        recentMovements,
        totalProducts: allProducts.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /dashboard/accounts-summary — Accounts role dashboard
export const getAccountsSummary = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [recentConfirmedChallans, thisMonthChallans] = await Promise.all([
      prisma.salesChallan.findMany({
        where: { status: 'CONFIRMED' },
        orderBy: { confirmedAt: 'desc' },
        take: 10,
        include: {
          customer: { select: { id: true, name: true, businessName: true } },
          lineItems: { select: { quantity: true, unitPriceSnapshot: true } },
          creator: { select: { id: true, name: true, role: true } },
        },
      }),
      prisma.salesChallan.findMany({
        where: {
          status: 'CONFIRMED',
          confirmedAt: { gte: startOfMonth },
        },
        include: {
          lineItems: { select: { quantity: true, unitPriceSnapshot: true } },
        },
      }),
    ]);

    const revenueThisMonth = thisMonthChallans.reduce((total, challan) => {
      const challanTotal = challan.lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPriceSnapshot,
        0
      );
      return total + challanTotal;
    }, 0);

    const recentWithTotals = recentConfirmedChallans.map((c) => ({
      ...c,
      totalValue: c.lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPriceSnapshot,
        0
      ),
    }));

    return res.status(200).json({
      success: true,
      data: {
        recentConfirmedChallans: recentWithTotals,
        revenueThisMonth,
        challanCountThisMonth: thisMonthChallans.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
