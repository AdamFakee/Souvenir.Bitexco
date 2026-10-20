import { PAYMENT_METHOD_LABELS_EN } from '@/features/payment/types/payment.constants'
import { buildInvoiceQrUrl } from '@/shared/constants'
import { ItemSnapshot, PaymentSnapshot } from '@/shared/lib/database/types'
import { IOrder } from '@/shared/types'
import { formatDateTime } from '@/shared/utils'
import React, { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { useEmployee } from '@/features/app/hooks/use-app-context'
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
    discount = 0,
    totalTax = 0,
    itemsSnapshot: items = [],
    paymentsSnapshot: payments = [],
  } = order

  const formatCurrency = (amount: any) => {
    if (typeof amount !== 'number') return '0'
    return amount.toLocaleString('vi-VN')
  }

  const activeItems = (items || []).filter((item: ItemSnapshot) => {
    const qty = item.remainingQty !== undefined ? item.remainingQty : item.quantity
    return qty > 0
  })

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
  const totalQty = activeItems.reduce((sum: number, i: ItemSnapshot) => {
    const qty = i.remainingQty !== undefined ? i.remainingQty : i.quantity || 0
    return sum + qty
  }, 0)

  const isExchange =
    order.isExchange ||
    order.isExchangeOrder ||
    Boolean(order.originalOrderId) ||
    items.some((item: ItemSnapshot) => item.isExchange)

  const isCancelledOrRefunded =
    order.isDeleted ||
    order.status === 'CANCELLED' ||
    order.status === 'FAILED' ||
    order.status === 'REFUNDED' ||
    order.status === 'RETURNED' ||
    order.status === 'PARTIALLY_RETURNED' ||
    order.status === 'PARTIALLY_REFUNDED' ||
    order.state === 'CANCELLED'

  // Chỉ in mã QR hóa đơn cho đơn bán hàng mua lần đầu (không in cho đơn đổi hoặc đơn hủy/hoàn)
  const isInitialSale = !isExchange && !isCancelledOrRefunded
  const invoiceOrderCode = code || orderId
  const invoiceQrUrl = isInitialSale ? buildInvoiceQrUrl(invoiceOrderCode, total) : null

  return (
    <ReceiptWrapper
      title={isExchange ? 'EXCHANGE RECEIPT' : 'SALES RECEIPT'}
      copyNumber={copyNumber}
    >
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

      {activeItems.map((item: ItemSnapshot, index: number) => {
        const qty = item.remainingQty !== undefined ? item.remainingQty : item.quantity
        const finalLineAmount = item.price * qty - (item.discountAmount || 0)
        const taxPercent = item.taxRate
          ? item.taxRate <= 1 && item.taxRate > 0
            ? Math.round(item.taxRate * 100)
            : Math.round(item.taxRate)
          : 0

        return (
          <View key={index} style={{ marginBottom: 4, flexDirection: 'row' }}>
            <View style={{ flex: 2.5 }}>
              <Text style={S.fs28}>{item.name}</Text>
              <Text style={S.fs28}>
                {formatCurrency(item.price)} (VAT {taxPercent}%)
              </Text>
            </View>
            <View style={{ flex: 1.5, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text style={S.fs28}>{qty}</Text>
            </View>
            <View style={{ flex: 2, justifyContent: 'flex-end' }}>
              <Text style={{ ...S.fs28, textAlign: 'right' }}>
                {formatCurrency(finalLineAmount)}
              </Text>
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.fs28}>Total Before Tax:</Text>
          <Text style={{ ...S.fs28, textAlign: 'right' }}>
            {formatCurrency((total || 0) + discount - totalTax)}
          </Text>
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

      {invoiceQrUrl && total > 0 && (
        <>
          <DashedLine />
          <View style={{ alignItems: 'center', marginVertical: 6, gap: 2 }}>
            <Text style={S.fs30b}>E-INVOICE</Text>
            <Text style={S.fs24}>Scan to get your e-invoice</Text>
            <View style={{ marginVertical: 8 }}>
              <QRCode value={invoiceQrUrl} size={180} color="#000" backgroundColor="#fff" />
            </View>
            <Text style={S.fs24}>Valid for 2 hours</Text>
          </View>
        </>
      )}
    </ReceiptWrapper>
  )
}
