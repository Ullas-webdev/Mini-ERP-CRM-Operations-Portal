import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from './axiosClient';
import { Product } from './productApi';
import { Location } from './locationApi';
import { Customer } from './customerApi';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPriceSnapshot: number;
  product: Product;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  locationId: string;
  status: 'PENDING' | 'RESERVED' | 'FULFILLED' | 'CANCELLED';
  totalAmount: number;
  customer: Customer;
  location: Location;
  items: OrderItem[];
  creator: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOrderFilters {
  customerId?: string;
  status?: string;
  locationId?: string;
}

export const useCustomerOrdersQuery = (filters?: CustomerOrderFilters) => {
  return useQuery({
    queryKey: ['customer-orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.customerId) params.append('customerId', filters.customerId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.locationId) params.append('locationId', filters.locationId);

      const response = await axiosClient.get(`/customer-orders?${params.toString()}`);
      return response.data;
    },
  });
};

export interface CreateCustomerOrderPayload {
  customerId: string;
  locationId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export const useCreateCustomerOrderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCustomerOrderPayload) => {
      const response = await axiosClient.post('/customer-orders', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};
