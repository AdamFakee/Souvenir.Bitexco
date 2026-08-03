import { formatCurrency, formatDate } from '@/shared/utils'
import React from 'react'
import { Text, View } from 'react-native'
import { DashedLine, ReceiptWrapper, S } from './receipt-wrapper'

export interface StaffShiftSummary {
  staffName: string
  staffCode: string
  orderCount: number
  cashAmount: number
  qrAmount: number
  cardAmount: number
  debtAmount: number
  totalRevenue: number
}

export interface CloseShiftReceiptData {
  shiftCode: string
  shiftTime: string
  openedAt: string
  closedAt: string
  posDeviceName: string
  totalOrders: number
  staffSummaries: StaffShiftSummary[]
  grandCash: number
  grandQr: number
  grandCard: number
  grandDebt: number
  grandTotal: number
}

interface CloseShiftReceiptTemplateProps {
  data: CloseShiftReceiptData
  copyNumber?: number
}

export const CloseShiftReceiptTemplate = ({
  data,
  copyNumber = 1,
}: CloseShiftReceiptTemplateProps) => {
  const fmt = (v: number) => formatCurrency(v)

  return (
    <ReceiptWrapper title="SHIFT CLOSE REPORT" copyNumber={copyNumber}>
      {/* Info — Date and Time first */}
      <View style={{ marginTop: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.fs28}>Date:</Text>
          <Text style={S.fs28}>{formatDate(new Date(data.openedAt))}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={S.fs28}>Time:</Text>
          <Text style={S.fs28}>
            {(() => {
              const openD = new Date(data.openedAt)
              const closeD = data.closedAt ? new Date(data.closedAt) : new Date()
              const formatTime = (d: Date) => {
                const hh = String(d.getHours()).padStart(2, '0')
                const mm = String(d.getMinutes()).padStart(2, '0')
                return `${hh}:${mm}`
              }
              return `${formatTime(openD)} - ${formatTime(closeD)}`
            })()}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={S.fs28}>Device:</Text>
          <Text style={S.fs28}>{data.posDeviceName}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
          <Text style={S.fs28}>Total Orders:</Text>
          <Text style={S.fs28}>{data.totalOrders}</Text>
        </View>
      </View>

      <DashedLine />

      {/* Staff Breakdown */}
      <Text style={{ ...S.fs32b, textAlign: 'center', marginBottom: 4 }}>Staff Breakdown</Text>
      <DashedLine />

      {data.staffSummaries.map((staff, index) => (
        <View key={index} style={{ marginBottom: 6 }}>
          {/* Staff Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              backgroundColor: '#f3f4f6',
              paddingHorizontal: 4,
              paddingVertical: 2,
            }}
          >
            <Text style={S.fs30b}>Staff:</Text>
            <Text style={S.fs28}>{staff.staffName}</Text>
          </View>

          <View style={{ paddingHorizontal: 4, marginTop: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.fs28}>Orders:</Text>
              <Text style={S.fs28}>{staff.orderCount}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.fs28n}> Cash:</Text>
              <Text style={S.fs28n} numberOfLines={1}>
                {fmt(staff.cashAmount)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.fs28n}> QR:</Text>
              <Text style={S.fs28n} numberOfLines={1}>
                {fmt(staff.qrAmount)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.fs28n}> Card:</Text>
              <Text style={S.fs28n} numberOfLines={1}>
                {fmt(staff.cardAmount)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.fs28n}> Debt:</Text>
              <Text style={S.fs28n} numberOfLines={1}>
                {fmt(staff.debtAmount)}
              </Text>
            </View>
            <DashedLine />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.fs30b}> Subtotal:</Text>
              <Text style={S.fs30b} numberOfLines={1}>
                {fmt(staff.totalRevenue)}
              </Text>
            </View>
          </View>

          {index < data.staffSummaries.length - 1 && (
            <View style={{ marginTop: 4 }}>
              <DashedLine />
            </View>
          )}
        </View>
      ))}

      <DashedLine />

      {/* Grand Totals */}
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.fs28n}>Total Cash:</Text>
          <Text style={S.fs28n} numberOfLines={1}>
            {fmt(data.grandCash)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.fs28n}>Total QR:</Text>
          <Text style={S.fs28n} numberOfLines={1}>
            {fmt(data.grandQr)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.fs28n}>Total Card:</Text>
          <Text style={S.fs28n} numberOfLines={1}>
            {fmt(data.grandCard)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.fs28n}>Total Debt:</Text>
          <Text style={S.fs28n} numberOfLines={1}>
            {fmt(data.grandDebt)}
          </Text>
        </View>
        <DashedLine />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.fs36b}>GRAND TOTAL:</Text>
          <Text style={S.fs36b} numberOfLines={1}>
            {fmt(data.grandTotal)}
          </Text>
        </View>
      </View>
    </ReceiptWrapper>
  )
}
