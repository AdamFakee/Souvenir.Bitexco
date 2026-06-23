import { useAppContext } from '@/shared/features/app'
import React, { memo, useCallback, useEffect } from 'react'
import { View } from 'react-native'
import { useOrderFilterStore } from '../store'
import { DateRangeFilter } from './order-date-filter'
import { OrderSearchInput } from './order-search-input'
import { StaffSelect } from './order-staff-select'

let lastEmployeeId: string | null = null

export const OrderFilterBar = memo(function OrderFilterBar() {
  const staffId = useOrderFilterStore((s) => s.staffId)
  const setStaffId = useOrderFilterStore((s) => s.setStaffId)
  const dateFrom = useOrderFilterStore((s) => s.dateFrom)
  const setDateFrom = useOrderFilterStore((s) => s.setDateFrom)
  const dateTo = useOrderFilterStore((s) => s.dateTo)
  const setDateTo = useOrderFilterStore((s) => s.setDateTo)
  const { employee, cashSessionId } = useAppContext()

  // Mặc định chọn nhân viên hiện tại một lần duy nhất hoặc khi đổi tài khoản
  useEffect(() => {
    if (employee?.id && lastEmployeeId !== employee.id) {
      setStaffId(employee.id)
      lastEmployeeId = employee.id
    }
  }, [employee?.id, setStaffId])

  const handleStaffChange = useCallback((id: string | null) => setStaffId(id), [setStaffId])

  return (
    <View className="mb-6 flex-row items-center gap-6">
      <OrderSearchInput />
      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />
      <StaffSelect value={staffId} onChange={handleStaffChange} className="w-72" />
    </View>
  )
})
