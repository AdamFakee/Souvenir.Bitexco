import { CashSession } from '@/shared/types'

export interface ZReportStaffItem {
  staffId: string
  staffName: string
  staffCode: string
  orderCount: number
  cashAmount: number
  qrAmount: number
  cardAmount: number
  totalRevenue: number
}

export interface ZReportResponse {
  session: CashSession
  cashierName: string
  cashierEmail: string
  posDeviceName: string
  posDeviceCode: string
  warehouseName: string
  warehouseCode: string
  orderCount: number
  refundCount: number
  paymentBreakdown: {
    method: string
    amount: number
  }[]
  staffs?: ZReportStaffItem[]
}
