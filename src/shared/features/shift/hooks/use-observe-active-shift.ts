import { ShiftModel } from '@/shared/lib'
import { useEffect, useState } from 'react'
import { ShiftLocalAPI } from '../api/local/shift.local.api'

export const useObserveActiveShift = (shiftId?: string) => {
  const [shift, setShift] = useState<ShiftModel | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!shiftId) {
      setShift(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    let subscription: any

    // Lấy shift lần đầu
    ShiftLocalAPI.getShiftById(shiftId)
      .then((shiftRecord) => {
        // Đăng ký theo dõi sự thay đổi (realtime)
        subscription = shiftRecord.observe().subscribe((updatedShift) => {
          setShift(updatedShift)
          setIsLoading(false)
        })
      })
      .catch((error) => {
        console.error('Error observing shift:', error)
        setIsLoading(false)
      })

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe()
      }
    }
  }, [shiftId])

  return { shift, isLoading }
}
