import { formatCurrency } from '@/shared/utils'
import React from 'react'
import { Text, View } from 'react-native'
import { RefundReceiptData } from '../api/remote/order.remote.api'

interface RefundReceiptTemplateProps {
  receipt: RefundReceiptData
}

export function RefundReceiptTemplate({ receipt }: RefundReceiptTemplateProps) {
  const refundedAt = receipt.refundedAt ? new Date(receipt.refundedAt) : new Date()

  return (
    <View className="w-[384px] bg-white p-4">
      <View className="items-center border-b border-dashed border-surface-300 pb-3">
        <Text className="text-xl font-black uppercase text-surface-on">Phiếu trả hàng</Text>
        {receipt.returnId && (
          <Text className="mt-1 text-sm font-bold text-muted">Mã phiếu: {receipt.returnId}</Text>
        )}
        <Text className="mt-1 text-sm font-bold text-muted">
          Đơn gốc: {receipt.orderCode || receipt.orderId}
        </Text>
        <Text className="mt-1 text-sm text-muted">{refundedAt.toLocaleString('vi-VN')}</Text>
      </View>

      {!!receipt.reason && (
        <View className="border-b border-dashed border-surface-300 py-3">
          <Text className="text-sm font-bold text-surface-on">Lý do: {receipt.reason}</Text>
        </View>
      )}

      <View className="py-3">
        {receipt.lines.map((line) => (
          <View key={line.productId} className="mb-3 border-b border-surface-100 pb-2">
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1">
                <Text className="text-base font-black text-surface-on">{line.name}</Text>
                {line.sku && <Text className="text-xs text-muted">SKU: {line.sku}</Text>}
              </View>
              <Text
                className={
                  line.isReturned ? 'text-sm font-black text-error' : 'text-sm font-bold text-muted'
                }
              >
                {line.isReturned ? 'Đã trả' : 'Không trả'}
              </Text>
            </View>

            <View className="mt-2 flex-row justify-between">
              <Text className="text-xs text-muted">Đã mua: {line.orderedQty}</Text>
              <Text className="text-xs text-muted">Trả: {line.returnedQty}</Text>
              <Text className="text-xs text-muted">Còn lại: {line.remainingQty}</Text>
            </View>

            {line.isReturned && (
              <View className="mt-1 flex-row justify-between">
                <Text className="text-xs text-muted">
                  Đơn giá: {formatCurrency(line.unitPrice)}
                </Text>
                <Text className="text-sm font-black text-error">
                  -{formatCurrency(line.lineRefundAmount)}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <View className="border-t border-dashed border-surface-300 pt-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-black uppercase text-surface-on">Tổng tiền hoàn</Text>
          <Text className="text-xl font-black text-error">
            {formatCurrency(receipt.refundAmount)}
          </Text>
        </View>
      </View>
    </View>
  )
}
