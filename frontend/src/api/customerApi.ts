import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from './axiosClient';
import toast from 'react-hot-toast';

export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string | null;
  customerType: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; name: string; email: string };
  _count?: { notes: number; salesChallans?: number };
}

export interface CustomerNote {
  id: string;
  customerId: string;
  authorId: string;
  note: string;
  createdAt: string;
  author: { id: string; name: string; email: string; role: string };
}

export interface CustomersFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customerType?: string;
}

export interface CustomersResponse {
  success: boolean;
  data: {
    customers: Customer[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  };
}

export interface CustomerDetailResponse { success: boolean; data: Customer; }
export interface CustomerNotesResponse { success: boolean; data: CustomerNote[]; }

export interface CreateCustomerPayload {
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber?: string | null;
  customerType: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate?: string | null;
}

export const fetchCustomers = async (filters: CustomersFilters): Promise<CustomersResponse> => {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);
  if (filters.customerType) params.append('customerType', filters.customerType);
  const response = await axiosClient.get<CustomersResponse>(`/customers?${params.toString()}`);
  return response.data;
};

export const useCustomersQuery = (filters: CustomersFilters) =>
  useQuery({ queryKey: ['customers', filters], queryFn: () => fetchCustomers(filters) });

export const fetchCustomerById = async (id: string): Promise<CustomerDetailResponse> => {
  const response = await axiosClient.get<CustomerDetailResponse>(`/customers/${id}`);
  return response.data;
};

export const useCustomerDetailQuery = (id: string | null) =>
  useQuery({ queryKey: ['customer', id], queryFn: () => fetchCustomerById(id!), enabled: !!id });

export const fetchCustomerNotes = async (id: string): Promise<CustomerNotesResponse> => {
  const response = await axiosClient.get<CustomerNotesResponse>(`/customers/${id}/notes`);
  return response.data;
};

export const useCustomerNotesQuery = (id: string | null) =>
  useQuery({ queryKey: ['customer-notes', id], queryFn: () => fetchCustomerNotes(id!), enabled: !!id });

export const useCreateCustomerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) => axiosClient.post('/customers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('✅ Customer created successfully!');
    },
    onError: (err: any) => {
      toast.error(`❌ ${err?.response?.data?.error?.message || 'Failed to create customer'}`);
    },
  });
};

export const useUpdateCustomerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateCustomerPayload> }) =>
      axiosClient.patch(`/customers/${id}`, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', variables.id] });
      toast.success('✅ Customer updated successfully!');
    },
    onError: (err: any) => {
      toast.error(`❌ ${err?.response?.data?.error?.message || 'Failed to update customer'}`);
    },
  });
};

export const useAddCustomerNoteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, note }: { customerId: string; note: string }) =>
      axiosClient.post(`/customers/${customerId}/notes`, { note }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-notes', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('📝 Note posted to activity timeline!');
    },
    onError: (err: any) => {
      toast.error(`❌ ${err?.response?.data?.error?.message || 'Failed to post note'}`);
    },
  });
};
