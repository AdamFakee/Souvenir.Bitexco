import { Shimmer } from '@/shared/components/ui'
import { formatCurrency } from '@/shared/utils'
import React, { memo } from 'react'
import { Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { useViceStore } from '../vice-store'

const QRCODE_SIZE = 300

function VicePaymentScreen() {
  const qrCodeUrl = useViceStore((state) => state.qrCodeUrl)
  const total = useViceStore((state) => state.total)

  return (
    <View className="flex-1 items-center justify-center bg-background p-6">
      {/* Pop-up Card căn giữa dạng Dọc siêu tinh tế & gọn gàng */}
      <View
        style={{ width: 400 }}
        className="items-center rounded-[28px] border border-surface-200 bg-white p-6 shadow-xl"
      >
        {/* Phần 1: Khung QR Code đặt ở trên cùng */}
        <View className="mb-4 items-center justify-center rounded-[20px] border border-surface-200 bg-white p-4 shadow-sm">
          {qrCodeUrl ? (
            <QRCode value={qrCodeUrl} size={QRCODE_SIZE} color="black" backgroundColor="white" />
          ) : (
            <Shimmer className={`h-[${QRCODE_SIZE}px] w-[${QRCODE_SIZE}px] rounded-[12px]`} />
          )}
        </View>

        {/* Đường gạch phân cách mỏng */}
        <View className="my-4 w-full border-b border-surface-100" />

        {/* Phần 2: Số tiền cần thanh toán */}
        <View className="flex-row items-center" style={{ width: QRCODE_SIZE }}>
          <Text className="h-6 w-1/2 text-start font-sans text-3xl font-bold text-surface-on-variant">
            Tổng thanh toán:
          </Text>
          <Text className={`h-6 w-1/2 text-right font-sans text-3xl  font-black text-primary`}>
            {formatCurrency(total)}
          </Text>
        </View>
      </View>
    </View>
  )
}

export default memo(VicePaymentScreen)
