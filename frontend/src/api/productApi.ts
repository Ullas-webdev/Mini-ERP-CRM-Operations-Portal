import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from './axiosClient';
import toast from 'react-hot-toast';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  warehouseLocation: string;
  createdAt: string;
  updatedAt: string;
  _count?: { stockMovements: number };
}

export interface StockMovement {
  id: string;
  productId: string;
  quantityChanged: number;
  movementType: 'IN' | 'OUT';
  reason: string;
  createdBy: string;
  createdAt: string;
  creator: { id: string; name: string; email: string; role: string };
}

export interface ProductsFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  lowStock?: boolean;
}

export interface ProductsResponse {
  success: boolean;
  data: {
    products: Product[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  };
}

export interface ProductDetailResponse { success: boolean; data: Product; }

export interface MovementsResponse {
  success: boolean;
  data: {
    movements: StockMovement[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  };
}

export interface CreateProductPayload {
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  warehouseLocation: string;
}

export interface StockAdjustmentPayload {
  quantity: number;
  movementType: 'IN' | 'OUT';
  reason: string;
}

export const fetchProducts = async (filters: ProductsFilters): Promise<ProductsResponse> => {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.search) params.append('search', filters.search);
  if (filters.category) params.append('category', filters.category);
  if (filters.lowStock) params.append('lowStock', 'true');
  const response = await axiosClient.get<ProductsResponse>(`/products?${params.toString()}`);
  return response.data;
};

export const useProductsQuery = (filters: ProductsFilters) =>
  useQuery({ queryKey: ['products', filters], queryFn: () => fetchProducts(filters) });

export const fetchLowStockProducts = async (): Promise<{ success: boolean; data: Product[] }> => {
  const response = await axiosClient.get('/products/low-stock');
  return response.data;
};

export const useLowStockProductsQuery = () =>
  useQuery({ queryKey: ['products-low-stock'], queryFn: fetchLowStockProducts });

export const fetchProductById = async (id: string): Promise<ProductDetailResponse> => {
  const response = await axiosClient.get<ProductDetailResponse>(`/products/${id}`);
  return response.data;
};

export const useProductDetailQuery = (id: string | null) =>
  useQuery({ queryKey: ['product', id], queryFn: () => fetchProductById(id!), enabled: !!id });

export const fetchProductMovements = async (id: string, page = 1): Promise<MovementsResponse> => {
  const response = await axiosClient.get<MovementsResponse>(`/products/${id}/movements?page=${page}&limit=10`);
  return response.data;
};

export const useProductMovementsQuery = (id: string | null, page = 1) =>
  useQuery({
    queryKey: ['product-movements', id, page],
    queryFn: () => fetchProductMovements(id!, page),
    enabled: !!id,
    staleTime: 0,
    gcTime: 0,
  });

export const useCreateProductMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => axiosClient.post('/products', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-low-stock'] });
      toast.success('📦 Product added to inventory!');
    },
    onError: (err: any) => {
      toast.error(`❌ ${err?.response?.data?.error?.message || 'Failed to create product'}`);
    },
  });
};

export const useUpdateProductMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateProductPayload> }) =>
      axiosClient.patch(`/products/${id}`, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['products-low-stock'] });
      toast.success('✅ Product details updated!');
    },
    onError: (err: any) => {
      toast.error(`❌ ${err?.response?.data?.error?.message || 'Failed to update product'}`);
    },
  });
};

export const useAdjustStockMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: StockAdjustmentPayload }) =>
      axiosClient.post(`/products/${id}/stock-adjustment`, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['product-movements', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['products-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-warehouse'] });
      toast.success(`📊 Stock ${variables.payload.movementType === 'IN' ? 'added' : 'deducted'} successfully!`);
    },
    onError: (err: any) => {
      toast.error(`❌ ${err?.response?.data?.error?.message || 'Stock adjustment failed'}`);
    },
  });
};
