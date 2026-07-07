import { SegmentedControl } from '@/shared/components/ui'
import { useAppContext } from '@/shared/features/app'
import React, { memo, useCallback, useEffect, useMemo } from 'react'
import { View } from 'react-native'
import { useOrderFilterStore } from '../store'
import { DateRangeFilter } from './order-date-filter'
import { OrderSearchInput } from './order-search-input'
import { StaffSelect } from './order-staff-select'

let lastEmployeeId: string | null = null

export interface OrderFilterBarProps {
  showStaffFilter?: boolean
}

export const OrderFilterBar = memo(function OrderFilterBar({
  showStaffFilter = true,
}: OrderFilterBarProps) {
  const staffId = useOrderFilterStore((s) => s.staffId)
  const setStaffId = useOrderFilterStore((s) => s.setStaffId)
  const dateFrom = useOrderFilterStore((s) => s.dateFrom)
  const setDateFrom = useOrderFilterStore((s) => s.setDateFrom)
  const dateTo = useOrderFilterStore((s) => s.dateTo)
  const setDateTo = useOrderFilterStore((s) => s.setDateTo)
  const status = useOrderFilterStore((s) => s.status)
  const setStatus = useOrderFilterStore((s) => s.setStatus)
  const { employee, cashSessionId } = useAppContext()

  // Mặc định chọn nhân viên hiện tại một lần duy nhất hoặc khi đổi tài khoản
  useEffect(() => {
    if (employee?.id && lastEmployeeId !== employee.id) {
      setStaffId(employee.id)
      lastEmployeeId = employee.id
    }
  }, [employee?.id, setStaffId])

  const handleStaffChange = useCallback((id: string | null) => setStaffId(id), [setStaffId])

  // Map store status state to active Segmented Control key
  const activeKey = useMemo(() => {
    if (status === null) return 'ALL'
    if (!Array.isArray(status)) return 'ALL'

    const completedStatuses = ['FULFILLED', 'CONFIRMED']
    if (
      status.length === completedStatuses.length &&
      status.every((s) => completedStatuses.includes(s))
    ) {
      return 'COMPLETED'
    }

    const returnedStatuses = ['RETURNED', 'REFUNDED', 'PARTIALLY_RETURNED', 'PARTIALLY_REFUNDED']
    if (
      status.length === returnedStatuses.length &&
      status.every((s) => returnedStatuses.includes(s))
    ) {
      return 'RETURNED'
    }

    return 'ALL'
  }, [status])

  const handleTabChange = useCallback(
    (key: 'COMPLETED' | 'RETURNED' | 'ALL') => {
      if (key === 'COMPLETED') {
        setStatus(['FULFILLED', 'CONFIRMED'])
      } else if (key === 'RETURNED') {
        setStatus(['RETURNED', 'REFUNDED', 'PARTIALLY_RETURNED', 'PARTIALLY_REFUNDED'])
      } else {
        setStatus(null)
      }
    },
    [setStatus],
  )

  return (
    <View className="mb-6 flex-row items-center gap-6">
      <SegmentedControl
        options={[
          { label: 'Hoàn thành', value: 'COMPLETED' as const },
          { label: 'Hoàn hàng', value: 'RETURNED' as const },
          { label: 'Tất cả', value: 'ALL' as const },
        ]}
        value={activeKey}
        onChange={handleTabChange}
        className="h-full w-96"
      />
      <OrderSearchInput />
      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />
      {showStaffFilter && (
        <StaffSelect value={staffId} onChange={handleStaffChange} className="w-48" />
      )}
    </View>
  )
})
