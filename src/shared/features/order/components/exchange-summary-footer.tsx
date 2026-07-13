import { Button } from '@/shared/components/ui'
import { formatCurrency } from '@/shared/utils'
import { LucideIcon } from 'lucide-react-native'
import React, { memo } from 'react'
import { Text, View } from 'react-native'

const BORDER = '#DFE0E1'
const TEXT_PRIMARY = '#303036'
const TEXT_MUTED = '#747475'
const BRAND = '#1C4E68'
const ERROR = '#DC2626'

export interface ExchangePaymentMethodOption {
  type: string
  label: string
  icon?: LucideIcon | React.ComponentType<any>
  disabled?: boolean
}

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
  paymentMethods: ExchangePaymentMethodOption[]
  onClose: () => void
  onSelectPaymentMethod: (methodType: string) => void
}

/** Footer cột phải: tóm tắt + PTTT (khi Cần thu > 0) + Hủy. Không nút “xác nhận đổi ngang”. */
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
  paymentMethods,
  onClose,
  onSelectPaymentMethod,
}: ExchangeSummaryFooterProps) {
  const needsPayment = differenceAmount > 0
  const collect = Math.max(0, differenceAmount)
  const payDisabled = !canSubmit || isProcessing

  const blockReasons: string[] = []
  if (isOriginalOrderVoucherApplied) {
    blockReasons.push('Đơn có voucher/KM — không đổi được')
  } else {
    if (selectedReturnCount <= 0) blockReasons.push('Chọn ít nhất 1 món khách trả')
    if (replacementCount <= 0) blockReasons.push('Thêm ít nhất 1 món đổi mới')
    if (differenceAmount < 0) blockReasons.push('Giá hàng mới phải ≥ hàng trả')
  }

  const rows: ExchangePaymentMethodOption[][] = []
  for (let i = 0; i < paymentMethods.length; i += 2) {
    rows.push(paymentMethods.slice(i, i + 2))
  }

  return (
    <View
      className="px-5 py-4"
      style={{ borderTopWidth: 1, borderColor: BORDER, backgroundColor: '#fff' }}
    >
      <View style={{ gap: 4 }}>
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

        <View className="mt-2" style={{ borderTopWidth: 1, borderColor: BORDER, paddingTop: 10 }}>
          <View className="flex-row items-center justify-between">
            <Text
              className="text-lg font-extrabold uppercase tracking-tight"
              style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
            >
              Cần thu
            </Text>
            <Text
              className="text-2xl font-extrabold"
              style={{
                color: differenceAmount < 0 ? ERROR : BRAND,
                fontFamily: 'Manrope-Bold',
              }}
              numberOfLines={1}
            >
              {formatCurrency(collect)}
            </Text>
          </View>
        </View>
      </View>

      {blockReasons.length > 0 && (
        <View
          className="mt-3 rounded-xl px-3 py-2"
          style={{ backgroundColor: 'rgba(220,38,38,0.08)' }}
        >
          {blockReasons.map((r) => (
            <Text
              key={r}
              className="text-sm font-bold"
              style={{ color: ERROR, fontFamily: 'Manrope-Bold' }}
            >
              • {r}
            </Text>
          ))}
        </View>
      )}

      <View className="mt-3 gap-2">
        {needsPayment &&
          rows.map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row gap-2">
              {row.map((method) => {
                const isDisabled = payDisabled || !!method.disabled
                return (
                  <Button
                    key={method.type}
                    label={method.label}
                    loading={isProcessing}
                    disabled={isDisabled}
                    onPress={() => onSelectPaymentMethod(method.type)}
                    className="h-14 min-h-[56px] flex-1 rounded-xl px-3"
                  />
                )
              })}
            </View>
          ))}

        <Button
          label="Hủy bỏ"
          variant="outline"
          className="h-12 min-h-[44px] w-full rounded-xl"
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
      <Text className="text-sm font-bold" style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Bold' }}>
        {label}
      </Text>
      <Text
        className="text-sm font-extrabold"
        style={{ color: valueColor || TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  )
}
