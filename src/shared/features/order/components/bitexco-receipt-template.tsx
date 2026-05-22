import { ItemSnapshot, PaymentSnapshot } from '@/shared/lib/database/types'
import { formatDateTime } from '@/shared/utils'
import React, { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { IOrder } from '../types'

import { useAppContext } from '@/shared/features/app'

interface BitexcoReceiptTemplateProps {
  order: IOrder
  staffName?: string
  copyNumber?: number
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

export const BitexcoReceiptTemplate = ({
  order,
  staffName,
  copyNumber = 1,
}: BitexcoReceiptTemplateProps) => {
  const { employee } = useAppContext()
  const [resolvedStaffName, setResolvedStaffName] = useState(staffName)

  useEffect(() => {
    if (staffName) {
      setResolvedStaffName(staffName)
    } else if (order.staffId === employee?.employeeCode) {
      setResolvedStaffName(employee.displayName)
    }
  }, [order.staffId, staffName, employee])

  const {
    id: orderId,
    createdAt,
    total,
    totalTax,
    itemsSnapshot: items = [],
    paymentsSnapshot: payments = [],
  } = order

  // Format currency for
  const formatCurrency = (amount: any) => {
    if (typeof amount !== 'number') return '0'
    return amount.toLocaleString('vi-VN')
  }

  const totalPaid = (payments || []).reduce((acc, p: PaymentSnapshot) => acc + (p.amount || 0), 0)

  // Tính toán làm tròn (Rounding)
  // Trong hệ thống, subtotal - discount + tax là total thực tế trước làm tròn (nếu là tiền mặt)
  // Nhưng ở đây ta so sánh total lưu trong đơn hàng với (subtotal - discount + tax)
  const changeAmount = Math.max(0, totalPaid - total)

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

        <Text style={{ fontSize: 42, fontWeight: 'bold', marginTop: 16 }}>BẢNG KÊ BÁN LẺ</Text>
        <Text style={{ fontSize: 24 }}>---000---</Text>
        <Text style={{ fontSize: 28 }}>Liên: {copyNumber}</Text>
      </View>

      <View className="mt-6 gap-1">
        <Text style={{ fontSize: 28 }}>{formatDateTime(createdAt || new Date())}</Text>
        <Text style={{ fontSize: 28 }}>Số HD: {orderId ? orderId.toUpperCase() : '---'}</Text>
        <Text style={{ fontSize: 28 }}>
          Nhân viên: {resolvedStaffName || order.staffId || '---'}
        </Text>
      </View>

      <DashedLine />

      {/* Table Header */}
      <View className="flex-row">
        <View style={{ flex: 2 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold' }}>Đơn giá</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', textAlign: 'center' }}>Số lượng</Text>
        </View>
        <View style={{ flex: 2 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', textAlign: 'right' }}>Thành tiền</Text>
        </View>
      </View>

      <DashedLine />

      {/* Items */}
      {items.map((item: ItemSnapshot, index: number) => (
        <View key={index} className="mb-4">
          <Text style={{ fontSize: 30, fontWeight: 'bold' }}>{item.name}</Text>
          <Text style={{ fontSize: 24 }}>{item.sku}</Text>
          <View className="mt-1 flex-row">
            <View style={{ flex: 2 }}>
              <Text style={{ fontSize: 28 }}>{formatCurrency(item.price)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 28, textAlign: 'center' }}>{item.quantity}</Text>
            </View>
            <View style={{ flex: 2 }}>
              <Text style={{ fontSize: 28, textAlign: 'right', fontWeight: 'bold' }}>
                {formatCurrency(item.subtotal || item.price * item.quantity)}
              </Text>
            </View>
          </View>
        </View>
      ))}

      <DashedLine />

      {/* Totals */}
      <View className="gap-1">
        <View className="flex-row justify-between">
          <Text style={{ fontSize: 32, fontWeight: 'bold' }}>Tổng</Text>
          <Text style={{ fontSize: 32, fontWeight: 'bold' }}>{formatCurrency(total)}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text style={{ fontSize: 32, fontWeight: 'bold' }}>Tổng tiền:</Text>
          <Text style={{ fontSize: 32, fontWeight: 'bold' }}>{formatCurrency(total)}</Text>
        </View>

        <View className="mt-2 flex-row justify-between">
          <Text style={{ fontSize: 28, fontWeight: 'bold' }}>Tiền khách trả:</Text>
          <Text style={{ fontSize: 28, fontWeight: 'bold' }}>{formatCurrency(totalPaid)}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text style={{ fontSize: 28 }}>Tiền trả lại cho khách:</Text>
          <Text style={{ fontSize: 28 }}>{formatCurrency(changeAmount)}</Text>
        </View>

        <View className="mt-2">
          <Text style={{ fontSize: 28, fontWeight: 'bold' }}>Chi tiết tiền thuế:</Text>
          <View className="ml-4 flex-row justify-between">
            <Text style={{ fontSize: 28 }}>VAT</Text>
            <Text style={{ fontSize: 28 }}>{formatCurrency(totalTax || 0)}</Text>
          </View>
        </View>
      </View>

      <DashedLine />

      <View>
        <Text style={{ fontSize: 28, fontWeight: 'bold' }}>Chi tiết thanh toán:</Text>
        {payments.map((p: PaymentSnapshot, idx: number) => (
          <View key={idx} className="ml-4 flex-row justify-between">
            <Text style={{ fontSize: 28 }}>
              +{' '}
              {p.method === 'CARD'
                ? 'Thẻ tín dụng'
                : p.method === 'CASH'
                  ? 'Tiền mặt'
                  : 'Chuyển khoản'}
            </Text>
            <Text style={{ fontSize: 28 }}>{formatCurrency(p.amount || 0)}</Text>
          </View>
        ))}
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
