import { formatCurrency, formatDateTime } from '@/shared/utils'
import React from 'react'
import { Text, View } from 'react-native'
import { RefundReceiptData, RefundReceiptLine } from '../types'
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
    <ReceiptWrapper title="REFUND RECEIPT" copyNumber={copyNumber}>
      {/* Meta info */}
      <View style={{ marginTop: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.fs28}>Date:</Text>
          <Text style={S.fs28}>{formatDateTime(refundedAt)}</Text>
        </View>
        {!!returnCodeOrId && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
            <Text style={S.fs28}>Return ID:</Text>
            <Text style={S.fs28}>{returnCodeOrId.toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={S.fs28}>Original Sale:</Text>
          <Text style={S.fs28}>{orderCodeOrId.toUpperCase()}</Text>
        </View>
        {!!receipt.reason && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
            <Text style={S.fs28}>Reason:</Text>
            <Text style={S.fs28}>{receipt.reason}</Text>
          </View>
        )}
      </View>

      <DashedLine />

      {/* Table Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 2.5 }}>
          <Text style={S.fs28}>Unit Price</Text>
        </View>
        <View style={{ flex: 1.5, alignItems: 'center' }}>
          <Text style={S.fs28}>Quantity</Text>
        </View>
        <View style={{ flex: 2 }}>
          <Text style={{ ...S.fs28, textAlign: 'right' }}>Amount</Text>
        </View>
      </View>

      <DashedLine />

      {/* Items */}
      {receipt.lines
        .filter((line: RefundReceiptLine) => line.returnedQty > 0)
        .map((line: RefundReceiptLine) => (
          <View key={line.productId} style={{ marginBottom: 4 }}>
            <Text style={S.fs28}>{line.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 2.5 }}>
                <Text style={S.fs28}>{formatCurrency(line.unitPrice)}</Text>
              </View>
              <View style={{ flex: 1.5, alignItems: 'center' }}>
                <Text style={S.fs28}>{line.returnedQty}</Text>
              </View>
              <View style={{ flex: 2 }}>
                <Text style={{ ...S.fs28, textAlign: 'right' }}>
                  {line.isReturned ? `-${formatCurrency(line.lineRefundAmount)}` : 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        ))}

      <DashedLine />

      {/* Totals */}
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.fs32b}>Total Refunded:</Text>
          <Text style={S.fs32b}>{formatCurrency(receipt.refundAmount)}</Text>
        </View>
      </View>
    </ReceiptWrapper>
  )
}
