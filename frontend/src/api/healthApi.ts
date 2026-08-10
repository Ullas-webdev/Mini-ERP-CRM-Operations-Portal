import { useQuery } from '@tanstack/react-query';
import { axiosClient } from './axiosClient';

export interface HealthResponse {
  success: boolean;
  data: {
    status: string;
    timestamp: string;
    uptime: number;
    database: string;
    environment: string;
    memoryUsage?: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
  };
}

export const fetchHealthStatus = async (): Promise<HealthResponse> => {
  const response = await axiosClient.get<HealthResponse>('/health');
  return response.data;
};

export const useHealthQuery = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: fetchHealthStatus,
    refetchInterval: 10000, // Auto-refresh health every 10 seconds
  });
};
