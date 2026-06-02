import { PrinterService } from '@/shared/services'
import { fromPromise } from 'xstate'
import React from 'react'

export const printReceiptActor = fromPromise(
  async ({ input }: { input: { printRef?: React.RefObject<any> } }) => {
    if (!input.printRef?.current) {
      throw new Error('Không tìm thấy component in hóa đơn')
    }
    await new Promise((resolve) => setTimeout(resolve, 800))
    await PrinterService.printComponent(input.printRef)
  },
)
