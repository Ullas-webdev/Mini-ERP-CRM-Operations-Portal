import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from './axiosClient';
import { Product } from './productApi';
import { Location } from './locationApi';

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  locationId: string;
  productId: string;
  requiredQuantity: number;
  availableQuantityAtLocation: number;
  shortage: number;
  assignedUserId: string;
  createdById: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  location: Location;
  product: Product;
  assignedUser: { id: string; name: string; email: string; role: string };
  creator: { id: string; name: string; email: string; role: string };
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderFilters {
  locationId?: string;
  status?: string;
  assignedUserId?: string;
}

export const useWorkOrdersQuery = (filters?: WorkOrderFilters) => {
  return useQuery({
    queryKey: ['work-orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.locationId) params.append('locationId', filters.locationId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.assignedUserId) params.append('assignedUserId', filters.assignedUserId);

      const response = await axiosClient.get(`/work-orders?${params.toString()}`);
      return response.data;
    },
  });
};

export interface CreateWorkOrderPayload {
  locationId: string;
  productId: string;
  requiredQuantity: number;
  assignedUserId: string;
}

export const useCreateWorkOrderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateWorkOrderPayload) => {
      const response = await axiosClient.post('/work-orders', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });
};

export interface UpdateWorkOrderStatusPayload {
  id: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
}

export const useUpdateWorkOrderStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: UpdateWorkOrderStatusPayload) => {
      const response = await axiosClient.patch(`/work-orders/${id}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });
};
