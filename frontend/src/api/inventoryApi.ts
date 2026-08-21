import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from './axiosClient';
import { Product } from './productApi';
import { Location } from './locationApi';

export interface InventoryItem {
  id: string;
  productId: string;
  locationId: string;
  batchNumber: string;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  isLowStock: boolean;
  product: Product;
  location: Location;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryFilters {
  locationId?: string;
  productId?: string;
  search?: string;
}

export const useInventoryQuery = (filters?: InventoryFilters) => {
  return useQuery({
    queryKey: ['inventory', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.locationId) params.append('locationId', filters.locationId);
      if (filters?.productId) params.append('productId', filters.productId);
      if (filters?.search) params.append('search', filters.search);

      const response = await axiosClient.get(`/inventory?${params.toString()}`);
      return response.data;
    },
  });
};

export interface CreateInventoryPayload {
  productId: string;
  locationId: string;
  batchNumber?: string;
  physicalQuantity: number;
}

export const useCreateInventoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateInventoryPayload) => {
      const response = await axiosClient.post('/inventory', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

export interface AdjustInventoryPayload {
  inventoryId: string;
  quantityChanged: number;
  movementType: 'IN' | 'OUT';
  reason: string;
}

export const useAdjustInventoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AdjustInventoryPayload) => {
      const response = await axiosClient.post('/inventory/adjust', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};
