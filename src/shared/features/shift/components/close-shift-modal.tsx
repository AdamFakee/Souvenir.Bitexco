import { Button, Chip, ModalBase, Shimmer } from '@/shared/components/ui'
import { ControlledInput } from '@/shared/components/ui/form'
import { COLORS } from '@/shared/constants'
import { toast } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { useMachine } from '@xstate/react'
import { AlertTriangle, History, RefreshCw, WifiOff } from 'lucide-react-native'
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { ActivityIndicator, Text, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'

import {
  CloseShiftReceiptTemplate,
  type CloseShiftReceiptData,
} from '@/shared/features/order/components/close-shift-receipt-template'
import { closeShiftMachine } from '../machines/close-shift.machine'
import { closeShiftSchema, type CloseShiftInput } from '../validations/close-shift.validation'

export interface CloseShiftModalRef {
  open: () => void
  close: () => void
}

interface CloseShiftModalProps {
  shiftId?: string
  ref?: React.Ref<CloseShiftModalRef>
}

const DISCREPANCY_REASONS = [
  'Thối nhầm tiền',
  'Thu thiếu tiền',
  'Chi tiền mặt chưa ghi',
  'Nhập sai hóa đơn',
  'Bàn giao thiếu',
  'Hoàn tiền cho khách',
  'Khác',
]

export const CloseShiftModal = ({ shiftId, ref }: CloseShiftModalProps) => {
  const [visible, setVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const [showManualInput, setShowManualInput] = useState(false)

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

  const { control, handleSubmit, watch, reset, setValue } = useForm<CloseShiftInput>({
    resolver: valibotResolver(closeShiftSchema),
    defaultValues: {
      actualEndingCash: '',
      discrepancyReason: '',
    },
  })

  const actualValue = watch('actualEndingCash')
  const actualEndingCashNum = Number(actualValue) || 0
  const isDiscrepancy = actualEndingCashNum !== expectedEndingCash
  const currentReason = watch('discrepancyReason')

  // Phản hồi reactive từ Form sang XState Machine Context
  React.useEffect(() => {
    send({ type: 'SET_ACTUAL_CASH', amount: actualEndingCashNum })
  }, [actualEndingCashNum, send])

  React.useEffect(() => {
    send({ type: 'SET_DISCREPANCY_REASON', reason: currentReason || '' })
  }, [currentReason, send])

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
      setShowManualInput(false)
      reset({
        actualEndingCash: '',
        discrepancyReason: '',
      })
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
      message: 'Bạn có chắc chắn muốn kết thúc ca làm việc này?',
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
      className="w-[936px] max-w-[936px] overflow-hidden rounded-[36px] bg-surface-50"
    >
      {shouldRender ? (
        <View className="bg-surface-50 px-10 pb-10 pt-10">
          <KeyboardAwareScrollView showsVerticalScrollIndicator={false} bottomOffset={32}>
            <View className="overflow-hidden rounded-[36px] border border-surface-200 bg-white px-10 py-10 shadow-sm">
              <View className="items-center justify-center px-4 py-2">
                <View
                  style={{ width: 104, height: 104 }}
                  className="items-center justify-center rounded-full bg-primary/10"
                >
                  <History size={57} color={COLORS.primary.default} />
                </View>
                <Text className="mt-5 text-center text-3xl font-black text-surface-on">
                  Kết thúc ca
                </Text>
                <Text className="mt-3 max-w-[650px] text-center text-[21px] leading-7 text-neutral-600">
                  Kiểm đếm tiền mặt tại quầy trước khi kết ca.
                </Text>
              </View>

              {isOffline && (
                <View className="mt-5 flex-row items-center gap-5 rounded-[26px] border border-error/20 bg-error-container/20 p-8">
                  <WifiOff size={42} color={COLORS.error.default} />
                  <View className="flex-1">
                    <Text className="text-[26px] font-black text-error">
                      Thiết bị đang ngoại tuyến
                    </Text>
                    <Text className="mt-1 text-[21px] leading-7 text-slate-600">
                      Vui lòng kiểm tra Wifi trước khi kết ca.
                    </Text>
                  </View>
                  <Button
                    label="Thử lại"
                    variant="primary"
                    className="h-18 rounded-[21px] border-error bg-error px-8"
                    textClassName="text-white text-[23px] font-bold"
                    onPress={() => send({ type: 'RETRY' })}
                  />
                </View>
              )}

              {(isUnsynced || isSyncing) && (
                <View className="mt-5 flex-row items-center gap-5 rounded-[26px] border border-amber-200 bg-amber-50 p-8">
                  <AlertTriangle size={42} color="#D97706" />
                  <View className="flex-1">
                    <Text className="text-[26px] font-black text-amber-800">
                      Còn {unsyncedCount} đơn chưa đồng bộ
                    </Text>
                    <Text className="mt-1 text-[21px] leading-7 text-amber-700">
                      Đồng bộ đơn hàng trước khi kết ca.
                    </Text>
                  </View>
                  <Button
                    label="Đồng bộ"
                    variant="primary"
                    loading={isSyncing}
                    leftIcon={RefreshCw}
                    className="h-18 rounded-[21px] border-amber-600 bg-amber-600 px-8"
                    textClassName="text-white text-[23px] font-bold"
                    onPress={() => send({ type: 'SYNC' })}
                  />
                </View>
              )}

              {(isChecking || isClosing) && (
                <View className="mt-5 gap-5 rounded-[26px] border border-outline-variant bg-surface-50 p-8">
                  <Text className="text-[26px] font-black text-surface-on">
                    {isChecking ? 'Đang kiểm tra số liệu chốt ca...' : 'Đang đóng ca.'}
                  </Text>
                  <Shimmer className="h-[62px] w-full rounded-xl" />
                  <Shimmer className="h-[62px] w-3/4 rounded-xl" />
                </View>
              )}

              {isReady && (
                <View className="mt-5">
                  <Text className="mb-2 text-[23px] font-black text-surface-on">Số dư thực tế</Text>
                  <View className="relative">
                    <ControlledInput
                      control={control}
                      name="actualEndingCash"
                      keyboardType="numeric"
                      className="h-[104px] rounded-[23px] border-2 border-outline-variant bg-white px-8 text-[49px] font-black text-surface-on"
                      placeholder="0"
                      formatValue={(val) => {
                        if (!val) return ''
                        return formatCurrency(Number(val.toString().replace(/\D/g, '')), {
                          showSymbol: false,
                        })
                      }}
                      onChangeText={(text) => {
                        const numericValue = text.replace(/\D/g, '')
                        setValue('actualEndingCash', numericValue as any, {
                          shouldValidate: true,
                        })
                      }}
                    />
                    <View className="absolute right-8 top-[24%]">
                      <Text className="text-[39px] font-black text-muted/30">đ</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            <View className="mx-auto mt-4 w-full rounded-[26px] border border-surface-200 bg-white px-8 py-5 shadow-sm">
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-[23px] font-semibold text-neutral-600">Tiền mặt dự kiến</Text>
                {isChecking ? (
                  <Shimmer className="h-7 w-40 rounded-xl" />
                ) : (
                  <Text className="text-[26px] font-black text-primary" numberOfLines={1}>
                    {formatCurrency(expectedEndingCash)}
                  </Text>
                )}
              </View>

              {isReady && (
                <View className="flex-row items-center justify-between py-2">
                  <Text className="text-[23px] font-semibold text-neutral-600">
                    Thực tế kiểm đếm
                  </Text>
                  <Text className="text-[26px] font-black text-neutral-900" numberOfLines={1}>
                    {formatCurrency(actualEndingCashNum)}
                  </Text>
                </View>
              )}

              {isDiscrepancy && (isReady || isClosing) && (
                <View className="mt-3 border-t border-surface-200 pt-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[26px] font-bold text-neutral-900">Chênh lệch</Text>
                    <Text
                      className={`text-[39px] font-black tracking-[-0.5px] ${actualEndingCashNum > expectedEndingCash ? 'text-success' : 'text-error'}`}
                    >
                      {actualEndingCashNum > expectedEndingCash ? '+' : ''}
                      {formatCurrency(actualEndingCashNum - expectedEndingCash)}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {(isDiscrepancy || isReady === false) && (
              <View className="mx-auto mt-4 w-full rounded-[26px] border border-surface-200 bg-white px-8 py-5 shadow-sm">
                <Text className="text-[23px] font-black text-surface-on">Lý do chênh lệch</Text>
                <View className="mt-4 flex-row flex-wrap gap-3">
                  {DISCREPANCY_REASONS.map((reason) => {
                    const isActive =
                      (reason === 'Khác' && showManualInput) ||
                      (!showManualInput && currentReason === reason)
                    return (
                      <Chip
                        key={reason}
                        label={reason}
                        active={isActive}
                        onPress={() => {
                          if (!isReady) return
                          if (reason === 'Khác') {
                            setShowManualInput(true)
                            setValue('discrepancyReason', '')
                          } else {
                            setShowManualInput(false)
                            setValue('discrepancyReason', reason)
                          }
                        }}
                        disabled={!isReady}
                        className="self-start rounded-2xl px-5 py-3"
                        textClassName="text-[21px] font-bold"
                      />
                    )
                  })}
                </View>

                {showManualInput && (
                  <ControlledInput
                    control={control}
                    name="discrepancyReason"
                    placeholder="Nhập ghi chú chi tiết..."
                    multiline
                    numberOfLines={2}
                    required
                    editable={isReady}
                    className="mt-4 rounded-[21px] border border-outline-variant bg-white text-[23px] font-medium text-surface-on"
                    textAlignVertical="top"
                  />
                )}
              </View>
            )}
          </KeyboardAwareScrollView>

          <View className="mx-auto mt-5 w-full flex-row gap-5">
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
              label="Xác nhận đóng ca"
              variant="error"
              className="h-18 flex-1 rounded-[21px]"
              textClassName="text-[23px] font-bold"
              loading={isClosing}
              disabled={isCloseDisabled}
              onPress={handleSubmit(onConfirmClose)}
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
    openedAt: session.openedAt || new Date().toISOString(),
    closedAt: session.closedAt || new Date().toISOString(),
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
