import { useQuery } from '@tanstack/react-query'
import { CategoryLocalAPI } from '../api'

export const useCategories = () => {
  const query = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      return await CategoryLocalAPI.getAllCategories()
    },
    retry: 1,
    staleTime: 1000 * 60 * 5,
  })

  return {
    categories: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
