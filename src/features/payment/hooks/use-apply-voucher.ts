import NetInfo from '@react-native-community/netinfo'
import { useMutation } from '@tanstack/react-query'
import { verifyVoucher } from '../api'
import { VerifyVoucherPayload, VerifyVoucherResponse } from '../types'

export const useApplyVoucher = () => {
  return useMutation({
    mutationFn: async (payload: VerifyVoucherPayload): Promise<VerifyVoucherResponse> => {
      const state = await NetInfo.fetch()

      if (!state.isConnected) {
        throw new Error(
          'Bạn đang ngoại tuyến. Vui lòng kiểm tra kết nối mạng để áp dụng mã giảm giá.',
        )
      }

      return await verifyVoucher(payload)
    },
  })
}
