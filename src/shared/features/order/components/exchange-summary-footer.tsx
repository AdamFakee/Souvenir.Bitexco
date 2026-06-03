import { Button } from '@/shared/components/ui'
import { formatCurrency } from '@/shared/utils'
import React, { memo } from 'react'
import { Text, View } from 'react-native'

interface ExchangeSummaryFooterProps {
  returnedValue: number
  replacementSubtotal: number
  replacementVat: number
  differenceAmount: number
  isOriginalOrderVoucherApplied: boolean
  canSubmit: boolean
  isProcessing: boolean
  processingText: string
  onClose: () => void
  onConfirm: () => void
}

export const ExchangeSummaryFooter = memo(function ExchangeSummaryFooter({
  returnedValue,
  replacementSubtotal,
  replacementVat,
  differenceAmount,
  isOriginalOrderVoucherApplied,
  canSubmit,
  isProcessing,
  processingText,
  onClose,
  onConfirm,
}: ExchangeSummaryFooterProps) {
  return (
    <View className="border-t border-outline-variant bg-white px-8 py-5">
      <View className="mb-5 gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-muted">Hàng trả</Text>
          <Text className="text-lg font-black text-error" numberOfLines={1}>
            {formatCurrency(returnedValue)}
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-muted">Hàng mới</Text>
          <Text className="text-lg font-black text-primary" numberOfLines={1}>
            {formatCurrency(replacementSubtotal)}
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-muted">VAT hàng mới</Text>
          <Text className="text-lg font-black text-primary" numberOfLines={1}>
            {formatCurrency(replacementVat)}
          </Text>
        </View>

        <View className="flex-row items-center justify-between border-t border-dashed border-outline-variant pt-3">
          <Text className="text-xl font-black uppercase tracking-tighter text-surface-on">
            Cần thu
          </Text>
          <Text
            className={`text-4xl font-black ${differenceAmount < 0 ? 'text-error' : 'text-primary'}`}
            numberOfLines={1}
          >
            {formatCurrency(Math.max(0, differenceAmount))}
          </Text>
        </View>

        {isOriginalOrderVoucherApplied && (
          <Text className="rounded-2xl bg-error-container px-5 py-3 text-sm font-black text-error">
            Đơn hàng có voucher/khuyến mãi nên không được đổi hàng.
          </Text>
        )}

        {differenceAmount < 0 && (
          <Text className="rounded-2xl bg-error-container px-5 py-3 text-xl font-black text-error">
            Giá trị hàng mới phải lớn hơn hoặc bằng giá trị hàng trả.
          </Text>
        )}
      </View>

      <View className="flex-row gap-4">
        <Button
          label="Hủy bỏ"
          variant="outline"
          className="h-16 flex-1 rounded-2xl"
          textClassName="text-lg font-black"
          onPress={onClose}
          disabled={isProcessing}
        />
        <Button
          label={isProcessing ? processingText : 'XÁC NHẬN ĐỔI HÀNG'}
          className="h-16 flex-[1.4] rounded-2xl"
          textClassName="text-xl font-black"
          onPress={onConfirm}
          loading={isProcessing}
          disabled={!canSubmit || isProcessing}
        />
      </View>
    </View>
  )
})
