import React from 'react'
import { Text, View } from 'react-native'
import { ZReportResponse } from '../api/remote/shift.remote.api'
import { formatDateTime } from '@/shared/utils'

interface ZReportPrintTemplateProps {
  data: ZReportResponse
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

export const ZReportPrintTemplate = ({ data }: ZReportPrintTemplateProps) => {
  const {
    session,
    cashierName,
    cashierEmail,
    posDeviceName,
    posDeviceCode,
    warehouseName,
    warehouseCode,
    orderCount,
    refundCount,
    paymentBreakdown = [],
  } = data

  const formatCurrency = (amount: any) => {
    if (typeof amount !== 'number') return '0'
    return amount.toLocaleString('vi-VN')
  }

  const getMethodLabel = (method: string) => {
    const m = method.toLowerCase()
    if (m === 'cash' || m === 'tiền mặt') return 'Tiền mặt'
    if (m.includes('qr') || m.includes('vietqr')) return 'Chuyển khoản QR'
    if (m.includes('card') || m.includes('thẻ')) return 'Thanh toán thẻ'
    return method
  }

  const diffCash = session.diffCash ?? 0

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

        <Text style={{ fontSize: 38, fontWeight: 'bold', marginTop: 16, textAlign: 'center' }}>
          BÁO CÁO DOANH THU CA
        </Text>
        <Text style={{ fontSize: 36, fontWeight: 'bold', textAlign: 'center' }}>(Z-REPORT)</Text>
        <Text style={{ fontSize: 24 }}>---000---</Text>
      </View>

      {/* Shift Details */}
      <View className="mt-6 gap-1">
        <Text style={{ fontSize: 28 }}>Mã ca: {session.code.toUpperCase()}</Text>
        <Text style={{ fontSize: 28 }}>
          Nhân viên: {cashierName} ({cashierEmail})
        </Text>
        <Text style={{ fontSize: 28 }}>
          Thiết bị: {posDeviceName} ({posDeviceCode})
        </Text>
        <Text style={{ fontSize: 28 }}>
          Kho hàng: {warehouseName} ({warehouseCode})
        </Text>
        <Text style={{ fontSize: 28 }}>
          Thời gian mở: {formatDateTime(new Date(session.openedAt))}
        </Text>
        <Text style={{ fontSize: 28 }}>
          Thời gian đóng: {session.closedAt ? formatDateTime(new Date(session.closedAt)) : '---'}
        </Text>
      </View>

      <DashedLine />

      {/* Order Counts */}
      <View className="gap-1">
        <Text style={{ fontSize: 28, fontWeight: 'bold' }}>THỐNG KÊ GIAO DỊCH:</Text>
        <View className="ml-4 flex-row justify-between">
          <Text style={{ fontSize: 28 }}>+ Số đơn bán lẻ:</Text>
          <Text style={{ fontSize: 28, fontWeight: 'bold' }}>{orderCount} đơn</Text>
        </View>
        <View className="ml-4 flex-row justify-between">
          <Text style={{ fontSize: 28 }}>+ Số đơn hoàn trả:</Text>
          <Text style={{ fontSize: 28, fontWeight: 'bold' }}>{refundCount} đơn</Text>
        </View>
      </View>

      <DashedLine />

      {/* Payment Method Breakdown */}
      <View className="gap-1">
        <Text style={{ fontSize: 28, fontWeight: 'bold' }}>DOANH THU THEO HÌNH THỨC:</Text>
        {paymentBreakdown.map((p, index) => (
          <View key={index} className="ml-4 flex-row justify-between">
            <Text style={{ fontSize: 28 }}>+ {getMethodLabel(p.method)}:</Text>
            <Text style={{ fontSize: 28, fontWeight: 'bold' }}>{formatCurrency(p.amount)} đ</Text>
          </View>
        ))}
      </View>

      <DashedLine />

      {/* Cash Reconciliation */}
      <View className="gap-1">
        <Text style={{ fontSize: 28, fontWeight: 'bold' }}>ĐỐI SOÁT DÒNG TIỀN MẶT:</Text>

        <View className="ml-4 flex-row justify-between">
          <Text style={{ fontSize: 28 }}>+ Tiền mặt đầu ca:</Text>
          <Text style={{ fontSize: 28 }}>{formatCurrency(session.openingCash)} đ</Text>
        </View>

        <View className="ml-4 flex-row justify-between">
          <Text style={{ fontSize: 28 }}>+ Tiền mặt dự kiến (Hệ thống):</Text>
          <Text style={{ fontSize: 28 }}>{formatCurrency(session.expectedCash)} đ</Text>
        </View>

        <View className="ml-4 flex-row justify-between">
          <Text style={{ fontSize: 28, fontWeight: 'bold' }}>+ Tiền mặt thực tế đếm:</Text>
          <Text style={{ fontSize: 28, fontWeight: 'bold' }}>
            {formatCurrency(session.countedCash)} đ
          </Text>
        </View>

        <DashedLine />

        <View className="ml-4 flex-row justify-between">
          <Text style={{ fontSize: 28, fontWeight: 'bold' }}>+ Chênh lệch tiền mặt:</Text>
          <Text
            style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: diffCash > 0 ? '#000' : '#000', // Keep printing color black for thermal printer
            }}
          >
            {diffCash > 0 ? '+' : ''}
            {formatCurrency(diffCash)} đ
          </Text>
        </View>

        {session.notes ? (
          <View className="ml-4 mt-2">
            <Text style={{ fontSize: 28, fontStyle: 'italic' }}>
              Lý do chênh lệch: {session.notes}
            </Text>
          </View>
        ) : null}
      </View>

      <DashedLine />

      {/* Signature Section */}
      <View className="mt-8 items-center">
        <Text style={{ fontSize: 28, fontWeight: 'bold' }}>Người lập báo cáo</Text>
        <Text style={{ fontSize: 24, fontStyle: 'italic', marginTop: 4 }}>
          (Ký và ghi rõ họ tên)
        </Text>
        <View style={{ height: 100 }} />
      </View>
    </View>
  )
}
