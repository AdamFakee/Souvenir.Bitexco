import { useEmployee } from '@/features/app/hooks/use-app-context'
import React, { memo, useCallback, useEffect } from 'react'
import { View } from 'react-native'
import { useOrderFilterStore } from '../store'
import { DateRangeFilter } from './order-date-filter'
import { OrderSearchInput } from './order-search-input'
import { StaffSelect } from './order-staff-select'

let lastEmployeeId: string | null = null

export interface OrderFilterBarProps {
  showStaffFilter?: boolean
  hideFilters?: boolean
}

export const OrderFilterBar = memo(function OrderFilterBar({
  showStaffFilter = true,
  hideFilters = false,
}: OrderFilterBarProps) {
  const staffId = useOrderFilterStore((s) => s.staffId)
  const setStaffId = useOrderFilterStore((s) => s.setStaffId)
  const dateFrom = useOrderFilterStore((s) => s.dateFrom)
  const setDateFrom = useOrderFilterStore((s) => s.setDateFrom)
  const dateTo = useOrderFilterStore((s) => s.dateTo)
  const setDateTo = useOrderFilterStore((s) => s.setDateTo)
  const employee = useEmployee()

  // Mặc định chọn nhân viên hiện tại một lần duy nhất hoặc khi đổi tài khoản
  useEffect(() => {
    if (employee?.id && lastEmployeeId !== employee.id) {
      setStaffId(employee.id)
      lastEmployeeId = employee.id
    }
  }, [employee?.id, setStaffId])

  const handleStaffChange = useCallback((id: string | null) => setStaffId(id), [setStaffId])

  return (
    <View className="mb-4 flex-row items-center gap-3" style={{ zIndex: 100, elevation: 100 }}>
      <OrderSearchInput />
      {!hideFilters && (
        <>
          <DateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          {showStaffFilter && (
            <StaffSelect
              value={staffId}
              params={{ hasTransaction: true }}
              onChange={handleStaffChange}
              className="w-60"
              triggerClassName="h-[64px] rounded-xl"
              triggerTextClassName="text-[20px] font-bold text-surface-on"
            />
          )}
        </>
      )}
    </View>
  )
})
