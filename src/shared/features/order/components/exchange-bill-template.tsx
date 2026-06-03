import { formatCurrency } from '@/shared/utils'
import React from 'react'
import { Text, View } from 'react-native'
import { ExchangeReceiptData } from '../api/remote/order.remote.api'

interface ExchangeBillTemplateProps {
  receipt: ExchangeReceiptData
}

export function ExchangeBillTemplate({ receipt }: ExchangeBillTemplateProps) {
  const exchangedAt = receipt.exchangedAt ? new Date(receipt.exchangedAt) : new Date()
  const differenceLabel = receipt.differenceAmount > 0 ? 'Thu chênh lệch' : 'Chênh lệch'

  return (
    <View className="w-[384px] bg-white p-4">
      <View className="items-center border-b border-dashed border-surface-300 pb-3">
        <Text className="text-xl font-black uppercase text-surface-on">Phiếu đổi hàng</Text>
        {(receipt.exchangeCode || receipt.exchangeId) && (
          <Text className="mt-1 text-sm font-bold text-muted">
            Mã phiếu: {receipt.exchangeCode || receipt.exchangeId}
          </Text>
        )}
        <Text className="mt-1 text-sm font-bold text-muted">
          Đơn gốc: {receipt.orderCode || receipt.orderId}
        </Text>
        <Text className="mt-1 text-sm text-muted">{exchangedAt.toLocaleString('vi-VN')}</Text>
      </View>

      {!!receipt.reason && (
        <View className="border-b border-dashed border-surface-300 py-3">
          <Text className="text-sm font-bold text-surface-on">Ghi chú: {receipt.reason}</Text>
        </View>
      )}

      <View className="border-b border-dashed border-surface-300 py-3">
        <Text className="mb-2 text-sm font-black uppercase text-error">Hàng khách trả</Text>
        {receipt.returnedLines.map((line) => (
          <View key={`return-${line.productId}`} className="mb-3 border-b border-surface-100 pb-2">
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1">
                <Text className="text-base font-black text-surface-on">{line.name}</Text>
                {line.sku && <Text className="text-xs text-muted">SKU: {line.sku}</Text>}
              </View>
              <Text className="text-sm font-black text-error">
                -{formatCurrency(line.lineAmount)}
              </Text>
            </View>
            <View className="mt-1 flex-row justify-between">
              <Text className="text-xs text-muted">SL: {line.qty}</Text>
              <Text className="text-xs text-muted">Đơn giá: {formatCurrency(line.unitPrice)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View className="py-3">
        <Text className="mb-2 text-sm font-black uppercase text-primary">Hàng đổi mới</Text>
        {receipt.replacementLines.map((line) => (
          <View
            key={`replacement-${line.productId}`}
            className="mb-3 border-b border-surface-100 pb-2"
          >
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1">
                <Text className="text-base font-black text-surface-on">{line.name}</Text>
                {line.sku && <Text className="text-xs text-muted">SKU: {line.sku}</Text>}
              </View>
              <Text className="text-sm font-black text-primary">
                {formatCurrency(line.lineAmount)}
              </Text>
            </View>
            <View className="mt-1 flex-row justify-between">
              <Text className="text-xs text-muted">SL: {line.qty}</Text>
              <Text className="text-xs text-muted">Đơn giá: {formatCurrency(line.unitPrice)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View className="border-t border-dashed border-surface-300 pt-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-bold text-muted">Giá trị hàng trả</Text>
          <Text className="text-base font-black text-error">
            {formatCurrency(receipt.returnedValue)}
          </Text>
        </View>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-sm font-bold text-muted">Giá trị hàng mới</Text>
          <Text className="text-base font-black text-primary">
            {formatCurrency(receipt.replacementValue)}
          </Text>
        </View>
        <View className="mt-3 flex-row items-center justify-between border-t border-dashed border-surface-300 pt-3">
          <Text className="text-base font-black uppercase text-surface-on">{differenceLabel}</Text>
          <Text className="text-xl font-black text-primary">
            {formatCurrency(receipt.differenceAmount)}
          </Text>
        </View>
      </View>
    </View>
  )
}
