import { Select, SelectOption } from '@/shared/components/ui/select'
import React, { memo, useCallback, useMemo } from 'react'
import { View } from 'react-native'
import { useEmployees } from '../hooks/use-employees'

export interface StaffSelectProps {
  value: string | null
  onChange: (staffId: string | null) => void
  className?: string
  /** Nếu truyền shiftId, chỉ hiển thị nhân viên trong ca đó. Không truyền = toàn bộ nhân viên */
  shiftId?: string
  triggerClassName?: string
  triggerTextClassName?: string
}

export const StaffSelect = memo(function StaffSelect({
  value,
  onChange,
  className,
  shiftId,
  triggerClassName,
  triggerTextClassName,
}: StaffSelectProps) {
  const { employees, isLoading } = useEmployees(shiftId)
  console.log('shiftId', shiftId)
  console.log('employees', employees)
  const options = useMemo(() => {
    const opts: SelectOption<string>[] = [{ label: 'Tất cả nhân viên', value: '' }]
    employees?.forEach((emp) => {
      opts.push({ label: emp.displayName, value: emp.id })
    })
    return opts
  }, [employees])

  const handleChange = useCallback(
    (val: string) => {
      onChange(val || null)
    },
    [onChange],
  )

  return (
    <View className={className}>
      <Select
        options={options}
        value={value ?? ''}
        onChange={handleChange}
        placeholder={isLoading ? 'Đang tải...' : 'Tất cả nhân viên'}
        disabled={isLoading}
        triggerClassName={triggerClassName}
        triggerTextClassName={triggerTextClassName}
      />
    </View>
  )
})
