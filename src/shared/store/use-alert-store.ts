import { create } from 'zustand'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: AlertType
  title: string
  message: string
}

export interface ToastOptions {
  duration?: number
  /** Thay thế toast hiện tại thay vì xếp chồng nối tiếp xuống dưới */
  swap?: boolean
}

interface AlertState {
  // Confirm/Info Dialog State
  visible: boolean
  type: AlertType
  title: string
  message: string
  isConfirm: boolean
  popupType: 'confirm' | 'info' | null
  onConfirm?: () => void
  onCancel?: () => void

  // Toasts State
  toasts: Toast[]

  // Easy Loading State
  isLoading: boolean
  loadingMessage?: string

  /**
   * Hiển thị thông báo (Toast) - Tự động biến mất
   */
  show: (params: {
    type?: AlertType
    title: string
    message: string
    duration?: number
    swap?: boolean
  }) => void
  /**
   * Ẩn một Toast cụ thể
   */
  hideToast: (id: string) => void
  /**
   * Hiển thị hộp thoại xác nhận (Confirm Dialog - 2 nút)
   */
  confirm: (params: {
    title: string
    message: string
    onConfirm: () => void
    onCancel?: () => void
  }) => void
  /**
   * Hiển thị hộp thoại thông tin (Info Dialog - 1 nút)
   */
  infoPopup: (params: { title: string; message: string; onConfirm?: () => void }) => void
  /**
   * Đóng hộp thoại
   */
  hide: () => void
  /** EasyLoading: hiển thị spinner toàn màn hình */
  showLoading: (message?: string) => void
  /** EasyLoading: ẩn spinner */
  hideLoading: () => void
}

export const useAlertStore = create<AlertState>((set, get) => ({
  visible: false,
  type: 'info',
  title: '',
  message: '',
  isConfirm: false,
  popupType: null,
  onConfirm: undefined,
  onCancel: undefined,
  toasts: [],
  isLoading: false,
  loadingMessage: undefined,

  show: ({ type = 'info', title, message, duration = 4000, swap = false }) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: Toast = { id, type, title, message }

    set((state) => ({
      toasts: swap ? [newToast] : [...state.toasts, newToast],
    }))

    if (duration > 0) {
      setTimeout(() => {
        get().hideToast(id)
      }, duration)
    }
  },

  hideToast: (id: string) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  confirm: ({ title, message, onConfirm, onCancel }) =>
    set({
      visible: true,
      type: 'info',
      title,
      message,
      isConfirm: true,
      popupType: 'confirm',
      onConfirm: () => {
        set({ visible: false })
        onConfirm()
      },
      onCancel: () => {
        set({ visible: false })
        onCancel?.()
      },
    }),

  infoPopup: ({ title, message, onConfirm }) =>
    set({
      visible: true,
      type: 'info',
      title,
      message,
      isConfirm: true,
      popupType: 'info',
      onConfirm: () => {
        set({ visible: false })
        onConfirm?.()
      },
      onCancel: undefined,
    }),

  hide: () => set({ visible: false }),

  showLoading: (message?: string) => set({ isLoading: true, loadingMessage: message }),
  hideLoading: () => set({ isLoading: false, loadingMessage: undefined }),
}))

function resolveToastParams(
  type: AlertType,
  defaultTitle: string,
  message: string,
  titleOrOptions?: string | ToastOptions,
  options?: ToastOptions,
) {
  let title = defaultTitle
  let opts: ToastOptions | undefined = options

  if (typeof titleOrOptions === 'string') {
    title = titleOrOptions
  } else if (titleOrOptions && typeof titleOrOptions === 'object') {
    opts = titleOrOptions
  }

  return {
    type,
    title,
    message,
    duration: opts?.duration,
    swap: opts?.swap,
  }
}

/**
 * Utility giống GetX: toast.error('lỗi'), toast.success('xong')
 * Có thể gọi ở bất cứ đâu (.ts, .tsx, api, flows...)
 * Hỗ trợ swap: true để thay thế toast cũ khi scan liên tục
 */
export const toast = {
  error: (message: string, titleOrOptions?: string | ToastOptions, options?: ToastOptions) =>
    useAlertStore
      .getState()
      .show(resolveToastParams('error', 'Lỗi hệ thống', message, titleOrOptions, options)),
  success: (message: string, titleOrOptions?: string | ToastOptions, options?: ToastOptions) =>
    useAlertStore
      .getState()
      .show(resolveToastParams('success', 'Thành công', message, titleOrOptions, options)),
  warning: (message: string, titleOrOptions?: string | ToastOptions, options?: ToastOptions) =>
    useAlertStore
      .getState()
      .show(resolveToastParams('warning', 'Cảnh báo', message, titleOrOptions, options)),
  info: (message: string, titleOrOptions?: string | ToastOptions, options?: ToastOptions) =>
    useAlertStore
      .getState()
      .show(resolveToastParams('info', 'Thông báo', message, titleOrOptions, options)),
  confirm: (params: {
    title: string
    message: string
    onConfirm: () => void
    onCancel?: () => void
  }) => useAlertStore.getState().confirm(params),
  infoPopup: (params: { title: string; message: string; onConfirm?: () => void }) =>
    useAlertStore.getState().infoPopup(params),
  showLoading: (message?: string) => useAlertStore.getState().showLoading(message),
  hideLoading: () => useAlertStore.getState().hideLoading(),
}
