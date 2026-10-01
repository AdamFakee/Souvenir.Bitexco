import { useEffect, useState } from 'react'
import { DeviceManager } from '../device-manager'
import { TerminalConfig } from '../drivers/ingenico-edc.driver'

/**
 * Hook kiểm tra trạng thái kết nối thiết bị quẹt thẻ EDC
 * Dùng để bật/tắt (Enable/Disable) nút bấm Thanh toán Thẻ trên màn hình POS
 */
export function useEdcStatus(terminalConfig?: TerminalConfig) {
  const [isEdcConnected, setIsEdcConnected] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  const checkEdcConnection = async () => {
    if (
      !terminalConfig ||
      !terminalConfig.posUrl ||
      !terminalConfig.merchantName ||
      !terminalConfig.cashierId ||
      !terminalConfig.license
    ) {
      setIsEdcConnected(false)
      setIsChecking(false)
      return
    }

    setIsChecking(true)
    try {
      await DeviceManager.connectEdc(terminalConfig)
      setIsEdcConnected(true)
    } catch (error) {
      console.warn('[Hardware] Máy EDC chưa sẵn sàng:', error)
      setIsEdcConnected(false)
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkEdcConnection()
  }, [terminalConfig?.posUrl])

  return {
    isEdcConnected,
    isChecking,
    checkEdcConnection,
  }
}
