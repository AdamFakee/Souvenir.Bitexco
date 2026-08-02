import { useEmployee } from '@/shared/features/app'
import { EmployeeItem, StaffRemoteAPI } from '@/shared/features/auth/api/remote'
import { useIsFocused } from '@react-navigation/native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

export interface UseEmployeesParams {
  shiftId?: string
  status?: string
  isPos?: boolean
  hasTransaction?: boolean
}

/**
 * Hook lay danh sach nhan vien.
 * - Co the nhan shiftId (string) hoac bo loc params (UseEmployeesParams)
 */
export const useEmployees = (paramsOrShiftId?: string | UseEmployeesParams) => {
  const employee = useEmployee()
  const queryClient = useQueryClient()
  const isFocused = useIsFocused()

  const params =
    typeof paramsOrShiftId === 'string' ? { shiftId: paramsOrShiftId } : paramsOrShiftId
  const paramsKey = JSON.stringify(params || {})

  const query = useQuery<EmployeeItem[]>({
    queryKey: ['employees', paramsKey],
    queryFn: async () => {
      const res = await StaffRemoteAPI.getEmployees(params)
      return res?.data || (Array.isArray(res) ? res : [])
    },
    staleTime: 5 * 60 * 1000,
    networkMode: 'always',
  })

  // Goi lai API khi chuyen sang tab chua component nay
  useEffect(() => {
    if (isFocused) {
      console.log(
        `[useEmployees] Screen focused, triggering employee list refetch. params:`,
        paramsKey,
      )
      query.refetch()
    }
  }, [isFocused, query.refetch, paramsKey])

  // Chi invalidate khi doi NV that - khong storm moi mount dashboard/orders
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
