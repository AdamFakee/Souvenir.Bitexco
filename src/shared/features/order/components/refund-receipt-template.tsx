import { formatCurrency, formatDateTime } from '@/shared/utils'
import React from 'react'
import { Text, View } from 'react-native'
import { RefundReceiptData } from '../api/remote/order.remote.api'
import { DashedLine, ReceiptWrapper, S } from './receipt-wrapper'

interface RefundReceiptTemplateProps {
  receipt: RefundReceiptData
  copyNumber?: number
}

export function RefundReceiptTemplate({ receipt, copyNumber = 1 }: RefundReceiptTemplateProps) {
  const refundedAt = receipt.refundedAt ? new Date(receipt.refundedAt) : new Date()
  const returnCodeOrId = receipt.returnCode || receipt.returnId
  const orderCodeOrId = receipt.orderCode || receipt.orderId

  return (
    <ReceiptWrapper title="PHIẾU TRẢ HÀNG" copyNumber={copyNumber}>
      {/* Meta info — để dọc */}
      <View style={{ marginTop: 4 }}>
        <Text style={S.fs28}>{formatDateTime(refundedAt)}</Text>
        {!!returnCodeOrId && <Text style={S.fs28}>Mã phiếu: {returnCodeOrId.toUpperCase()}</Text>}
        <Text style={S.fs28}>Đơn gốc: {orderCodeOrId.toUpperCase()}</Text>
        {!!receipt.reason && <Text style={S.fs28}>Lý do: {receipt.reason}</Text>}
      </View>

      <DashedLine />

      {/* Table Header */}
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 2 }}>
          <Text style={S.fs28}>Sản phẩm</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...S.fs28, textAlign: 'center' }}>Số lượng</Text>
        </View>
        <View style={{ flex: 2 }}>
          <Text style={{ ...S.fs28, textAlign: 'right' }}>Hoàn tiền</Text>
        </View>
      </View>

      <DashedLine />

      {/* Items */}
      {receipt.lines.map((line) => (
        <View key={line.productId} style={{ marginBottom: 4 }}>
          <Text style={S.fs28b}>{line.name}</Text>
          <Text style={{ ...S.fs24, lineHeight: 26 }}>{line.sku || '---'}</Text>

          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 2 }}>
              <Text style={S.fs28}>Mua: {line.orderedQty}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...S.fs28, textAlign: 'center' }}>Trả: {line.returnedQty}</Text>
            </View>
            <View style={{ flex: 2 }}>
              <Text style={{ ...S.fs28, textAlign: 'right' }}>
                {line.isReturned ? `-${formatCurrency(line.lineRefundAmount)}` : 'Không trả'}
              </Text>
            </View>
          </View>
        </View>
      ))}

      <DashedLine />

      {/* Totals */}
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.fs32b}>Tổng tiền hoàn:</Text>
          <Text style={S.fs32b}>{formatCurrency(receipt.refundAmount)}</Text>
        </View>
      </View>
    </ReceiptWrapper>
  )
}
