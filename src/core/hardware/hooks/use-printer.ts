import { useState } from 'react'
import { DeviceManager } from '../device-manager'
import { PrintOptions } from '../interfaces/printer.interface'

export interface PrintComponentParams {
  ref: any
  options?: PrintOptions
}

/**
 * Hook gọn nhẹ hỗ trợ in hóa đơn và mở két tiền
 * Dùng useState thuần túy để theo dõi trạng thái, không dùng TanStack Query thừa thãi
 */
export function usePrinter() {
  const [isPrinting, setIsPrinting] = useState(false)
  const [isOpeningCashBox, setIsOpeningCashBox] = useState(false)

  const printComponent = async (ref: any, options?: PrintOptions) => {
    setIsPrinting(true)
    try {
      return await DeviceManager.printComponent(ref, options)
    } finally {
      setIsPrinting(false)
    }
  }

  const printBitmap = async (imageSource: string, options?: PrintOptions) => {
    setIsPrinting(true)
    try {
      return await DeviceManager.printBitmap(imageSource, options)
    } finally {
      setIsPrinting(false)
    }
  }

  const openCashBox = async () => {
    setIsOpeningCashBox(true)
    try {
      return await DeviceManager.openCashBox()
    } finally {
      setIsOpeningCashBox(false)
    }
  }

  return {
    printComponent,
    printBitmap,
    isPrinting,

    openCashBox,
    isOpeningCashBox,
  }
}
