import { Button, ModalBase, Shimmer } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { toast } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { useMachine } from '@xstate/react'
import { AlertTriangle, History, RefreshCw, WifiOff } from 'lucide-react-native'
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'

import { closeShiftMachine } from '../machines/close-shift.machine'
import {
  CloseShiftReceiptTemplate,
  type CloseShiftReceiptData,
} from './close-shift-receipt-template'

export interface CloseShiftModalRef {
  open: () => void
  close: () => void
}

interface CloseShiftModalProps {
  shiftId?: string
  ref?: React.Ref<CloseShiftModalRef>
}

export const CloseShiftModal = ({ shiftId, ref }: CloseShiftModalProps) => {
  const [visible, setVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        setShouldRender(true)
      }, 150)
      return () => clearTimeout(timer)
    } else {
      setShouldRender(false)
    }
  }, [visible])

  const printRef = useRef<View>(null)

  // Khởi tạo XState Machine
  const [state, send] = useMachine(closeShiftMachine, {
    input: {
      shiftId: shiftId || '',
      printRef,
    },
  })

  // Giải nén context từ XState
  const { expectedEndingCash, unsyncedCount } = state.context

  // Phản ánh trạng thái máy trạng thái
  const isChecking = state.matches('checkingSyncStatus')
  const isOffline = state.matches('offlineError')
  const isUnsynced = state.matches('unsyncedWarning')
  const isSyncing = state.matches('syncing')
  const isReady = state.matches('readyToClose')
  const isClosing = state.matches('closing')

  // Đóng modal khi máy trạng thái hoàn tất thành công chốt ca
  React.useEffect(() => {
    if (state.matches('success')) {
      const timer = setTimeout(() => {
        setVisible(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [state.value])

  useImperativeHandle(ref, () => ({
    open: () => {
      if (!shiftId) return
      setVisible(true)
      send({ type: 'START' })
    },
    close: () => {
      setVisible(false)
      send({ type: 'CANCEL' })
    },
  }))

  const onConfirmClose = () => {
    if (!shiftId) return
    toast.confirm({
      title: 'Xác nhận kết thúc ca',
      message: `Bạn có chắc chắn muốn kết thúc ca và bàn giao số tiền ${formatCurrency(expectedEndingCash)}?`,
      onConfirm: () => {
        send({ type: 'SUBMIT' })
      },
    })
  }

  // Khóa nút chốt ca khi có lỗi, đang đóng hoặc đang tải dữ liệu
  const isCloseDisabled =
    !isReady || isOffline || isUnsynced || isClosing || isChecking || isSyncing

  if (!shiftId || !visible) return null

  return (
    <ModalBase
      visible={visible}
      onClose={() => {
        if (isClosing) return
        setVisible(false)
        send({ type: 'CANCEL' })
      }}
      dismissible={!isClosing}
      className="w-[840px] max-w-[840px] overflow-hidden rounded-[36px] bg-surface-50"
    >
      {shouldRender ? (
        <View className="bg-surface-50 px-10 pb-10 pt-10">
          <KeyboardAwareScrollView showsVerticalScrollIndicator={false} bottomOffset={32}>
            <View className="overflow-hidden rounded-[32px] border border-surface-200 bg-white p-8 shadow-sm">
              <View className="items-center justify-center px-4 py-2">
                <View
                  style={{ width: 96, height: 96 }}
                  className="items-center justify-center rounded-full bg-primary/10"
                >
                  <History size={52} color={COLORS.primary.default} />
                </View>
                <Text className="mt-5 text-center text-3xl font-black text-surface-on">
                  Kết thúc ca làm việc
                </Text>
                <Text className="mt-2.5 max-w-[600px] text-center text-[20px] leading-7 text-neutral-500">
                  Số tiền kết ca được tính tự động dựa trên số liệu doanh thu thực tế.
                </Text>
              </View>

              {isOffline && (
                <View className="mt-6 flex-row items-center gap-5 rounded-[24px] border border-error/20 bg-error-container/20 p-6">
                  <WifiOff size={38} color={COLORS.error.default} />
                  <View className="flex-1">
                    <Text className="text-[23px] font-black text-error">
                      Thiết bị đang ngoại tuyến
                    </Text>
                    <Text className="mt-1 text-[19px] leading-6 text-slate-600">
                      Vui lòng kiểm tra kết nối mạng trước khi kết ca.
                    </Text>
                  </View>
                  <Button
                    label="Thử lại"
                    variant="primary"
                    className="h-16 rounded-[18px] border-error bg-error px-7"
                    textClassName="text-white text-[21px] font-bold"
                    onPress={() => send({ type: 'RETRY' })}
                  />
                </View>
              )}

              {(isUnsynced || isSyncing) && (
                <View className="mt-6 flex-row items-center gap-5 rounded-[24px] border border-amber-200 bg-amber-50 p-6">
                  <AlertTriangle size={38} color="#D97706" />
                  <View className="flex-1">
                    <Text className="text-[23px] font-black text-amber-800">
                      Còn {unsyncedCount} đơn chưa đồng bộ
                    </Text>
                    <Text className="mt-1 text-[19px] leading-6 text-amber-700">
                      Đồng bộ tất cả đơn hàng trước khi kết ca để số liệu chuẩn xác.
                    </Text>
                  </View>
                  <Button
                    label="Đồng bộ ngay"
                    variant="primary"
                    loading={isSyncing}
                    leftIcon={RefreshCw}
                    className="h-16 rounded-[18px] border-amber-600 bg-amber-600 px-7"
                    textClassName="text-white text-[21px] font-bold"
                    onPress={() => send({ type: 'SYNC' })}
                  />
                </View>
              )}

              {(isChecking || isClosing) && (
                <View className="mt-6 gap-4 rounded-[24px] border border-outline-variant bg-surface-50 p-6">
                  <Text className="text-[23px] font-black text-surface-on">
                    {isChecking ? 'Đang tính toán số liệu kết ca...' : 'Đang tiến hành đóng ca...'}
                  </Text>
                  <Shimmer className="h-[54px] w-full rounded-xl" />
                  <Shimmer className="h-[54px] w-2/3 rounded-xl" />
                </View>
              )}

              {isReady && (
                <>
                  <View className="mt-6 items-center rounded-[28px] border-2 border-primary/20 bg-primary/[0.04] p-8">
                    <Text className="text-[19px] font-bold uppercase tracking-wider text-primary">
                      Tổng tiền mặt kết ca bàn giao
                    </Text>
                    <Text
                      className="mt-3 text-[52px] font-black tracking-tight text-primary"
                      numberOfLines={1}
                    >
                      {formatCurrency(expectedEndingCash)}
                    </Text>
                    <View className="mt-3 flex-row items-center gap-2 rounded-full bg-primary/10 px-5 py-2">
                      <Text className="text-[17px] font-semibold text-primary">
                        Tiền đầu ca + Doanh thu tiền mặt
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </KeyboardAwareScrollView>

          <View className="mx-auto mt-6 w-full flex-row gap-5">
            <Button
              label="Hủy bỏ"
              variant="outline"
              className="h-18 flex-1 rounded-[21px] border-surface-200 bg-white"
              textClassName="text-[23px] font-bold text-neutral-500"
              onPress={() => {
                setVisible(false)
                send({ type: 'CANCEL' })
              }}
              disabled={isClosing}
            />
            <Button
              label="Xác nhận kết ca"
              variant="primary"
              className="h-18 flex-1 rounded-[21px]"
              textClassName="text-[23px] font-bold text-white"
              loading={isClosing}
              disabled={isCloseDisabled}
              onPress={onConfirmClose}
            />
          </View>
        </View>
      ) : (
        <View style={{ height: 350, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary.default} />
        </View>
      )}

      {/* Hidden container for printing Z-Report */}
      {state.context.zReportData && (
        <View style={{ position: 'absolute', left: -2000, top: 0 }}>
          <View collapsable={false} ref={printRef}>
            <CloseShiftReceiptTemplate data={mapZReportToReceiptData(state.context.zReportData)} />
          </View>
        </View>
      )}
    </ModalBase>
  )
}

const mapZReportToReceiptData = (zReport: any): CloseShiftReceiptData => {
  const session = zReport?.session || {}
  const paymentBreakdown = zReport?.paymentBreakdown || []

  const grandCash = paymentBreakdown.find((p: any) => p.method === 'cash')?.amount || 0
  const grandQr = paymentBreakdown.find((p: any) => p.method === 'qr_bidv')?.amount || 0
  const grandCard = paymentBreakdown.find((p: any) => p.method === 'card_bidv')?.amount || 0
  const grandDebt =
    paymentBreakdown.find((p: any) => p.method === 'cong_no' || p.method === 'debt')?.amount || 0
  const grandTotal = grandCash + grandQr + grandCard + grandDebt

  const staffSummaries = (zReport?.staffs || []).map((s: any) => ({
    staffName: s.staffName || '',
    staffCode: s.staffCode || '',
    orderCount: s.orderCount || 0,
    cashAmount: s.cashAmount || 0,
    qrAmount: s.qrAmount || 0,
    cardAmount: s.cardAmount || 0,
    debtAmount: s.debtAmount || 0,
    totalRevenue: s.totalRevenue || 0,
  }))

  return {
    shiftCode: session.code || '',
    shiftTime: '---',
    openedAt:
      session.openedAt ||
      session.opened_at ||
      session.startedAt ||
      session.started_at ||
      session.createdAt ||
      session.created_at ||
      zReport?.openedAt ||
      zReport?.opened_at ||
      new Date().toISOString(),
    closedAt:
      session.closedAt ||
      session.closed_at ||
      session.endedAt ||
      session.ended_at ||
      zReport?.closedAt ||
      zReport?.closed_at ||
      new Date().toISOString(),
    posDeviceName: zReport?.posDeviceName || 'Máy POS',
    totalOrders: zReport?.orderCount || 0,
    staffSummaries,
    grandCash,
    grandQr,
    grandCard,
    grandDebt,
    grandTotal,
  }
}
