import { formatCurrency } from '@/shared/utils'
import React from 'react'
import { Text, View } from 'react-native'
import { RefundReceiptData } from '../api/remote/order.remote.api'

interface RefundReceiptTemplateProps {
  receipt: RefundReceiptData
}

const DashedLine = () => (
  <View
    style={{
      borderBottomWidth: 1,
      borderBottomColor: '#000',
      borderStyle: 'dashed',
      marginVertical: 8,
    }}
  />
)

export function RefundReceiptTemplate({ receipt }: RefundReceiptTemplateProps) {
  const refundedAt = receipt.refundedAt ? new Date(receipt.refundedAt) : new Date()
  const formattedDate = refundedAt.toLocaleString('vi-VN')
  const returnCodeOrId = receipt.returnCode || receipt.returnId
  const orderCodeOrId = receipt.orderCode || receipt.orderId

  return (
    <View className="bg-white px-4 py-8" style={{ width: 576 }}>
      {/* Header */}
      <View className="items-center">
        <Text style={{ fontSize: 32, fontWeight: 'bold', textAlign: 'center' }}>
          Quầy lưu niệm Saigon Skydeck - Bitexco Tower
        </Text>
        <Text style={{ fontSize: 28, textAlign: 'center', marginTop: 4 }}>
          36 Ho Tung Mau ST, District 1 HCMC
        </Text>
        <Text style={{ fontSize: 28, textAlign: 'center' }}>TEL: (84-8) 39 156 156</Text>

        <Text style={{ fontSize: 42, fontWeight: 'bold', marginTop: 16 }}>PHIẾU TRẢ HÀNG</Text>
        <Text style={{ fontSize: 24 }}>---000---</Text>
      </View>

      <View className="mt-6 gap-1">
        <Text style={{ fontSize: 28 }}>{formattedDate}</Text>
        {!!returnCodeOrId && (
          <Text style={{ fontSize: 28 }}>Mã phiếu: {returnCodeOrId.toUpperCase()}</Text>
        )}
        <Text style={{ fontSize: 28 }}>Đơn gốc: {orderCodeOrId.toUpperCase()}</Text>
        {!!receipt.reason && (
          <Text style={{ fontSize: 28, marginTop: 4 }}>Lý do: {receipt.reason}</Text>
        )}
      </View>

      <DashedLine />

      {/* Table Header */}
      <View className="flex-row">
        <View style={{ flex: 2.5 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold' }}>Sản phẩm</Text>
        </View>
        <View style={{ flex: 1.5 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', textAlign: 'center' }}>Số lượng</Text>
        </View>
        <View style={{ flex: 2 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', textAlign: 'right' }}>Hoàn tiền</Text>
        </View>
      </View>

      <DashedLine />

      {/* Items */}
      {receipt.lines.map((line) => (
        <View key={line.productId} className="mb-4">
          <Text style={{ fontSize: 30, fontWeight: 'bold' }}>{line.name}</Text>
          <Text style={{ fontSize: 24 }}>{line.sku || '---'}</Text>

          <View className="mt-1 flex-row">
            <View style={{ flex: 2.5 }}>
              <Text style={{ fontSize: 28 }}>Mua: {line.orderedQty}</Text>
            </View>
            <View style={{ flex: 1.5 }}>
              <Text style={{ fontSize: 28, textAlign: 'center' }}>Trả: {line.returnedQty}</Text>
            </View>
            <View style={{ flex: 2 }}>
              <Text style={{ fontSize: 28, textAlign: 'right', fontWeight: 'bold' }}>
                {line.isReturned ? `-${formatCurrency(line.lineRefundAmount)}` : 'Không trả'}
              </Text>
            </View>
          </View>
        </View>
      ))}

      <DashedLine />

      {/* Totals */}
      <View className="gap-1">
        <View className="flex-row justify-between">
          <Text style={{ fontSize: 32, fontWeight: 'bold' }}>Tổng tiền hoàn:</Text>
          <Text style={{ fontSize: 32, fontWeight: 'bold' }}>
            {formatCurrency(receipt.refundAmount)}
          </Text>
        </View>
      </View>

      <DashedLine />

      <View className="mt-2 items-center">
        <Text style={{ fontSize: 24, textAlign: 'center', fontStyle: 'italic' }}>
          Quý khách vui lòng kiểm tra lại hóa đơn.
        </Text>
        <Text style={{ fontSize: 24, textAlign: 'center', fontStyle: 'italic', marginTop: 4 }}>
          Xin cảm ơn và hẹn gặp lại
        </Text>
      </View>
    </View>
  )
}
