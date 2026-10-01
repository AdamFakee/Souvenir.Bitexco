import { useEffect } from 'react'
import { useTerminalConfig } from './use-app-context'
import { useConnectionStore } from '@/core/hardware'
import { seconds } from '@/shared/utils'

/**
 * Hook ở Tầng Feature (Layer 3) điều phối kết nối EDC POS:
 * 1. Đọc terminalConfig từ App Context (Layer 3).
 * 2. Gọi checkPosConnection(terminalConfig) xuống Core Store (Layer 2) khi mount & định kỳ mỗi 30s.
 */
export function useEdcConnection() {
  const terminalConfig = useTerminalConfig()

  useEffect(() => {
    if (!terminalConfig) return

    // 1. Kiểm tra ban đầu khi nạp xong terminalConfig
    useConnectionStore.getState().checkPosConnection(terminalConfig)

    // 2. Lập lịch kiểm tra định kỳ mỗi 30 giây
    const intervalId = setInterval(() => {
      useConnectionStore.getState().checkPosConnection(terminalConfig)
    }, seconds(30))

    return () => {
      clearInterval(intervalId)
    }
  }, [terminalConfig])
}
