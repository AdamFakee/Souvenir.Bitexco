import { HardwareBarcodeScanner } from '@/shared/components/common/hardware-barcode-scanner'
import { COLORS } from '@/shared/constants'
import { useCashSessionId } from '@/features/app'
import CheckoutPanel from '@/features/pos/components/checkout-panel'
import OrderListSession from '@/features/pos/components/order-list-session'
import { useScanLookup } from '@/features/pos/hooks/use-scan-lookup'
import { Store } from 'lucide-react-native'
import React from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function PosScreen() {
  const cashSessionId = useCashSessionId()
  const isShiftOpen = cashSessionId !== null
  const { handleScan } = useScanLookup()

  if (!isShiftOpen) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-200 p-6">
        <Store size={100} color={COLORS.primary.default} />
        <Text className="mt-4 text-[28px] font-bold text-surface-on">Chưa mở ca làm việc</Text>
        <Text className="mb-8 mt-2 max-w-md text-center text-[18px] text-surface-on-variant">
          Bạn cần mở ca làm việc và kiểm đếm tiền mặt đầu ca trước khi thực hiện bán hàng.
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <HardwareBarcodeScanner onScan={handleScan} />

      <View className="flex-1 flex-col gap-3" style={{ zIndex: 1 }}>
        <View
          className="flex-1 overflow-hidden rounded-[12px] bg-white"
          style={{
            shadowColor: '#A8A8A8',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <OrderListSession />
        </View>

        <CheckoutPanel />
      </View>
    </SafeAreaView>
  )
}
