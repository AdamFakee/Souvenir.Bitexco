import { PAYMENT_METHOD_LABELS_EN } from '@/shared/features/payment/types/payment.constants'
import { ItemSnapshot, PaymentSnapshot } from '@/shared/lib/database/types'
import { formatDateTime } from '@/shared/utils'
import React, { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { IOrder } from '../types'

import { useAppContext } from '@/shared/features/app'
import { DashedLine, ReceiptWrapper, S } from './receipt-wrapper'

interface BitexcoReceiptTemplateProps {
  order: IOrder
  staffName?: string
  copyNumber?: number
}

export const BitexcoReceiptTemplate = ({
  order,
  staffName,
  copyNumber = 1,
}: BitexcoReceiptTemplateProps) => {
  const { employee, device } = useAppContext()
  const [resolvedStaffName, setResolvedStaffName] = useState(staffName)

  useEffect(() => {
    if (staffName) {
      setResolvedStaffName(staffName)
    } else if (
      employee &&
      (order.staffId === employee.id || order.staffId === employee.employeeCode)
    ) {
      setResolvedStaffName(employee.displayName)
    } else if (employee?.displayName) {
      setResolvedStaffName(employee.displayName)
    }
  }, [order.staffId, staffName, employee])

  const {
    id: orderId,
    code,
    createdAt,
    total,
    subtotal,
    discount = 0,
    totalTax,
    itemsSnapshot: items = [],
    paymentsSnapshot: payments = [],
  } = order

  const deviceName = device?.name ?? null

  const formatCurrency = (amount: any) => {
    if (typeof amount !== 'number') return '0'
    return amount.toLocaleString('vi-VN')
  }

  const totalPaid = (payments || []).reduce((acc, p: PaymentSnapshot) => acc + (p.amount || 0), 0)
  const changeAmount = Math.max(0, totalPaid - total)
  const totalQty = items.reduce((sum: number, i: ItemSnapshot) => sum + (i.quantity || 0), 0)

  const discountPercentStr = (() => {
    if (!discount || !subtotal) return ''
    const pct = (discount / subtotal) * 100
    return pct % 1 === 0 ? `${pct}%` : `${pct.toFixed(1)}%`
  })()

  return (
    <ReceiptWrapper title="SALES RECEIPT" copyNumber={copyNumber}>
      {/* Meta info — Chỉ hiển thị Date và Receipt */}
      <View style={{ marginTop: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.fs28}>Date:</Text>
          <Text style={S.fs28}>{formatDateTime(createdAt || new Date())}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={S.fs28}>Receipt:</Text>
          <Text style={S.fs28}>{code || orderId ? (code || orderId).toUpperCase() : '---'}</Text>
        </View>
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
      {items.map((item: ItemSnapshot, index: number) => {
        const finalLineAmount = item.price * item.quantity + (item.taxAmount || 0)
        const taxPercent = item.taxRate
          ? item.taxRate <= 1 && item.taxRate > 0
            ? Math.round(item.taxRate * 100)
            : Math.round(item.taxRate)
          : 0

        return (
          <View key={index} style={{ marginBottom: 4 }}>
            <Text style={S.fs28}>{item.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 2.5 }}>
                <Text style={S.fs28}>
                  {formatCurrency(item.price)} (VAT {taxPercent}%)
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={S.fs28}>{item.quantity}</Text>
              </View>
              <View style={{ flex: 2 }}>
                <Text style={{ ...S.fs28, textAlign: 'right' }}>
                  {formatCurrency(finalLineAmount)}
                </Text>
              </View>
            </View>
          </View>
        )
      })}

      <DashedLine />

      {/* Totals */}
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 2.5 }}>
            <Text style={S.fs28}>Subtotal</Text>
          </View>
          <View style={{ flex: 1.5, alignItems: 'center' }}>
            <Text style={S.fs28}>{totalQty}</Text>
          </View>
          <View style={{ flex: 2 }}>
            <Text style={{ ...S.fs28, textAlign: 'right' }}>{formatCurrency(subtotal)}</Text>
          </View>
        </View>
        {totalTax > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={S.fs28}>VAT:</Text>
            <Text style={{ ...S.fs28, textAlign: 'right' }}>{formatCurrency(totalTax)}</Text>
          </View>
        )}
        {discount > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={S.fs28}>Discount:</Text>
            <Text style={{ ...S.fs28, textAlign: 'right' }}>-{formatCurrency(discount)}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.fs32b}>Total:</Text>
          <Text style={S.fs32b}>{formatCurrency(total)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.fs28}>Tendered:</Text>
          <Text style={S.fs28}>{formatCurrency(totalPaid)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.fs28n}>Change Due:</Text>
          <Text style={S.fs28n}>{formatCurrency(changeAmount)}</Text>
        </View>
      </View>

      <DashedLine />

      <View>
        <Text style={S.fs28}>Paid by:</Text>
        {payments.map((p: PaymentSnapshot, idx: number) => (
          <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={S.fs28n}>+ {PAYMENT_METHOD_LABELS_EN[p.method] ?? p.method}</Text>
            <Text style={S.fs28n}>{formatCurrency(p.amount || 0)}</Text>
          </View>
        ))}
      </View>
    </ReceiptWrapper>
  )
}
