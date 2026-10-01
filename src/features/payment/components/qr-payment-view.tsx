import QRIcon from '@/assets/icons/QR.svg'
import { Button, ModalBase, Shimmer } from '@/shared/components/ui'
import { BitexcoReceiptTemplate } from '@/features/order/components/bitexco-receipt-template'
import { formatCurrency } from '@/shared/utils'
import { AlertCircle, CheckCircle, Clock3 } from 'lucide-react-native'
import React, { memo } from 'react'
import { Image, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

export type QrPaymentViewProps = {
  visible: boolean
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  canRetry: boolean
  canCancel: boolean
  qrContent: string | null
  error: string | null
  retryCount: number
  timeLeft: string
  subtotal: number
  discount: number
  total: number
  receiptOrder: any | null
  staffName?: string
  printRef?: React.RefObject<any>
  isForceCapturing?: boolean
  isProcessing?: boolean
  onCancel: () => void
  onRetry: () => void
  onCheckStatus: () => void
  onForceComplete: () => void
}

/** Pure QR payment UI — no machine, no POS/exchange knowledge */
export const QrPaymentView = memo(function QrPaymentView({
  visible,
  isLoading,
  isSuccess,
  isError,
  canRetry,
  canCancel,
  qrContent,
  error,
  retryCount,
  timeLeft,
  subtotal,
  discount,
  total,
  receiptOrder,
  staffName,
  printRef,
  isForceCapturing = false,
  isProcessing = false,
  onCancel,
  onRetry,
  onCheckStatus,
  onForceComplete,
}: QrPaymentViewProps) {
  const renderQrStage = () => {
    if (isError) {
      return (
        <View className="h-[400px] w-full items-center justify-center px-4">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-error/10">
            <AlertCircle size={60} color="#dd2027" />
          </View>
          <Text className="mt-6 text-center text-3xl font-bold text-error">
            Thanh toán chưa hoàn tất
          </Text>
          <Text className="mt-3 max-w-[320px] text-center text-lg leading-7 text-neutral-600">
            {error ?? 'Vui lòng thử lại.'}
          </Text>
          {retryCount > 0 && (
            <Text className="mt-4 text-center text-sm font-semibold uppercase tracking-[0.2em] text-error">
              Lần thử {retryCount} / 3
            </Text>
          )}
        </View>
      )
    }

    if (qrContent) {
      const isUrl = qrContent.startsWith('http')
      return (
        <View className="h-[400px] w-full items-center justify-center px-4">
          <View className="rounded-[22px] border border-surface-200 bg-white p-3 shadow-sm">
            {isUrl ? (
              <Image
                source={{ uri: qrContent }}
                style={{ width: 210, height: 210 }}
                resizeMode="contain"
              />
            ) : (
              <QRCode value={qrContent} size={210} color="black" backgroundColor="white" />
            )}
          </View>
          <Text className="mt-3 text-center text-lg font-bold text-neutral-800">
            Đang chờ thanh toán QR
          </Text>
          <View className="mt-2 flex-row items-center gap-2 rounded-full border border-orange-300 bg-white px-4 py-1.5">
            <Clock3 size={18} color="#fb8c00" />
            <Text className="text-xl font-black tracking-[1px] text-[#fb8c00]">{timeLeft}</Text>
          </View>
        </View>
      )
    }

    return (
      <View className="h-[400px] w-full items-center justify-center px-4">
        <View className="flex h-[210px] w-[210px] items-center justify-center overflow-hidden rounded-[22px] border border-surface-200 bg-surface-100 shadow-sm">
          {isLoading ? (
            <Shimmer className="h-[150px] w-[150px] rounded-[18px]" />
          ) : (
            <View className="h-[150px] w-[150px] items-center justify-center rounded-[18px] bg-primary">
              <QRIcon width={72} height={72} />
            </View>
          )}
        </View>
        <Text className="mt-4 text-center text-lg font-bold text-neutral-800">
          Đang khởi tạo mã QR...
        </Text>
        <View className="mt-3 flex-row items-center gap-2 rounded-full border border-orange-300 bg-white px-4 py-1.5">
          <Clock3 size={18} color="#fb8c00" />
          <Text className="text-xl font-black tracking-[1px] text-[#fb8c00]">--:--</Text>
        </View>
      </View>
    )
  }

  return (
    <ModalBase
      visible={visible}
      onClose={onCancel}
      dismissible={!isLoading}
      className="max-w-[600px] overflow-hidden rounded-[28px] bg-surface-50"
    >
      {visible && (
        <>
          <View className="bg-surface-50 px-6 pb-6 pt-4">
            <View className="h-[400px] overflow-hidden rounded-[32px] border border-surface-200 bg-white px-6 py-2 shadow-sm">
              <View className="items-center">{renderQrStage()}</View>
            </View>

            <View className="mx-auto mt-4 w-full rounded-[24px] border border-surface-200 bg-white px-6 py-5 shadow-sm">
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-[21px] font-semibold text-neutral-600">Tạm tính</Text>
                <Text className="text-[21px] font-semibold text-neutral-700" numberOfLines={1}>
                  {formatCurrency(subtotal)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-[21px] font-semibold text-neutral-600">Giảm giá</Text>
                <Text className="text-[21px] font-semibold text-emerald-600" numberOfLines={1}>
                  {formatCurrency(discount)}
                </Text>
              </View>
              <View className="mt-2 border-t border-surface-200 pt-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[23px] font-bold text-neutral-900">Tổng cộng</Text>
                  <Text className="text-[35px] font-black tracking-[-0.5px] text-primary">
                    {formatCurrency(total)}
                  </Text>
                </View>
              </View>
            </View>

            <View className="mx-auto mt-4 min-h-[216px] w-full max-w-[640px] justify-end">
              {!isError && (
                <View className="gap-3">
                  <Button
                    label="Kiểm tra trạng thái QR với ngân hàng"
                    variant="primary"
                    disabled={!qrContent || isProcessing || isLoading}
                    onPress={onCheckStatus}
                    className="h-16 rounded-[18px]"
                    textClassName="text-[18px] font-bold"
                  />
                  <Button
                    label="Xác nhận khách đã chuyển, kiểm tra sau"
                    variant="primary"
                    loading={isForceCapturing}
                    disabled={!qrContent || isProcessing || isLoading}
                    onPress={onForceComplete}
                    className="h-16 rounded-[18px]"
                    textClassName="text-[18px] font-bold"
                  />
                  <Button
                    label="Hủy giao dịch"
                    variant="error"
                    disabled={(!canCancel && !isError) || isProcessing || isLoading}
                    onPress={onCancel}
                    className="h-16 rounded-[18px]"
                    textClassName="text-[18px] font-bold"
                  />
                </View>
              )}

              {isError && (
                <View className="gap-3">
                  <Button
                    label="Thử lại"
                    variant="primary"
                    disabled={!canRetry || isProcessing || isLoading}
                    onPress={onRetry}
                    className="h-16 rounded-[18px]"
                    textClassName="text-[18px] font-bold"
                  />
                  <Button
                    label="Hủy giao dịch"
                    variant="error"
                    disabled={isProcessing || isLoading}
                    onPress={onCancel}
                    className="h-16 rounded-[18px]"
                    textClassName="text-[18px] font-bold"
                  />
                </View>
              )}
            </View>
          </View>

          <View style={{ position: 'absolute', left: -2000, top: 0 }}>
            {(isProcessing || isSuccess) && receiptOrder && (
              <View collapsable={false} ref={printRef}>
                <BitexcoReceiptTemplate order={receiptOrder} staffName={staffName} />
              </View>
            )}
          </View>
        </>
      )}
    </ModalBase>
  )
})
