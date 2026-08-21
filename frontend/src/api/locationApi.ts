import { useQuery } from '@tanstack/react-query';
import { axiosClient } from './axiosClient';

export interface Location {
  id: string;
  code: string;
  name: string;
  address?: string;
  createdAt: string;
}

export const useLocationsQuery = () => {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await axiosClient.get('/locations');
      return response.data;
    },
  });
};
