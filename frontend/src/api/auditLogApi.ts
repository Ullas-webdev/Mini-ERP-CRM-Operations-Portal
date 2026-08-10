import { useQuery } from '@tanstack/react-query';
import { axiosClient } from './axiosClient';

export interface AuditLogItem {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeState: string | null;
  afterState: string | null;
  ipAddress: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export interface AuditLogsResponse {
  success: boolean;
  data: {
    logs: AuditLogItem[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}

export const fetchAuditLogs = async (filters: AuditLogFilters): Promise<AuditLogsResponse> => {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.action) params.append('action', filters.action);
  if (filters.entityType) params.append('entityType', filters.entityType);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const response = await axiosClient.get<AuditLogsResponse>(`/audit-logs?${params.toString()}`);
  return response.data;
};

export const useAuditLogsQuery = (filters: AuditLogFilters) => {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => fetchAuditLogs(filters),
  });
};
