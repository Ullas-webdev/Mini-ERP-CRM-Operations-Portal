import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from './axiosClient';
import toast from 'react-hot-toast';

export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface ChallanLineItem {
  id: string;
  challanId: string;
  productId: string;
  quantity: number;
  unitPriceSnapshot: number;
  productNameSnapshot: string;
  createdAt: string;
  product?: { id: string; sku: string; currentStock: number; minStockAlert: number };
}

export interface SalesChallan {
  id: string;
  challanNumber: string;
  customerId: string;
  status: ChallanStatus;
  totalQuantity: number;
  confirmedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; businessName: string; mobile: string; email: string };
  creator?: { id: string; name: string; email: string; role: string };
  lineItems?: ChallanLineItem[];
}

export interface ChallansFilters {
  page?: number;
  limit?: number;
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface ChallansResponse {
  success: boolean;
  data: {
    challans: SalesChallan[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  };
}

export interface ChallanDetailResponse { success: boolean; data: SalesChallan; }

export interface CreateChallanPayload {
  customerId: string;
  lineItems: Array<{ productId: string; quantity: number }>;
}

export interface StockShortageItem {
  productId: string;
  productName: string;
  sku: string;
  availableStock: number;
  requestedQuantity: number;
  shortage: number;
}

export const fetchChallans = async (filters: ChallansFilters): Promise<ChallansResponse> => {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.status) params.append('status', filters.status);
  if (filters.customerId) params.append('customerId', filters.customerId);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.search) params.append('search', filters.search);
  const response = await axiosClient.get<ChallansResponse>(`/challans?${params.toString()}`);
  return response.data;
};

export const useChallansQuery = (filters: ChallansFilters) =>
  useQuery({ queryKey: ['challans', filters], queryFn: () => fetchChallans(filters) });

export const fetchChallanById = async (id: string): Promise<ChallanDetailResponse> => {
  const response = await axiosClient.get<ChallanDetailResponse>(`/challans/${id}`);
  return response.data;
};

export const useChallanDetailQuery = (id: string | null) =>
  useQuery({ queryKey: ['challan', id], queryFn: () => fetchChallanById(id!), enabled: !!id });

export const useCreateChallanMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateChallanPayload) => axiosClient.post('/challans', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-sales'] });
      toast.success('🧾 Draft challan created!');
    },
    onError: (err: any) => {
      toast.error(`❌ ${err?.response?.data?.error?.message || 'Failed to create challan'}`);
    },
  });
};

export const useUpdateChallanMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateChallanPayload> }) =>
      axiosClient.patch(`/challans/${id}`, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['challan', variables.id] });
      toast.success('✅ Challan updated!');
    },
    onError: (err: any) => {
      toast.error(`❌ ${err?.response?.data?.error?.message || 'Failed to update challan'}`);
    },
  });
};

export const useConfirmChallanMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axiosClient.post(`/challans/${id}/confirm`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['challan', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['products-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['product-movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-warehouse'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-accounts'] });
      toast.success('✅ Challan confirmed & stock fulfilled!');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message;
      toast.error(`❌ ${msg || 'Confirmation failed — check stock levels'}`);
    },
  });
};

export const useCancelChallanMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axiosClient.post(`/challans/${id}/cancel`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['challan', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['products-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['product-movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-warehouse'] });
      toast.success('🚫 Challan cancelled. Stock reversed.');
    },
    onError: (err: any) => {
      toast.error(`❌ ${err?.response?.data?.error?.message || 'Failed to cancel challan'}`);
    },
  });
};
