import PrinterImin from 'react-native-printer-imin'
import { captureRef } from 'react-native-view-shot'

export interface PrintOptions {
  feedPaper?: number
  partialCut?: boolean
  width?: number
  align?: number
  doubleCopy?: boolean
}

const DEFAULT_OPTIONS: PrintOptions = {
  feedPaper: 100,
  partialCut: true,
  width: 576,
  align: 1, // Center
  doubleCopy: false,
}

// Bộ lắng nghe thay đổi Liên in (Copy Number)
const copyNumberListeners = new Set<(copyNo: number) => void>()
let currentCopyNumber = 1

export const setGlobalPrintCopyNumber = (copyNo: number) => {
  currentCopyNumber = copyNo
  copyNumberListeners.forEach((cb) => cb(copyNo))
}

export const subscribePrintCopyNumber = (cb: (copyNo: number) => void) => {
  copyNumberListeners.add(cb)
  cb(currentCopyNumber)
  return () => {
    copyNumberListeners.delete(cb)
  }
}

/**
 * Giải mã mã lỗi máy in iMin sang tiếng Việt
 */
export const getPrinterStatusText = (code: number | string) => {
  const statusCode = Number(code)
  switch (statusCode) {
    case 0:
      return 'Máy in sẵn sàng hoạt động'
    case 1:
      return 'Máy in không kết nối'
    case 3:
      return 'Nắp máy in đang mở'
    case 4:
      return 'Máy in chưa reset dao cắt'
    case 5:
      return 'Máy in đầu in quá nhiệt'
    case 6:
      return 'Máy in lỗi nhãn đen'
    case 7:
      return 'Máy in hết giấy'
    case 8:
      return 'Máy in sắp hết giấy'
    case 99:
      return 'Máy in gặp lỗi không xác định'
    default:
      return 'Khởi tạo máy in thất bại'
  }
}

/**
 * Quản lý in ấn và điều khiển thiết bị iMin Printer
 */
export const PrinterService = {
  /**
   * Chụp ảnh từ một UI Ref
   */
  async captureView(ref: any): Promise<string> {
    if (!ref?.current) {
      throw new Error('View Reference không hợp lệ')
    }
    return await captureRef(ref, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: 576 * 4, // Super sampling 4x để chữ sắc nét
    })
  },

  /**
   * In ảnh trực tiếp thông qua uri image
   */
  async printBitmap(imageSource: string, options?: PrintOptions) {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    try {
      // Kiểm tra trạng thái máy in
      const status = await PrinterImin.getPrinterStatus()
      if (Number(status.code) !== 0) {
        throw new Error(status.message)
      }

      // Cấu hình khổ giấy 80mm
      await PrinterImin.setPageFormat(0)

      // Thực hiện in Bitmap
      await PrinterImin.printSingleBitmap(imageSource, {
        width: opts.width,
        align: opts.align,
      })

      // In thêm 1 đoạn trắng để tránh cắt hoặc xé trúng nội dung bill
      if (opts.feedPaper) {
        await PrinterImin.printAndFeedPaper(opts.feedPaper)
      }

      // Cắt giấy
      if (opts.partialCut) {
        await PrinterImin.partialCut()
      }

      return { success: true }
    } catch (error) {
      throw error
    }
  },

  async printComponent(ref: any, options?: PrintOptions) {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    if (opts.doubleCopy) {
      try {
        // --- IN LIÊN 1 ---
        setGlobalPrintCopyNumber(1)
        // Đợi 150ms để React cập nhật giao diện hiển thị Liên 1
        await new Promise((resolve) => setTimeout(resolve, 150))
        const imageUri1 = await this.captureView(ref)
        // Liên 1 chỉ feed 45 để dao cắt nằm đúng mép dưới của Liên 1
        await this.printBitmap(imageUri1, { ...opts, feedPaper: 45 })

        // --- IN LIÊN 2 ---
        setGlobalPrintCopyNumber(2)
        // Đợi 150ms để React cập nhật giao diện hiển thị Liên 2
        await new Promise((resolve) => setTimeout(resolve, 150))
        const imageUri2 = await this.captureView(ref)
        // Liên 2 feed 100 để đẩy hẳn bill ra ngoài tránh bị kẹt
        await this.printBitmap(imageUri2, opts)

        // Reset lại Liên 1
        setGlobalPrintCopyNumber(1)
        return { success: true }
      } catch (error) {
        setGlobalPrintCopyNumber(1)
        throw error
      }
    } else {
      const imageUri = await this.captureView(ref)
      return await this.printBitmap(imageUri, opts)
    }
  },

  /**
   * Mở két tiền (Cashbox)
   */
  async openCashBox() {
    try {
      await PrinterImin.openCashBox()
      return { success: true }
    } catch (error) {
      throw error
    }
  },
}
