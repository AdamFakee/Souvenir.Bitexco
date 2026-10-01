import { useState } from 'react'
import { DeviceManager } from '../device-manager'
import { EdcExecuteResult } from '../interfaces/edc.interface'
import { AppError } from '@/shared/errors/app-error'

/**
 * Hook gọn nhẹ điều phối gửi lệnh quẹt thẻ EDC
 * Sử dụng AppError chuẩn hóa hệ thống lỗi đa ngôn ngữ khi giao dịch bị từ chối
 */
export function useEdcCommand() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const [data, setData] = useState<EdcExecuteResult | null>(null)

  const executeCommand = async (command: string): Promise<EdcExecuteResult> => {
    setIsPending(true)
    setError(null)
    try {
      const res = await DeviceManager.executeEdcCommand(command)
      setData(res)
      if (!res.success) {
        throw new AppError({
          code: `HW_EDC_DECLINED_${res.data?.transInfo?.returnCode || 'UNKNOWN'}`,
          category: 'HARDWARE',
          i18nKey: 'errors.hardware.edc_execute_failed',
          userMessage: res.message,
          rawDetails: res.data,
        })
      }
      return res
    } catch (err: any) {
      const errorObj =
        err instanceof AppError
          ? err
          : new AppError({
              code: 'HW_EDC_EXECUTE_FAILED',
              category: 'HARDWARE',
              i18nKey: 'errors.hardware.edc_execute_failed',
              userMessage: err?.message || 'Giao dịch quẹt thẻ thất bại.',
              rawDetails: err,
            })
      setError(errorObj)
      throw errorObj
    } finally {
      setIsPending(false)
    }
  }

  return {
    executeCommand,
    isPending,
    error,
    data,
  }
}
