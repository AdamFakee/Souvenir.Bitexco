import { COLORS } from '@/shared/constants'
import { Button } from '@/shared/components/ui'
import { formatCurrency } from '@/shared/utils'
import React, { memo } from 'react'
import { Text, View } from 'react-native'

interface ExchangeSummaryFooterProps {
  returnedValue: number
  replacementSubtotal: number
  replacementVat: number
  differenceAmount: number
  selectedReturnCount: number
  replacementCount: number
  isOriginalOrderVoucherApplied: boolean
  canSubmit: boolean
  isProcessing: boolean
  onClose: () => void
  onConfirmEqual: () => void
}

export const ExchangeSummaryFooter = memo(function ExchangeSummaryFooter({
  returnedValue,
  replacementSubtotal,
  replacementVat,
  differenceAmount,
  selectedReturnCount,
  replacementCount,
  isOriginalOrderVoucherApplied,
  canSubmit,
  isProcessing,
  onClose,
  onConfirmEqual,
}: ExchangeSummaryFooterProps) {
  const isEqual = differenceAmount === 0 && selectedReturnCount > 0 && replacementCount > 0

  const blockReasons: string[] = []
  if (isOriginalOrderVoucherApplied) {
    blockReasons.push('Đơn có voucher/KM — không đổi được')
  } else {
    if (selectedReturnCount <= 0) blockReasons.push('Chọn ít nhất 1 món khách trả')
    if (replacementCount <= 0) blockReasons.push('Thêm ít nhất 1 món đổi mới')
    if (selectedReturnCount > 0 && replacementCount > 0 && differenceAmount !== 0) {
      blockReasons.push('Chỉ hỗ trợ đổi sản phẩm có cùng giá với sản phẩm gốc')
    }
  }

  return (
    <View className="border-t border-surface-200 bg-white px-6 py-[18px]">
      <View className="gap-2">
        <SummaryRow
          label="Hàng trả"
          value={formatCurrency(returnedValue)}
          valueColor={COLORS.error.default}
        />
        <SummaryRow
          label="Hàng mới"
          value={formatCurrency(replacementSubtotal)}
          valueColor={COLORS.primary.default}
        />
        <SummaryRow
          label="VAT hàng mới"
          value={formatCurrency(replacementVat)}
          valueColor={COLORS.primary.default}
        />

        <View className="mt-2.5 border-t border-surface-200 pt-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-[19px] font-bold uppercase tracking-tight text-surface-on">
              Chênh lệch
            </Text>
            <Text
              className="text-[27px] font-bold"
              style={{ color: isEqual ? COLORS.primary.default : COLORS.error.default }}
              numberOfLines={1}
            >
              {formatCurrency(differenceAmount)}
            </Text>
          </View>
        </View>
      </View>

      {blockReasons.length > 0 && (
        <View className="mt-[15px] rounded-xl bg-error/10 px-3.5 py-2.5">
          {blockReasons.map((r) => (
            <Text key={r} className="text-[16px] font-bold text-error">
              • {r}
            </Text>
          ))}
        </View>
      )}

      <View className="mt-[15px] gap-2.5">
        <Button
          label={isProcessing ? 'Đang xử lý…' : 'Xác nhận đổi hàng'}
          variant="primary"
          className="h-[68px] min-h-[68px] w-full rounded-xl"
          textClassName="text-[19px] font-bold"
          onPress={onConfirmEqual}
          loading={isProcessing}
          disabled={!canSubmit || isProcessing || !isEqual}
        />
        <Button
          label="Hủy bỏ"
          variant="outline"
          className="h-[54px] min-h-[54px] w-full rounded-xl"
          textClassName="text-[17px] font-bold"
          onPress={onClose}
          disabled={isProcessing}
        />
      </View>
    </View>
  )
})

function SummaryRow({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-[16px] font-bold text-surface-on-variant">{label}</Text>
      <Text
        className="text-[16px] font-bold"
        style={{ color: valueColor || COLORS.surface.on }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  )
}
