import { Button } from '@/shared/components/ui'
import { formatCurrency } from '@/shared/utils'
import React, { memo } from 'react'
import { Text, View } from 'react-native'

const BORDER = '#DFE0E1'
const TEXT_PRIMARY = '#303036'
const TEXT_MUTED = '#747475'
const BRAND = '#1C4E68'
const ERROR = '#DC2626'

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
    <View
      className="px-6 py-5"
      style={{ borderTopWidth: 1, borderColor: BORDER, backgroundColor: '#fff' }}
    >
      <View className="mb-5" style={{ gap: 6 }}>
        <SummaryRow label="Hàng trả" value={formatCurrency(returnedValue)} valueColor={ERROR} />
        <SummaryRow
          label="Hàng mới"
          value={formatCurrency(replacementSubtotal)}
          valueColor={BRAND}
        />
        <SummaryRow
          label="VAT hàng mới"
          value={formatCurrency(replacementVat)}
          valueColor={BRAND}
        />

        <View className="mt-2" style={{ borderTopWidth: 1, borderColor: BORDER, paddingTop: 12 }}>
          <View className="flex-row items-center justify-between">
            <Text
              className="text-xl font-extrabold uppercase tracking-tight"
              style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
            >
              Cần thu
            </Text>
            <Text
              className="text-3xl font-extrabold"
              style={{ color: differenceAmount < 0 ? ERROR : BRAND, fontFamily: 'Manrope-Bold' }}
              numberOfLines={1}
            >
              {formatCurrency(Math.max(0, differenceAmount))}
            </Text>
          </View>
        </View>

        {isOriginalOrderVoucherApplied && (
          <View
            className="mt-3 rounded-xl px-4 py-3"
            style={{ backgroundColor: 'rgba(220,38,38,0.1)' }}
          >
            <Text
              className="text-sm font-extrabold"
              style={{ color: ERROR, fontFamily: 'Manrope-Bold' }}
            >
              Đơn hàng có voucher/khuyến mãi nên không được đổi hàng.
            </Text>
          </View>
        )}

        {differenceAmount < 0 && (
          <View
            className="mt-3 rounded-xl px-4 py-3"
            style={{ backgroundColor: 'rgba(220,38,38,0.1)' }}
          >
            <Text
              className="text-base font-extrabold"
              style={{ color: ERROR, fontFamily: 'Manrope-Bold' }}
            >
              Giá trị hàng mới phải lớn hơn hoặc bằng giá trị hàng trả.
            </Text>
          </View>
        )}
      </View>

      <View className="flex-row gap-3">
        <Button
          label="Hủy bỏ"
          variant="outline"
          className="h-14 flex-1 rounded-xl"
          onPress={onClose}
          disabled={isProcessing}
        />
        <Button
          label={isProcessing ? processingText : 'XÁC NHẬN ĐỔI HÀNG'}
          className="h-14 flex-[1.4] rounded-xl"
          onPress={onConfirm}
          loading={isProcessing}
          disabled={!canSubmit || isProcessing}
        />
      </View>
    </View>
  )
})

// ── Helpers ──
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
      <Text
        className="text-base font-bold"
        style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}
      >
        {label}
      </Text>
      <Text
        className="text-base font-extrabold"
        style={{ color: valueColor || TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  )
}
