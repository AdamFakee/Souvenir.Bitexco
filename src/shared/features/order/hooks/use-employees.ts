import { useAppContext } from '@/shared/features/app'
import { EmployeeItem, StaffRemoteAPI } from '@/shared/features/auth/api/remote'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

/**
 * Hook lấy danh sách nhân viên.
 * - Không shiftId: GET /v1/pos/employees → toàn bộ nhân viên
 * - Có shiftId:    GET /v1/pos/employees?shiftId=xxx → nhân viên trong ca
 */
export const useEmployees = (shiftId?: string) => {
  const { employee } = useAppContext()
  const queryClient = useQueryClient()

  const query = useQuery<EmployeeItem[]>({
    queryKey: shiftId ? ['employees', 'shift', shiftId] : ['employees', 'store'],
    queryFn: async () => {
      const res = await StaffRemoteAPI.getEmployees(shiftId)
      return res?.data || (Array.isArray(res) ? res : [])
    },
    staleTime: 5 * 60 * 1000,
    networkMode: 'always',
  })

  // Khi đăng nhập lại/đổi nhân vật, tự động xóa cache và tải lại danh sách nhân viên mới
  useEffect(() => {
    if (employee?.id) {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    }
  }, [employee?.id, queryClient])

  return {
    employees: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
