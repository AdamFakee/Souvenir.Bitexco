import { formatCurrency } from '@/shared/utils'
import React from 'react'
import { Text, View } from 'react-native'
import { DashedLine, ReceiptWrapper, S } from './receipt-wrapper'

export interface ReconciliationReceiptData {
  ownerName: string
  ownerCode: string
  ownerType: 'collaborator' | 'agent'
  printTime: string
  totalOrdersCount: number
  totalRevenue: number
  commissionRate: number
  commissionAmount: number
  dateFrom: string
  dateTo: string
}

interface ReconciliationReceiptTemplateProps {
  data: ReconciliationReceiptData
  copyNumber?: number
}

export const ReconciliationReceiptTemplate = ({
  data,
  copyNumber = 1,
}: ReconciliationReceiptTemplateProps) => {
  const fmt = (v: number) => formatCurrency(v)

  return (
    <ReceiptWrapper title="BIÊN NHẬN ĐỐI SOÁT" copyNumber={copyNumber}>
      {/* Đối tượng đối soát */}
      <View style={{ marginTop: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.fs30b}>Đối tác/HDV:</Text>
          <Text style={S.fs30b}>{data.ownerName}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={S.fs28}>Mã số:</Text>
          <Text style={S.fs28}>{data.ownerCode}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={S.fs28}>Loại:</Text>
          <Text style={S.fs28}>
            {data.ownerType === 'collaborator' ? 'Hướng dẫn viên' : 'Đối tác'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={S.fs28}>Thời gian in:</Text>
          <Text style={S.fs28}>{data.printTime}</Text>
        </View>
      </View>

      <DashedLine />

      {/* Kỳ đối soát */}
      <View style={{ gap: 2, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.fs28}>Từ ngày:</Text>
          <Text style={S.fs28b}>{data.dateFrom}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={S.fs28}>Đến ngày:</Text>
          <Text style={S.fs28b}>{data.dateTo}</Text>
        </View>
      </View>

      <DashedLine />

      {/* Tổng cộng */}
      <View style={{ gap: 2, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.fs28}>Tổng số lượng đơn:</Text>
          <Text style={S.fs28b}>{data.totalOrdersCount} đơn</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={S.fs32b}>TỔNG DOANH SỐ:</Text>
          <Text style={S.fs32b} numberOfLines={1}>
            {fmt(data.totalRevenue)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={S.fs28}>Tỷ lệ hoa hồng:</Text>
          <Text style={S.fs28b}>{(data.commissionRate * 100).toFixed(1)}%</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={S.fs32b}>HOA HỒNG:</Text>
          <Text style={S.fs32b} numberOfLines={1}>
            {fmt(data.commissionAmount)}
          </Text>
        </View>
      </View>

      <DashedLine />

      {/* Chữ ký xác nhận */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 20,
          height: 200,
        }}
      >
        <View style={{ width: '48%', alignItems: 'center' }}>
          <Text style={{ ...S.fs28b, textAlign: 'center' }}>THU NGÂN</Text>
          <Text style={{ ...S.fs24, color: '#6b7280', marginTop: 4, textAlign: 'center' }}>
            (Ký và ghi rõ họ tên)
          </Text>
        </View>
        <View style={{ width: '48%', alignItems: 'center' }}>
          <Text style={{ ...S.fs28b, textAlign: 'center' }}>ĐỐI TÁC / HDV</Text>
          <Text style={{ ...S.fs24, color: '#6b7280', marginTop: 4, textAlign: 'center' }}>
            (Ký và ghi rõ họ tên)
          </Text>
        </View>
      </View>
    </ReceiptWrapper>
  )
}
