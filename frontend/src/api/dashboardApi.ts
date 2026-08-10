import { useQuery } from '@tanstack/react-query';
import { axiosClient } from './axiosClient';

// ---- Types ----
export interface AdminStats {
  totalCustomers: number;
  customersByStatus: { status: string; count: number }[];
  totalProducts: number;
  lowStockCount: number;
  challansThisWeek: { date: string; count: number }[];
  recentAuditLogs: {
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    user: { id: string; name: string; role: string } | null;
  }[];
}

export interface SalesSummary {
  myLeads: {
    id: string;
    name: string;
    businessName: string;
    status: string;
    followUpDate: string | null;
    customerType: string;
    mobile: string;
  }[];
  overdueFollowUpCount: number;
  draftChallans: {
    id: string;
    challanNumber: string;
    totalQuantity: number;
    createdAt: string;
    customer: { id: string; name: string; businessName: string } | null;
    lineItems: { quantity: number; unitPriceSnapshot: number }[];
  }[];
  recentConfirmed: {
    id: string;
    challanNumber: string;
    confirmedAt: string | null;
    totalQuantity: number;
    customer: { id: string; name: string; businessName: string } | null;
    lineItems: { quantity: number; unitPriceSnapshot: number }[];
  }[];
}

export interface WarehouseSummary {
  lowStockProducts: {
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    minStockAlert: number;
    warehouseLocation: string;
    unitPrice: number;
  }[];
  recentMovements: {
    id: string;
    quantityChanged: number;
    movementType: 'IN' | 'OUT';
    reason: string;
    createdAt: string;
    product: { id: string; name: string; sku: string } | null;
    creator: { id: string; name: string; role: string } | null;
  }[];
  totalProducts: number;
}

export interface AccountsSummary {
  recentConfirmedChallans: {
    id: string;
    challanNumber: string;
    confirmedAt: string | null;
    totalQuantity: number;
    totalValue: number;
    customer: { id: string; name: string; businessName: string } | null;
    creator: { id: string; name: string; role: string } | null;
  }[];
  revenueThisMonth: number;
  challanCountThisMonth: number;
}

// ---- Hooks ----
export const useAdminStatsQuery = () =>
  useQuery<{ success: boolean; data: AdminStats }>({
    queryKey: ['dashboard-admin'],
    queryFn: () => axiosClient.get('/dashboard/stats').then((r) => r.data),
    staleTime: 60_000,
  });

export const useSalesSummaryQuery = () =>
  useQuery<{ success: boolean; data: SalesSummary }>({
    queryKey: ['dashboard-sales'],
    queryFn: () => axiosClient.get('/dashboard/sales-summary').then((r) => r.data),
    staleTime: 60_000,
  });

export const useWarehouseSummaryQuery = () =>
  useQuery<{ success: boolean; data: WarehouseSummary }>({
    queryKey: ['dashboard-warehouse'],
    queryFn: () => axiosClient.get('/dashboard/warehouse-summary').then((r) => r.data),
    staleTime: 60_000,
  });

export const useAccountsSummaryQuery = () =>
  useQuery<{ success: boolean; data: AccountsSummary }>({
    queryKey: ['dashboard-accounts'],
    queryFn: () => axiosClient.get('/dashboard/accounts-summary').then((r) => r.data),
    staleTime: 60_000,
  });
