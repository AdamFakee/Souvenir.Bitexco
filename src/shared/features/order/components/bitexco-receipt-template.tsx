import { PAYMENT_METHOD_LABELS_EN } from '@/shared/features/payment/types/payment.constants'
import { ItemSnapshot, PaymentSnapshot } from '@/shared/lib/database/types'
import { formatDateTime } from '@/shared/utils'
import React, { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { IOrder } from '../types'

import { useDevice, useEmployee } from '@/shared/features/app'
import { DashedLine, ReceiptWrapper, S } from './receipt-wrapper'

interface BitexcoReceiptTemplateProps {
  order: IOrder
  staffName?: string
  copyNumber?: number
}

const formatReceiptCode = (codeOrId: string | null | undefined): string => {
  if (!codeOrId) return '---'
  const isUuid =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(codeOrId)
  if (isUuid) {
    const clean = codeOrId.replace(/-/g, '')
    return clean.substring(0, 12).toUpperCase()
  }
  return codeOrId.toUpperCase()
}

export const BitexcoReceiptTemplate = ({
  order,
  staffName,
  copyNumber = 1,
}: BitexcoReceiptTemplateProps) => {
  const employee = useEmployee()
  const device = useDevice()
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

  const totalPaid = (payments || []).reduce((acc, p: PaymentSnapshot) => {
    if (p.method === 'cash' && p.cashTendered !== undefined && p.cashTendered > 0) {
      return acc + p.cashTendered
    }
    return acc + (p.amount || 0)
  }, 0)
  const changeAmount =
    (payments || []).reduce((acc, p: PaymentSnapshot) => {
      if (p.method === 'cash' && p.cashChange !== undefined) {
        return acc + p.cashChange
      }
      return acc
    }, 0) || Math.max(0, totalPaid - total)
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
          <Text style={S.fs28}>{formatReceiptCode(code || orderId)}</Text>
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

      {items.map((item: ItemSnapshot, index: number) => {
        const finalLineAmount = item.price * item.quantity - (item.discountAmount || 0)
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
            <Text style={{ ...S.fs28, textAlign: 'right' }}>
              {formatCurrency((total || 0) + discount)}
            </Text>
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
