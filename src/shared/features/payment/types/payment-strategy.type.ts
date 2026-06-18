import { AppliedVoucher, CartItem } from '@/shared/features/pos'
import { LucideIcon } from 'lucide-react-native'
import React from 'react'
import type { PaymentMethodCode } from './payment.constants'

/**
 * Dữ liệu bối cảnh (context) truyền vào để kiểm tra trạng thái và điều kiện
 * hiển thị của từng phương thức thanh toán.
 */
export interface PaymentContext {
  /** Tổng tiền thanh toán cuối cùng (sau khi trừ discount) */
  total: number
  /** ID của giỏ hàng hiện tại */
  sessionId: string | null
  /** Danh sách các món trong giỏ hàng */
  items: CartItem[]
  /** Tổng số tiền được giảm giá */
  discount: number
  /** Ref để in hóa đơn tự động */
  printRef?: React.RefObject<any>
}

/**
 * Kết quả trả về từ một Component Popup thanh toán sau khi giao dịch thành công.
 */
export interface PaymentResult {
  /** Trạng thái thành công */
  success: boolean
  /** Phương thức đã sử dụng */
  method: PaymentMethodCode
  /** Số tiền thực tế khách đã đưa (hoặc số tiền đã chuyển khoản) */
  paidAmount: number
  /** Số tiền thối lại cho khách (nếu có) */
  change: number
  /**
   * Mã giao dịch trả về từ Backend/Ngân hàng (nếu có).
   */
  referenceCode?: string
  /**
   * Đơn này được xử lý Online (Backend) hay Offline (Local)
   */
  isOnline: boolean
  /**
   * ID đơn hàng từ Backend (Nếu là thanh toán Online)
   */
  orderId?: string
}

/**
 * Props cơ bản cho mọi Popup.
 */
export interface BasePaymentPopupProps {
  total: number
  onSuccess: (result: PaymentResult) => void
}

/**
 * Props mở rộng cho các phương thức cần context (Online, Voucher...).
 */
export interface PaymentPopupProps extends BasePaymentPopupProps {
  discount: number
  appliedVoucher?: AppliedVoucher | null
  items: CartItem[]
  staffId: string
  shiftId: string
  staffName?: string
  activeSessionId: string | null
  printRef?: React.RefObject<any>
  note?: string
}

/**
 * Các hàm được expose ra ngoài qua ref để điều khiển Popup.
 */
export interface PaymentPopupRef {
  /** Mở popup thanh toán */
  open: () => void
  /** Đóng popup thanh toán */
  close: () => void
}

/**
 * Contract (Giao kèo) mà mọi phương thức thanh toán mới đều phải implement.
 */
export interface PaymentStrategy {
  /** Mã loại hình thanh toán lưu vào DB — dùng PaymentMethodCode */
  type: PaymentMethodCode
  /** Tên hiển thị trên nút bấm (VD: "Tiền mặt", "Momo") */
  label: string
  /** Icon hiển thị cạnh tên nút bấm */
  icon: LucideIcon
  /** Thứ tự hiển thị trên giao diện */
  displayOrder?: number
  /**
   * Hàm kiểm tra xem phương thức này có được phép dùng không.
   * VD: Thanh toán QR trả về false nếu đang mất mạng (isOffline = true).
   */
  isAvailable: (ctx: PaymentContext, isOffline: boolean) => boolean
  /**
   * Component giao diện Popup xử lý nghiệp vụ của phương thức thanh toán đó.
   * Component này bắt buộc phải forwardRef theo chuẩn PaymentPopupRef.
   */
  PopupComponent: React.ForwardRefExoticComponent<
    PaymentPopupProps & React.RefAttributes<PaymentPopupRef>
  >
}

/**
 * Các mã lỗi chuẩn hóa cho quá trình thanh toán.
 */
export const PAYMENT_ERROR_CODES = {
  TIMEOUT: 'PAYMENT_TIMEOUT',
  SYSTEM_ERROR: 'PAYMENT_SYSTEM_ERROR',
  CONNECTION_FAILED: 'PAYMENT_CONNECTION_FAILED',
  USER_CANCELLED: 'PAYMENT_USER_CANCELLED',
} as const

export type PaymentErrorCode = (typeof PAYMENT_ERROR_CODES)[keyof typeof PAYMENT_ERROR_CODES]
