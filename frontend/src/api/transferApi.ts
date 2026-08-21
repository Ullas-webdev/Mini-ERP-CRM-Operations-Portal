import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from './axiosClient';
import { Product } from './productApi';
import { Location } from './locationApi';

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceLocationId: string;
  destinationLocationId: string;
  productId: string;
  quantity: number;
  status: 'REQUESTED' | 'DISPATCHED' | 'RECEIVED';
  dispatchedAt?: string;
  receivedAt?: string;
  sourceLocation: Location;
  destinationLocation: Location;
  product: Product;
  creator: { id: string; name: string; email: string };
  dispatcher?: { id: string; name: string; email: string };
  receiver?: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface TransferFilters {
  status?: string;
  sourceLocationId?: string;
  destinationLocationId?: string;
}

export const useTransfersQuery = (filters?: TransferFilters) => {
  return useQuery({
    queryKey: ['transfers', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.sourceLocationId) params.append('sourceLocationId', filters.sourceLocationId);
      if (filters?.destinationLocationId) params.append('destinationLocationId', filters.destinationLocationId);

      const response = await axiosClient.get(`/transfers?${params.toString()}`);
      return response.data;
    },
  });
};

export interface CreateTransferPayload {
  sourceLocationId: string;
  destinationLocationId: string;
  productId: string;
  quantity: number;
}

export const useCreateTransferMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTransferPayload) => {
      const response = await axiosClient.post('/transfers', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
  });
};

export const useDispatchTransferMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transferId: string) => {
      const response = await axiosClient.post(`/transfers/${transferId}/dispatch`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

export const useReceiveTransferMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transferId: string) => {
      const response = await axiosClient.post(`/transfers/${transferId}/receive`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};
