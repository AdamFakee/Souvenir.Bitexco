import { useAppContext } from '@/shared/features/app'
import { EmployeeItem, StaffRemoteAPI } from '@/shared/features/auth/api/remote'
import { useIsFocused } from '@react-navigation/native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

/**
 * Hook lấy danh sách nhân viên.
 * - Không shiftId: GET /v1/pos/employees → toàn bộ nhân viên
 * - Có shiftId:    GET /v1/pos/employees?shiftId=xxx → nhân viên trong ca
 */
export const useEmployees = (shiftId?: string) => {
  const { employee } = useAppContext()
  const queryClient = useQueryClient()
  const isFocused = useIsFocused()

  const query = useQuery<EmployeeItem[]>({
    queryKey: shiftId ? ['employees', 'shift', shiftId] : ['employees', 'store'],
    queryFn: async () => {
      const res = await StaffRemoteAPI.getEmployees(shiftId)
      return res?.data || (Array.isArray(res) ? res : [])
    },
    staleTime: 5 * 60 * 1000,
    networkMode: 'always',
  })

  // Gọi lại API khi chuyển sang tab chứa component này
  useEffect(() => {
    if (isFocused) {
      console.log(
        `[useEmployees] Screen focused, triggering employee list refetch. shiftId:`,
        shiftId,
      )
      query.refetch()
    }
  }, [isFocused, query.refetch])

  // Chỉ invalidate khi đổi NV thật — không storm mỗi mount dashboard/orders
  const lastEmpRef = useRef<string | null>(null)
  useEffect(() => {
    if (!employee?.id) return
    if (lastEmpRef.current === employee.id) return
    if (lastEmpRef.current != null) {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    }
    lastEmpRef.current = employee.id
  }, [employee?.id, queryClient])

  return {
    employees: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
