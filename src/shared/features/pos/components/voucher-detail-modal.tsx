import { IconButton, ModalBase } from '@/shared/components/ui'
import { toast } from '@/shared/store/use-alert-store'
import { formatCurrency } from '@/shared/utils'
import * as Clipboard from 'expo-clipboard'
import { X } from 'lucide-react-native'
import React, { forwardRef, useImperativeHandle, useState } from 'react'
import { Text, View } from 'react-native'
import { AppliedVoucher } from '../types/cart.types'

const BRAND = '#1C4E68'
const TEXT_PRIMARY = '#303036'
const TEXT_MUTED = '#747475'
const BORDER = '#DFE0E1'

export interface VoucherDetailModalRef {
  open: (voucher: AppliedVoucher) => void
  close: () => void
}

export const VoucherDetailModal = forwardRef<VoucherDetailModalRef>((props, ref) => {
  const [visible, setVisible] = useState(false)
  const [voucher, setVoucher] = useState<AppliedVoucher | null>(null)

  useImperativeHandle(ref, () => ({
    open: (v: AppliedVoucher) => {
      setVoucher(v)
      setVisible(true)
    },
    close: () => {
      setVisible(false)
      setVoucher(null)
    },
  }))

  const handleCopy = async () => {
    if (!voucher?.code) return
    await Clipboard.setStringAsync(voucher.code)
    toast.success('Đã sao chép mã giảm giá')
  }

  if (!visible || !voucher) return null

  const getVoucherTypeLabel = (type: string) => {
    switch (type) {
      case 'PERCENTAGE':
        return 'Giảm theo phần trăm (%)'
      case 'FIXED':
        return 'Giảm số tiền cố định (đ)'
      case 'FREE_SHIPPING':
        return 'Miễn phí vận chuyển'
      case 'BUY_X_GET_Y':
        return 'Mua X tặng Y'
      default:
        return type
    }
  }

  return (
    <ModalBase
      visible={visible}
      onClose={() => setVisible(false)}
      className="w-[50%]"
      dismissible={true}
    >
      <View className="p-6">
        {/* Header */}
        <View
          className="flex-row items-center justify-between pb-4"
          style={{ borderBottomWidth: 1, borderColor: BORDER }}
        >
          <Text
            className="text-[24px] font-extrabold"
            style={{ color: BRAND, fontFamily: 'Manrope-Bold' }}
          >
            Thông tin Voucher
          </Text>
          <IconButton icon={X} size={28} color={TEXT_MUTED} onPress={() => setVisible(false)} />
        </View>

        {/* Details list */}
        <View className="gap-4 py-3">
          <View className="flex-row justify-between">
            <Text
              className="text-[22px]"
              style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Medium' }}
            >
              Mã khuyến mãi
            </Text>
            <Text
              className="text-[22px] font-bold"
              style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
            >
              {voucher.code}
            </Text>
          </View>

          <View
            className="flex-row justify-between"
            style={{ borderTopWidth: 0.5, borderColor: BORDER, paddingTop: 12 }}
          >
            <Text
              className="text-[22px]"
              style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Medium' }}
            >
              Loại ưu đãi
            </Text>
            <Text
              className="text-[22px] font-bold"
              style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
            >
              {getVoucherTypeLabel(voucher.voucherType)}
            </Text>
          </View>

          <View
            className="flex-row justify-between"
            style={{ borderTopWidth: 0.5, borderColor: BORDER, paddingTop: 12 }}
          >
            <Text
              className="text-[22px]"
              style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Medium' }}
            >
              Mức giảm giá
            </Text>
            <Text
              className="text-[22px] font-bold"
              style={{ color: BRAND, fontFamily: 'Manrope-Bold' }}
            >
              {voucher.voucherType === 'PERCENTAGE'
                ? `${voucher.discountValue}%`
                : voucher.voucherType === 'FIXED'
                  ? formatCurrency(voucher.discountValue)
                  : voucher.discountValue}
            </Text>
          </View>

          <View
            className="flex-row justify-between"
            style={{ borderTopWidth: 0.5, borderColor: BORDER, paddingTop: 12 }}
          >
            <Text
              className="text-[22px]"
              style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Medium' }}
            >
              Đơn tối thiểu
            </Text>
            <Text
              className="text-[22px] font-bold"
              style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
            >
              {voucher.minOrderValue ? formatCurrency(voucher.minOrderValue) : 'Không giới hạn'}
            </Text>
          </View>

          {voucher.voucherType === 'PERCENTAGE' && (
            <View
              className="flex-row justify-between"
              style={{ borderTopWidth: 0.5, borderColor: BORDER, paddingTop: 12 }}
            >
              <Text
                className="text-[22px]"
                style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Medium' }}
              >
                Giảm tối đa
              </Text>
              <Text
                className="text-[22px] font-bold"
                style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
              >
                {voucher.maxDiscountAmount
                  ? formatCurrency(voucher.maxDiscountAmount)
                  : 'Không giới hạn'}
              </Text>
            </View>
          )}

          <View
            className="flex-row justify-between"
            style={{ borderTopWidth: 0.5, borderColor: BORDER, paddingTop: 12 }}
          >
            <Text
              className="text-[22px]"
              style={{ color: TEXT_MUTED, fontFamily: 'Manrope-Medium' }}
            >
              Sản phẩm áp dụng
            </Text>
            <Text
              className="ml-4 flex-1 text-right text-[22px] font-bold"
              numberOfLines={2}
              style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold' }}
            >
              {voucher.applicableVariantIds && voucher.applicableVariantIds.length > 0
                ? `Áp dụng cho ${voucher.applicableVariantIds.length} biến thể sản phẩm`
                : 'Áp dụng cho tất cả sản phẩm'}
            </Text>
          </View>
        </View>
      </View>
    </ModalBase>
  )
})
VoucherDetailModal.displayName = 'VoucherDetailModal'
