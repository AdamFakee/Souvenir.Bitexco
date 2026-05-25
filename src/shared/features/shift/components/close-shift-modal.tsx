import { Button, Chip, IconButton, ModalBase, Shimmer } from '@/shared/components/ui'
import { ControlledInput } from '@/shared/components/ui/form'
import { COLORS } from '@/shared/constants'
import { toast } from '@/shared/store'
import { formatCurrency } from '@/shared/utils'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { useMachine } from '@xstate/react'
import { AlertTriangle, History, RefreshCw, WifiOff, X } from 'lucide-react-native'
import React, { useImperativeHandle, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Text, useWindowDimensions, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'

// Relative imports to avoid circular dependencies
import { closeShiftMachine } from '../machines/close-shift.machine'
import { closeShiftSchema, type CloseShiftInput } from '../validations/close-shift.validation'
import { ZReportPrintTemplate } from './z-report-print-template'

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
  const [showManualInput, setShowManualInput] = useState(false)
  const zReportRef = useRef(null)

  const { height: screenHeight } = useWindowDimensions()

  // Khởi tạo XState Machine
  const [state, send] = useMachine(closeShiftMachine, {
    input: {
      shiftId: shiftId || '',
      printRef: zReportRef,
    },
  })

  // Giải nén context từ XState
  const { expectedEndingCash, actualEndingCash, discrepancyReason, unsyncedCount, zReportData } =
    state.context

  // Phản ánh trạng thái máy trạng thái
  const isChecking = state.matches('checkingSyncStatus')
  const isOffline = state.matches('offlineError')
  const isUnsynced = state.matches('unsyncedWarning')
  const isSyncing = state.matches('syncing')
  const isReady = state.matches('readyToClose')
  const isClosing = state.matches('closing') || state.matches('printing')

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
      message: 'Bạn có chắc chắn muốn kết thúc ca làm việc này và IN BÁO CÁO Z-REPORT không?',
      onConfirm: () => {
        send({ type: 'SUBMIT' })
      },
    })
  }

  // Khóa nút chốt ca khi có lỗi, đang đóng hoặc đang tải dữ liệu
  const isCloseDisabled = !isReady || isClosing || isChecking || isSyncing

  if (!shiftId) return null

  return (
    <ModalBase
      visible={visible}
      onClose={() => {
        if (isClosing) return
        setVisible(false)
        send({ type: 'CANCEL' })
      }}
      dismissible={!isClosing}
      className="mx-auto w-[1200px] rounded-[48px] bg-background shadow-2xl"
    >
      <View className="p-0">
        {/* Hidden Z-Report printable component */}
        {zReportData && (
          <View style={{ position: 'absolute', left: -3000, top: 0 }}>
            <View collapsable={false} ref={zReportRef}>
              <ZReportPrintTemplate data={zReportData} />
            </View>
          </View>
        )}

        {/* Header - POS Style */}
        <View className="flex-row items-center justify-between border-b border-outline-variant bg-white px-10 py-6">
          <View className="flex-row items-center gap-6">
            <History size={40} color={COLORS.primary.default} />
            <Text className="text-4xl font-black text-surface-on">Kết thúc ca</Text>
          </View>
          <IconButton
            icon={X}
            size={32}
            color={COLORS.surface.onVariant}
            onPress={() => {
              setVisible(false)
              send({ type: 'CANCEL' })
            }}
            disabled={isClosing}
          />
        </View>

        <View className="flex-row" style={{ height: screenHeight * 0.75 }}>
          {/* Left Column: Summary (POS Sidebar Style) */}
          <View className="w-[480px] justify-between bg-white p-10">
            <View>
              <View className="gap-10">
                <View className="rounded-3xl border border-primary/10 bg-primary/5 p-8">
                  <Text className="mb-2 text-xl font-black uppercase tracking-widest text-primary/70">
                    Tiền mặt dự kiến
                  </Text>
                  {isChecking ? (
                    <Shimmer className="h-16 w-full rounded-2xl" />
                  ) : (
                    <Text
                      className="text-6xl font-black tracking-tighter text-primary"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {formatCurrency(expectedEndingCash)}
                    </Text>
                  )}
                </View>

                {isDiscrepancy && (isReady || isClosing) && (
                  <View className="rounded-3xl border border-error/10 bg-error-container/10 p-8">
                    <Text className="mb-2 text-xl font-black uppercase tracking-widest text-error">
                      Chênh lệch
                    </Text>
                    <Text
                      className={`text-6xl font-black ${actualEndingCashNum > expectedEndingCash ? 'text-success' : 'text-error'}`}
                    >
                      {actualEndingCashNum > expectedEndingCash ? '+' : ''}
                      {formatCurrency(actualEndingCashNum - expectedEndingCash)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View className="rounded-3xl border border-outline-variant/50 bg-surface-100 p-8">
              <Text className="text-xl font-bold italic leading-relaxed text-muted">
                * Vui lòng kiểm đếm chính xác số tiền mặt hiện có tại quầy để đảm bảo tính minh bạch
                của ca làm việc.
              </Text>
            </View>
          </View>

          {/* Right Column: Interaction (Main Content) */}
          <View className="flex-1 border-l border-outline-variant bg-surface-50 p-10">
            <KeyboardAwareScrollView showsVerticalScrollIndicator={false} bottomOffset={40}>
              <View className="gap-12">
                {/* 1. Network Warning Banner */}
                {isOffline && (
                  <View className="flex-row items-center gap-4 rounded-3xl border border-error/20 bg-error-container/20 p-6">
                    <WifiOff size={28} color={COLORS.error.default} />
                    <View className="flex-1">
                      <Text className="text-xl font-black text-error">
                        Thiết bị đang ngoại tuyến
                      </Text>
                      <Text className="mt-1 text-lg text-slate-600">
                        Kết ca trực tuyến bắt buộc kết nối mạng ổn định. Vui lòng kiểm tra Wifi.
                      </Text>
                    </View>
                    <Button
                      label="Thử lại"
                      variant="primary"
                      className="h-14 rounded-2xl border-error bg-error px-6 active:opacity-90"
                      textClassName="text-white text-lg font-bold"
                      onPress={() => send({ type: 'RETRY' })}
                    />
                  </View>
                )}

                {/* 2. Unsynced Orders Warning Banner */}
                {(isUnsynced || isSyncing) && (
                  <View className="flex-row items-center gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-6">
                    <AlertTriangle size={28} color="#D97706" />
                    <View className="flex-1">
                      <Text className="text-xl font-black text-amber-800">
                        Đơn hàng chưa đồng bộ ({unsyncedCount} đơn)
                      </Text>
                      <Text className="mt-1 text-lg text-amber-700">
                        Hệ thống phát hiện còn đơn hàng local chưa đồng bộ. Vui lòng đồng bộ trước
                        khi kết ca.
                      </Text>
                    </View>
                    <Button
                      label="Đồng bộ ngay"
                      variant="primary"
                      loading={isSyncing}
                      leftIcon={RefreshCw}
                      className="h-14 rounded-2xl border-amber-600 bg-amber-600 px-6 active:opacity-90"
                      textClassName="text-white text-lg font-bold"
                      onPress={() => send({ type: 'SYNC' })}
                    />
                  </View>
                )}

                {/* 3. Loading Checker/Closing Shimmer */}
                {(isChecking || isClosing) && (
                  <View className="gap-6 rounded-3xl border border-outline-variant bg-white p-8">
                    <Text className="text-2xl font-black text-surface-on">
                      {isChecking
                        ? 'Đang kiểm tra kết nối & số liệu chốt ca...'
                        : 'Đang gửi dữ liệu đối soát & in Z-Report...'}
                    </Text>
                    <Shimmer className="h-12 w-full rounded-xl" />
                    <Shimmer className="h-12 w-3/4 rounded-xl" />
                  </View>
                )}

                {/* 4. Main form only shown when XState machine is ready */}
                {isReady && (
                  <View className="gap-12">
                    <View>
                      <Text className="mb-6 text-2xl font-black uppercase tracking-widest text-surface-on">
                        Nhập số dư thực tế kiểm đếm:
                      </Text>
                      <View className="relative">
                        <ControlledInput
                          control={control}
                          name="actualEndingCash"
                          keyboardType="numeric"
                          className="h-32 rounded-3xl border-2 border-outline-variant bg-white px-10 text-7xl font-black text-surface-on"
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
                        <View className="absolute right-10 top-[25%]">
                          <Text className="text-5xl font-black text-muted/30">đ</Text>
                        </View>
                      </View>
                    </View>

                    {isDiscrepancy && (
                      <View className="gap-6">
                        <Text className="text-2xl font-black uppercase tracking-widest text-surface-on">
                          Lý do chênh lệch:
                        </Text>
                        <View className="flex-row flex-wrap gap-4">
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
                                  if (reason === 'Khác') {
                                    setShowManualInput(true)
                                    setValue('discrepancyReason', '')
                                  } else {
                                    setShowManualInput(false)
                                    setValue('discrepancyReason', reason)
                                  }
                                }}
                                className="h-18 self-start px-8 py-4"
                                textClassName="text-xl font-black"
                              />
                            )
                          })}
                        </View>

                        {showManualInput && (
                          <ControlledInput
                            control={control}
                            name="discrepancyReason"
                            placeholder="Nhập ghi chú lý do chi tiết..."
                            multiline
                            numberOfLines={2}
                            required
                            className="rounded-3xl border border-outline-variant bg-white text-2xl font-bold text-surface-on"
                            textAlignVertical="top"
                          />
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            </KeyboardAwareScrollView>

            {/* Buttons Grouped at Bottom */}
            <View className="mt-10 flex-row gap-6">
              <Button
                label="HỦY BỎ"
                variant="outline"
                className="h-24 flex-1 rounded-[32px] border-2"
                textClassName="text-2xl font-black"
                onPress={() => {
                  setVisible(false)
                  send({ type: 'CANCEL' })
                }}
                disabled={isClosing}
              />
              <Button
                label="XÁC NHẬN ĐÓNG CA"
                variant="error"
                className="h-24 flex-1 rounded-[32px]"
                textClassName="text-2xl font-black"
                loading={isClosing}
                disabled={isCloseDisabled}
                onPress={handleSubmit(onConfirmClose)}
              />
            </View>
          </View>
        </View>
      </View>
    </ModalBase>
  )
}
