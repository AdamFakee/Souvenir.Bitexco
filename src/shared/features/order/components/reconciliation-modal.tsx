import { Button, IconButton, ModalBase } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { OrderRemoteAPI } from '@/shared/features/order/api/remote/order.remote.api'
import { PrinterService } from '@/shared/services'
import { toast } from '@/shared/store'
import { formatCurrency, formatDateTime } from '@/shared/utils'
import { Printer, X } from 'lucide-react-native'
import React, { memo, useRef, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ReconciliationReceiptData,
  ReconciliationReceiptTemplate,
} from './reconciliation-receipt-template'

/** Params nhẹ mà parent truyền vào — modal tự query API */
export interface ReconciliationOpenParams {
  ownerName: string
  ownerCode: string
  ownerType: 'collaborator' | 'agent'
  /** ID đối tác (Đối tác) */
  partnerId?: string | null
  /** ID CTV / HDV */
  affiliateId?: string | null
  dateFrom: Date
  dateTo: Date
  /** Mock data to bypass API fetch */
  mockData?: ReconciliationReceiptData
}

export interface ReconciliationModalRef {
  open: (params: ReconciliationOpenParams) => void
  close: () => void
}

interface ReconciliationModalProps {}

export const ReconciliationModal = memo(
  React.forwardRef<ReconciliationModalRef, ReconciliationModalProps>((_, ref) => {
    const [visible, setVisible] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [receiptData, setReceiptData] = useState<ReconciliationReceiptData | null>(null)
    const [isPrinting, setIsPrinting] = useState(false)
    const printRef = useRef<View>(null)

    React.useImperativeHandle(ref, () => ({
      open: (params) => {
        // Reset state rồi mở modal trước
        setReceiptData(null)
        setError(null)
        setVisible(true)

        if (params.mockData) {
          setReceiptData(params.mockData)
          setIsLoading(false)
          return
        }

        setIsLoading(true)

        OrderRemoteAPI.getReconciliation({
          partnerId: params.partnerId ?? null,
          affiliateId: params.affiliateId ?? null,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        })
          .then((result) => {
            setReceiptData({
              ownerName: params.ownerName,
              ownerCode: result.ownerCode || params.ownerCode,
              ownerType: params.ownerType,
              printTime: formatDateTime(new Date()),
              totalOrdersCount: result.totalOrdersCount,
              totalRevenue: result.totalRevenue,
              commissionRate: result.commissionRate,
              commissionAmount: result.commissionAmount,
              dateFrom: result.dateFrom,
              dateTo: result.dateTo,
            })
          })
          .catch((err: any) => {
            const msg = err?.message || 'Không thể tải dữ liệu đối soát.'
            setError(msg)
          })
          .finally(() => setIsLoading(false))
      },
      close: () => setVisible(false),
    }))

    const handlePrint = async (doubleCopy: boolean) => {
      if (!printRef.current || !receiptData) return
      setIsPrinting(true)
      try {
        await PrinterService.printComponent(printRef, { doubleCopy })
        toast.success(
          `Đã in biên nhận đối soát (${doubleCopy ? '2 liên' : '1 liên'}) cho ${receiptData.ownerName}`,
          'In thành công',
        )
        setVisible(false)
      } catch (error: any) {
        toast.error(error.message || 'Không thể in biên nhận.', 'Lỗi in ấn')
      } finally {
        setIsPrinting(false)
      }
    }

    const handleClose = () => {
      setVisible(false)
      setReceiptData(null)
      setError(null)
    }

    if (!visible) return null

    return (
      <>
        {/* Hidden Container for Printing — chỉ render khi có data */}
        {receiptData && (
          <View style={{ position: 'absolute', left: -2000, top: 0 }}>
            <View collapsable={false} ref={printRef}>
              <ReconciliationReceiptTemplate data={receiptData} />
            </View>
          </View>
        )}

        <ModalBase visible={visible} onClose={handleClose} size="default" className="max-w-[600px]">
          <SafeAreaView className="gap-6 overflow-hidden rounded-3xl bg-white p-8">
            {/* Header */}
            <View className="flex-row items-center justify-between border-b border-outline-variant pb-4">
              <Text className="text-2xl font-black text-surface-on">Xác nhận đối soát</Text>
              <IconButton
                icon={X}
                size={28}
                color={COLORS.surface.onVariant}
                onPress={handleClose}
              />
            </View>

            {/* Loading skeleton */}
            {isLoading && (
              <View className="items-center justify-center gap-4 py-12">
                <ActivityIndicator size="large" color={COLORS.primary.default} />
                <Text className="text-base text-neutral-400">Đang tải dữ liệu đối soát...</Text>
              </View>
            )}

            {/* Error state */}
            {!isLoading && error && (
              <View className="items-center justify-center gap-3 py-10">
                <Text className="text-center text-base font-bold text-error">{error}</Text>
                <Button label="Đóng" variant="error" onPress={handleClose} />
              </View>
            )}

            {/* Content Body — chỉ render khi có data */}
            {!isLoading && !error && receiptData && (
              <View className="gap-4 py-2">
                <View className="flex-row items-center justify-between border-b border-surface-100 py-2">
                  <Text className="text-base font-medium text-neutral-500" numberOfLines={1}>
                    {receiptData.ownerType === 'collaborator' ? 'Cộng tác viên' : 'Đối tác'}
                  </Text>
                  <Text
                    className="ml-4 flex-1 text-right text-lg font-bold text-surface-on"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {receiptData.ownerName}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between border-b border-surface-100 py-2">
                  <Text className="text-base font-medium text-neutral-500" numberOfLines={1}>
                    Từ ngày
                  </Text>
                  <Text
                    className="ml-4 flex-1 text-right text-base font-semibold text-surface-on"
                    numberOfLines={1}
                  >
                    {receiptData.dateFrom}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between border-b border-surface-100 py-2">
                  <Text className="text-base font-medium text-neutral-500" numberOfLines={1}>
                    Đến ngày
                  </Text>
                  <Text
                    className="ml-4 flex-1 text-right text-base font-semibold text-surface-on"
                    numberOfLines={1}
                  >
                    {receiptData.dateTo}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between border-b border-surface-100 py-2">
                  <Text className="text-base font-medium text-neutral-500" numberOfLines={1}>
                    Tổng số lượng đơn
                  </Text>
                  <Text
                    className="ml-4 flex-1 text-right text-lg font-bold text-surface-on"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {receiptData.totalOrdersCount} đơn
                  </Text>
                </View>

                <View className="flex-row items-center justify-between border-b border-surface-100 py-2">
                  <Text className="text-base font-medium text-neutral-500" numberOfLines={1}>
                    Tổng doanh số
                  </Text>
                  <Text
                    className="ml-4 flex-1 text-right text-2xl font-black text-success"
                    numberOfLines={1}
                  >
                    {formatCurrency(receiptData.totalRevenue)}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between border-b border-surface-100 py-2">
                  <Text className="text-base font-medium text-neutral-500" numberOfLines={1}>
                    Tỷ lệ hoa hồng
                  </Text>
                  <Text
                    className="ml-4 flex-1 text-right text-lg font-bold text-primary"
                    numberOfLines={1}
                  >
                    {(receiptData.commissionRate * 100).toFixed(1)}%
                  </Text>
                </View>

                <View className="flex-row items-center justify-between py-2">
                  <Text className="text-base font-medium text-neutral-500" numberOfLines={1}>
                    Hoa hồng
                  </Text>
                  <Text
                    className="ml-4 flex-1 text-right text-2xl font-black text-primary"
                    numberOfLines={1}
                  >
                    {formatCurrency(receiptData.commissionAmount)}
                  </Text>
                </View>
              </View>
            )}

            {/* Action buttons — ẩn khi đang loading / error / chưa có data */}
            {!isLoading && !error && receiptData && (
              <View className="mt-2 flex-row gap-4">
                <Button
                  label="Huỷ"
                  variant="error"
                  className="flex-1"
                  onPress={handleClose}
                  disabled={isPrinting}
                />
                <Button
                  label="In 1 liên"
                  leftIcon={Printer}
                  variant="primary"
                  className="flex-1"
                  onPress={() => handlePrint(false)}
                  disabled={isPrinting}
                />
                <Button
                  label="In 2 liên"
                  leftIcon={Printer}
                  variant="primary"
                  className="flex-1"
                  onPress={() => handlePrint(true)}
                  disabled={isPrinting}
                />
              </View>
            )}
          </SafeAreaView>
        </ModalBase>
      </>
    )
  }),
)

ReconciliationModal.displayName = 'ReconciliationModal'
