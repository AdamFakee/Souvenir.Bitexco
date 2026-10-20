import { useAppStore } from '@/features/app'
import { getDeviceContext, getEmployees, getMe, refreshToken } from '@/features/auth/api'
import { useNoteStore } from '@/features/note'
import {
  getAffiliatesRemote,
  getOrders,
  getPartnersRemote,
  getReconciliation,
  lookupOrder,
  ReconciliationResult,
} from '@/features/order/api'
import { BitexcoReceiptTemplate } from '@/features/order/components/bitexco-receipt-template'
import {
  ReconciliationModal,
  type ReconciliationModalRef,
} from '@/features/order/components/reconciliation-modal'
import { ReconciliationReceiptTemplate } from '@/features/order/components/reconciliation-receipt-template'
import { RefundReceiptTemplate } from '@/features/order/components/refund-receipt-template'
import { CloseShiftReceiptTemplate, type CloseShiftReceiptData } from '@/features/shift'
import { ViceService } from '@/screens/vice-service'
import { Container, Input, ModalBase } from '@/shared/components/ui'
import { Button } from '@/shared/components/ui/button'

import {
  getPortablePosUrl,
  IMinPrinterDriver,
  setPortablePosUrl,
  useConnectionStore,
} from '@/core/hardware'
import { useScanLookup } from '@/features/pos'
import { fetchProductChanges, lookupProduct, searchProducts } from '@/features/product'
import { getZReport } from '@/features/shift/api'
import { AxiosService } from '@/shared/lib/axios/axios.service'
import { database } from '@/shared/lib/database'
import OrderModel from '@/shared/lib/database/models/order'
import ProductModel from '@/shared/lib/database/models/product'
import { SyncService } from '@/shared/lib/database/sync/sync.service'
import { storage } from '@/shared/lib/storage'
import { toast } from '@/shared/store'
import React, { useEffect, useRef, useState } from 'react'
import { Clipboard, Pressable, ScrollView, Text, View } from 'react-native'
import PrinterImin from 'react-native-printer-imin'

export default function DevControlScreen() {
  const { handleScan: scanLookupProduct, isProcessing: isScanning } = useScanLookup()
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<ProductModel[]>([])
  const [syncResult, setSyncResult] = useState<any>(null)
  const [isSyncResultVisible, setIsSyncResultVisible] = useState(false)
  const [isFetchingChanges, setIsFetchingChanges] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const receiptPrintRef3 = useRef<View>(null)
  const receiptPrintRef10 = useRef<View>(null)
  const refundPrintRef = useRef<View>(null)
  const closeShiftPrintRef = useRef<View>(null)
  const reconciliationPrintRef = useRef<View>(null)
  const apiZReportPrintRef = useRef<View>(null)
  const [apiZReportData, setApiZReportData] = useState<any>(null)

  // ─── Reconciliation Test ───────────────────────────────────────────────────
  const [recoPartnerId, setRecoPartnerId] = useState('')
  const [recoAffiliateId, setRecoAffiliateId] = useState('')
  const [recoDateFrom, setRecoDateFrom] = useState(() => new Date().toISOString().split('T')[0])
  const [recoDateTo, setRecoDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [recoResult, setRecoResult] = useState<ReconciliationResult | null>(null)
  const [isRecoLoading, setIsRecoLoading] = useState(false)
  const devReconciliationModalRef = useRef<ReconciliationModalRef>(null)

  const [posUrlInput, setPosUrlInput] = useState(getPortablePosUrl())
  const isPosConnected = useConnectionStore((state) => state.isPosConnected)
  const isCheckingPosConnection = useConnectionStore((state) => state.isCheckingPosConnection)
  const checkPosConnection = useConnectionStore((state) => state.checkPosConnection)

  // ─── Query Entities Test States ───────────────────────────────────────────
  const [ctvIsActive, setCtvIsActive] = useState<boolean | undefined>(undefined)
  const [ctvHasTransaction, setCtvHasTransaction] = useState<boolean | undefined>(undefined)
  const [ctvLimit, setCtvLimit] = useState<number>(10)

  const [partnerIsActive, setPartnerIsActive] = useState<boolean | undefined>(undefined)
  const [partnerHasTransaction, setPartnerHasTransaction] = useState<boolean | undefined>(undefined)
  const [partnerLimit, setPartnerLimit] = useState<number>(10)

  const [empMode, setEmpMode] = useState<'all' | 'shift'>('all')
  const [empShiftId, setEmpShiftId] = useState<string | undefined>(undefined)
  const [shifts, setShifts] = useState<any[]>([])
  const [isShiftsLoading, setIsShiftsLoading] = useState(false)
  const [empIsPos, setEmpIsPos] = useState<boolean | undefined>(undefined)
  const [empStatus, setEmpStatus] = useState<string | undefined>(undefined)
  const [empHasTransaction, setEmpHasTransaction] = useState<boolean | undefined>(undefined)

  // Entity Modal JSON
  const [entityModalTitle, setEntityModalTitle] = useState('')
  const [entityModalData, setEntityModalData] = useState<any>(null)
  const [isEntityModalVisible, setIsEntityModalVisible] = useState(false)
  const [isEntityLoading, setIsEntityLoading] = useState(false)

  // ─── Toast Test State & Handlers ──────────────────────────────────────────
  const [toastTestCount, setToastTestCount] = useState(1)

  const handleTestToastSwapSuccess = () => {
    toast.success(`Đã thêm sản phẩm #${toastTestCount} vào giỏ (Swap)`, 'Quét Barcode', {
      swap: true,
    })
    setToastTestCount((prev) => prev + 1)
  }

  const handleTestToastSwapError = () => {
    toast.error(`Không tìm thấy mã vạch SP #${toastTestCount} (Swap)`, 'Lỗi quét mã', {
      swap: true,
    })
    setToastTestCount((prev) => prev + 1)
  }

  const handleTestToastStackSuccess = () => {
    toast.success(`Đã thêm sản phẩm #${toastTestCount} vào giỏ (Stack)`, 'Quét Barcode')
    setToastTestCount((prev) => prev + 1)
  }

  const handleTestRapidSwap = () => {
    const start = toastTestCount
    toast.success(`Quét SP #${start} (1/3)`, 'Barcode Swap', { swap: true })
    setTimeout(() => {
      toast.success(`Quét SP #${start + 1} (2/3 - Đã swap)`, 'Barcode Swap', { swap: true })
    }, 250)
    setTimeout(() => {
      toast.success(`Quét SP #${start + 2} (3/3 - Chỉ 1 toast)`, 'Barcode Swap', { swap: true })
    }, 500)
    setToastTestCount((prev) => prev + 3)
  }

  const handleTestRapidStack = () => {
    const start = toastTestCount
    toast.info(`Quét SP #${start} (1/3 - Dồn)`, 'Barcode Stack')
    setTimeout(() => {
      toast.info(`Quét SP #${start + 1} (2/3 - Dồn)`, 'Barcode Stack')
    }, 250)
    setTimeout(() => {
      toast.info(`Quét SP #${start + 2} (3/3 - Dồn 3 cái)`, 'Barcode Stack')
    }, 500)
    setToastTestCount((prev) => prev + 3)
  }

  const handlePrint = async (ref: React.RefObject<any>, name: string) => {
    if (isPrinting) return
    setIsPrinting(true)
    try {
      await IMinPrinterDriver.printComponent(ref)
      toast.success(`Đã gửi lệnh in ${name} thành công!`)
    } catch (err: any) {
      toast.error('Lỗi máy in: ' + (err?.message ?? 'Không xác định'))
    } finally {
      setIsPrinting(false)
    }
  }

  const handlePrintDoubleCopy = async (ref: React.RefObject<any>, name: string) => {
    if (isPrinting) return
    setIsPrinting(true)
    try {
      await IMinPrinterDriver.printComponent(ref, { doubleCopy: true })
      toast.success(`Đã gửi lệnh in 2 liên (${name}) thành công!`)
    } catch (err: any) {
      toast.error('Lỗi máy in: ' + (err?.message ?? 'Không xác định'))
    } finally {
      setIsPrinting(false)
    }
  }

  const handlePrintTextCmd = async (copyNumber: number) => {
    if (isPrinting) return
    setIsPrinting(true)
    try {
      await PrinterImin.initPrinter()
      const status = await PrinterImin.getPrinterStatus()
      if (Number(status.code) !== 0) {
        throw new Error(status.message)
      }

      await PrinterImin.setPageFormat(0) // 80mm

      // Header
      await PrinterImin.printText('Skystore Bitexco Financial Tower', {
        fontSize: 32,
        fontStyle: 1,
        align: 1,
      })
      await PrinterImin.printText('36 Ho Tung Mau ST, District 1 HCMC', { fontSize: 28, align: 1 })
      await PrinterImin.printText('TEL: (84-8) 39 156 156', { fontSize: 28, align: 1 })
      await PrinterImin.printAndLineFeed()
      await PrinterImin.printText('BANG KE BAN LE', { fontSize: 42, fontStyle: 1, align: 1 })
      await PrinterImin.printText('---o0o---', { fontSize: 24, align: 1 })
      await PrinterImin.printText(`Lien: ${copyNumber}`, { fontSize: 28, align: 1 })
      await PrinterImin.printText('--------------------------------', { fontSize: 24 })

      // Meta
      const dateStr = new Date().toLocaleString('vi-VN')
      await PrinterImin.printText(dateStr, { fontSize: 28 })
      await PrinterImin.printText('So HD: ORD-MOCK-2026', { fontSize: 28 })
      await PrinterImin.printText('Quay: F49 - 1', { fontSize: 28 })
      await PrinterImin.printText('NV: Nguyen Huynh Tram Anh', { fontSize: 28 })
      await PrinterImin.printText('--------------------------------', { fontSize: 24 })

      // Table Header
      await PrinterImin.printColumnsString([
        { text: 'Don gia', width: 2, fontSize: 28, align: 0 },
        { text: 'So luong', width: 1, fontSize: 28, align: 1 },
        { text: 'Thanh tien', width: 2, fontSize: 28, align: 2 },
      ])
      await PrinterImin.printText('--------------------------------', { fontSize: 24 })

      // Items
      const items = [
        {
          sku: '2010113000043',
          name: 'Metal Magnet Bitexco',
          price: 78000,
          quantity: 2,
          subtotal: 156000,
        },
        {
          sku: '2010113000088',
          name: 'Postcard Saigon Skydeck',
          price: 15000,
          quantity: 1,
          subtotal: 15000,
        },
      ]

      for (const item of items) {
        await PrinterImin.printText(item.name, { fontSize: 30, fontStyle: 1 })
        await PrinterImin.printText(item.sku, { fontSize: 24 })
        await PrinterImin.printColumnsString([
          { text: item.price.toLocaleString('vi-VN'), width: 2, fontSize: 28, align: 0 },
          { text: String(item.quantity), width: 1, fontSize: 28, align: 1 },
          { text: item.subtotal.toLocaleString('vi-VN'), width: 2, fontSize: 28, align: 2 },
        ])
      }
      await PrinterImin.printText('--------------------------------', { fontSize: 24 })

      // Totals
      await PrinterImin.printColumnsString([
        { text: 'Tong', width: 1, fontSize: 28, align: 0 },
        { text: '3', width: 1, fontSize: 28, align: 2 },
      ])
      await PrinterImin.printColumnsString([
        { text: 'Tong tien:', width: 1, fontSize: 32, align: 0 },
        { text: '171.000', width: 1, fontSize: 32, align: 2 },
      ])
      await PrinterImin.printColumnsString([
        { text: 'Tien khach tra:', width: 1, fontSize: 28, align: 0 },
        { text: '171.000', width: 1, fontSize: 28, align: 2 },
      ])
      await PrinterImin.printColumnsString([
        { text: 'Tien tra lai cho khach:', width: 1, fontSize: 28, align: 0 },
        { text: '0', width: 1, fontSize: 28, align: 2 },
      ])

      await PrinterImin.printText('Chi tiet tien thue:', { fontSize: 28 })
      await PrinterImin.printColumnsString([
        { text: 'VAT', width: 1, fontSize: 28, align: 0 },
        { text: '15.545', width: 1, fontSize: 28, align: 2 },
      ])
      await PrinterImin.printText('--------------------------------', { fontSize: 24 })

      // Payments
      await PrinterImin.printText('Chi tiet thanh toan:', { fontSize: 28 })
      await PrinterImin.printColumnsString([
        { text: '+ CARD', width: 1, fontSize: 28, align: 0 },
        { text: '171.000', width: 1, fontSize: 28, align: 2 },
      ])
      await PrinterImin.printText('--------------------------------', { fontSize: 24 })

      // Footer
      await PrinterImin.printText('Quy khach vui long kiem tra lai hoa don.', {
        fontSize: 24,
        align: 1,
      })
      await PrinterImin.printText('Xin cam on va hen gap lai', { fontSize: 24, align: 1 })

      await PrinterImin.printAndFeedPaper(60) // Reduced from 100 to make bill shorter
      await PrinterImin.partialCut()

      toast.success(`Đã gửi lệnh in CMD lần ${copyNumber} thành công!`)
    } catch (err: any) {
      toast.error('Lỗi in CMD: ' + (err?.message ?? 'Không xác định'))
    } finally {
      setIsPrinting(false)
    }
  }

  const handleOpenCashbox = async () => {
    try {
      await IMinPrinterDriver.openCashBox()
      toast.success('Đã gửi lệnh mở két tiền (Cashbox) thành công!')
    } catch (err: any) {
      toast.error('Lỗi mở két: ' + (err?.message ?? 'Không xác định'))
    }
  }

  const handleSaveAndTestPos = async () => {
    try {
      if (!posUrlInput.trim()) {
        toast.warning('Vui lòng nhập POS URL hợp lệ.')
        return
      }
      setPortablePosUrl(posUrlInput.trim())
      toast.info('Đang lưu cấu hình và kết nối thử...')
      const connected = await checkPosConnection()
      if (connected) {
        toast.success('Kết nối máy POS thành công!', 'Thành công')
      } else {
        toast.error('Không thể kết nối tới máy POS ở URL mới.', 'Kết nối thất bại')
      }
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message, 'Lỗi kết nối')
    }
  }

  const renderPill = (label: string, isSelected: boolean, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      className={`mb-2 mr-2 rounded-full border px-3 py-1.5 ${
        isSelected ? 'border-primary bg-primary' : 'border-neutral-300 bg-white'
      }`}
    >
      <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-neutral-600'}`}>
        {label}
      </Text>
    </Pressable>
  )

  const loadData = async () => {
    try {
      const prods = await database.collections.get<ProductModel>('products').query().fetch()
      setCategories([])
      setProducts(prods)
    } catch {}
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSeedData = async () => {
    try {
      await database.write(async () => {
        // Clear existing first
        const allProds = await database.collections.get<ProductModel>('products').query().fetch()

        for (const p of allProds) await p.destroyPermanently()

        // Seed sample products
        const sampleProducts = [
          {
            id: 'prod-001',
            sku: 'SKU001',
            barcode: '8930000001',
            name: 'Móc khóa lưu niệm Bitexco',
            price: 50000,
            stock: 100,
            unitId: 'u1',
            unitCode: 'CAI',
          },
          {
            id: 'prod-002',
            sku: 'SKU002',
            barcode: '8930000002',
            name: 'Áo thun lưu niệm Bitexco (Size L)',
            price: 250000,
            stock: 50,
            unitId: 'u1',
            unitCode: 'CAI',
          },
          {
            id: 'prod-003',
            sku: 'SKU003',
            barcode: '8930000003',
            name: 'Mô hình tháp Bitexco 3D',
            price: 450000,
            stock: 30,
            unitId: 'u1',
            unitCode: 'CAI',
          },
        ]
        for (const prod of sampleProducts) {
          await database.collections.get<ProductModel>('products').create((record: any) => {
            record._raw.id = prod.id
            record.sku = prod.sku
            record.barcode = prod.barcode
            record.name = prod.name
            record.unitId = prod.unitId
            record.unitCode = prod.unitCode
            record.taxRate = 8
            record.price = prod.price
            record.stock = prod.stock
            record.isActive = true
            record.isDeleted = false
          })
        }
      })
      toast.success('Đã nạp dữ liệu mẫu vào Local DB!', 'Thành công')
      loadData()
    } catch {
      toast.error('Không thể nạp dữ liệu.', 'Lỗi')
    }
  }

  const handleClearData = async () => {
    toast.confirm({
      title: 'Xác nhận xóa?',
      message: 'Bạn có chắc muốn xóa sạch Local DB?',
      onConfirm: async () => {
        try {
          await database.write(async () => {
            const allProds = await database.collections
              .get<ProductModel>('products')
              .query()
              .fetch()
            for (const p of allProds) await p.destroyPermanently()
          })
          toast.success('Đã xóa sạch DB!', 'Thành công')
          loadData()
        } catch {
          toast.error('Không thể xóa.', 'Lỗi')
        }
      },
    })
  }

  const getProductCountByCat = (catId: string) => {
    return 0
  }

  const handleTestActivateDevice = async () => {
    try {
      toast.info('Đang gửi request Activate Device...')
      await AxiosService.getInstance().post('/v1/pos-devices/activate', {
        deviceCode: 'TEST 1',
        activationToken: '500107', // Sửa lại token nếu admin cấp token khác
      })
      toast.success('Kích hoạt thành công! Xem log console.')
    } catch (error: any) {
      const errData = error.response?.data
      toast.error('Lỗi: ' + (errData?.detail || errData?.message || error.message))
    }
  }

  const handleTestGetPaymentMethods = async () => {
    try {
      toast.info('Đang gọi API lấy Payment Methods...')
      const response = await AxiosService.getInstance().get<any[]>('/v1/payment-methods')
      console.log(
        '[DevControl] Payment Methods Raw Response:',
        JSON.stringify(response.data, null, 2),
      )

      const cardMethod = response.data.find((m: any) => m.code === 'card_bidv')
      const qrMethod = response.data.find((m: any) => m.code === 'qr_bidv')

      console.log(
        '[DevControl] Terminal Config (card_bidv):',
        JSON.stringify(cardMethod?.terminalConfig, null, 2),
      )
      console.log(
        '[DevControl] Bank Config / Tenant Config (qr_bidv):',
        JSON.stringify(qrMethod?.bankConfig, null, 2),
      )

      const enabledMethods = response.data.filter((m: any) => m.enabled)
      const appService = useAppStore.getState().appService
      if (appService) {
        appService.send({ type: 'PAYMENT_METHODS_UPDATED', paymentMethods: enabledMethods })
        const currentCtx = appService.getSnapshot().context
        console.log(
          '[DevControl] App Machine Context terminalConfig:',
          JSON.stringify(currentCtx.terminalConfig, null, 2),
        )
        console.log(
          '[DevControl] App Machine Context tenantConfig:',
          JSON.stringify(currentCtx.tenantConfig, null, 2),
        )
        toast.success(
          `Đã cập nhật ${enabledMethods.length} phương thức khả dụng vào Machine! Xem console.`,
        )
      } else {
        toast.warning('Lấy thành công nhưng App Service chưa sẵn sàng.')
      }
    } catch (error: any) {
      const errData = error.response?.data
      toast.error('Lỗi: ' + (errData?.detail || errData?.message || error.message))
    }
  }

  const handleLogCurrentTerminalConfig = () => {
    const appService = useAppStore.getState().appService
    if (appService) {
      const ctx = appService.getSnapshot().context
      console.log('=============== [DevControl] CURRENT APP MACHINE CONTEXT ===============')
      console.log('📌 Terminal Config (Card POS):', JSON.stringify(ctx.terminalConfig, null, 2))
      console.log('📌 Tenant Config (QR Bank):', JSON.stringify(ctx.tenantConfig, null, 2))
      console.log('📌 Payment Methods:', JSON.stringify(ctx.paymentMethods, null, 2))
      console.log('📌 Device:', JSON.stringify(ctx.device, null, 2))
      console.log('📌 Cash Session ID:', ctx.cashSessionId)
      console.log('=======================================================================')
      toast.success('Đã log Terminal Config & Machine Context ra console!')
    } else {
      toast.warning('App Service chưa sẵn sàng.')
    }
  }

  const handleTestGetDeviceContext = async () => {
    try {
      toast.info('Đang gọi GET /v1/pos/device-context...')
      const result = await getDeviceContext()
      toast.success(
        `isActive: ${result.isActive ? '✅ TRUE' : '❌ FALSE'}\ndeviceCode: ${result.deviceCode}\nwarehouseId: ${result.warehouseId ?? 'null'}`,
        'Device Context',
      )
    } catch (error: any) {
      const status = error?.response?.status
      const errData = error?.response?.data
      toast.error(
        `${status ?? 'Network error'} — ${errData?.message || errData?.error || error.message}`,
        'Device Context Lỗi',
      )
    }
  }

  const handleTestSyncPartner = async () => {
    try {
      setIsEntityLoading(true)
      toast.info('Đang gọi GET /v1/pos/partners/sync...')
      const response = await AxiosService.getInstance().get('/v1/pos/partners/sync', {
        params: { lastSyncedAt: new Date(0).toISOString(), limit: 5, page: 0 },
      })
      setEntityModalTitle('Partner Sync JSON')
      setEntityModalData(response.data)
      setIsEntityModalVisible(true)
      toast.success('Lấy danh sách Partner thành công!')
    } catch (error: any) {
      toast.error('Lỗi Partner Sync: ' + error.message)
    } finally {
      setIsEntityLoading(false)
    }
  }

  const handleTestSyncAffiliate = async () => {
    try {
      setIsEntityLoading(true)
      toast.info('Đang gọi GET /v1/pos/affiliates/sync...')
      const response = await AxiosService.getInstance().get('/v1/pos/affiliates/sync', {
        params: { lastSyncedAt: new Date(0).toISOString(), limit: 5, page: 0 },
      })
      setEntityModalTitle('Affiliate Sync JSON')
      setEntityModalData(response.data)
      setIsEntityModalVisible(true)
      toast.success('Lấy danh sách Affiliate thành công!')
    } catch (error: any) {
      toast.error('Lỗi Affiliate Sync: ' + error.message)
    } finally {
      setIsEntityLoading(false)
    }
  }

  const handleTestOrderLookup = async () => {
    try {
      toast.info('Đang tìm đơn hàng để tra cứu...')
      let orderId = ''

      // 1. Try local database for orders
      const orders = await database.collections.get<OrderModel>('orders').query().fetch()
      if (orders.length > 0) {
        orderId = orders[0].id
      } else {
        // 2. Try fetching from remote API
        const remoteOrdersRes = await getOrders({ limit: 5 })
        if (remoteOrdersRes.success && remoteOrdersRes.data && remoteOrdersRes.data.length > 0) {
          orderId = remoteOrdersRes.data[0].id
        }
      }

      if (!orderId) {
        toast.warning('Không tìm thấy đơn hàng nào trong local DB hoặc server để test.')
        return
      }

      toast.info(`Đang tra cứu đơn hàng code/id: ${orderId}`)
      await lookupOrder(orderId)
      toast.success('Tra cứu thành công! Xem console log.', 'Order Lookup')
    } catch (error: any) {
      const errData = error.response?.data
      toast.error('Lỗi: ' + (errData?.detail || errData?.message || error.message), 'Order Lookup')
    }
  }

  const handleTestProductLookup = async () => {
    try {
      setIsEntityLoading(true)
      setEntityModalTitle('Tra cứu sản phẩm (20501080005179)')
      setEntityModalData(null)
      setIsEntityModalVisible(true)
      toast.info('Đang gọi API tra cứu mã 20501080005179...')

      const appService = useAppStore.getState().appService
      const warehouseId = appService?.getSnapshot().context.device?.warehouseId

      const requestPayload = {
        endpoint: '/v1/pos/lookup',
        method: 'GET',
        params: {
          barcode: '20501080005179',
          sku: '20501080005179',
          warehouseId: warehouseId || 'null',
        },
        fullUrl: `/v1/pos/lookup?barcode=20501080005179&sku=20501080005179${warehouseId ? `&warehouseId=${warehouseId}` : ''}`,
      }

      console.log('=============== [DevControl] TEST LOOKUP PRODUCT REQUEST ===============')
      console.log(JSON.stringify(requestPayload, null, 2))
      console.log('=========================================================================')

      const lookupRes = await lookupProduct({
        barcode: '20501080005179',
        sku: '20501080005179',
        warehouseId,
      })

      const searchRes = await searchProducts({
        q: '20501080005179',
        warehouseId,
      })

      setEntityModalData({
        requestSent: requestPayload,
        lookupResult: lookupRes,
        searchResults: searchRes,
      })

      if (lookupRes || (searchRes && searchRes.length > 0)) {
        toast.success('Tra cứu thành công! Xem chi tiết JSON.')
      } else {
        toast.warning('Không tìm thấy sản phẩm trên Server.')
      }
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || error.message || 'Lỗi không xác định'
      setEntityModalData({ error: errMsg, response: error?.response?.data })
      toast.error('Lỗi tra cứu: ' + errMsg)
    } finally {
      setIsEntityLoading(false)
    }
  }

  const handleTestExchangeAPI = async () => {
    try {
      toast.info('Đang tìm đơn hàng để gửi request test...')
      let orderId = '019eb2e7-79ff-7325-bfb8-3f629fdbfed4'

      const orders = await database.collections.get<OrderModel>('orders').query().fetch()
      if (orders.length > 0) {
        orderId = orders[0].id
      } else {
        const remoteOrdersRes = await getOrders({ limit: 5 })
        if (remoteOrdersRes.success && remoteOrdersRes.data && remoteOrdersRes.data.length > 0) {
          orderId = remoteOrdersRes.data[0].id
        }
      }

      toast.info(`Đang gọi POST /v1/pos/orders/${orderId}/exchange để kiểm tra API...`)

      const response = await AxiosService.getInstance().post(`/v1/pos/orders/${orderId}/exchange`, {
        idempotencyKey: `probe-${Date.now()}`,
        reason: 'PROBE_API',
        shiftId: '019eb2e7-79ff-7325-bfb8-3f629fdbfed4',
        staffId: '019eb2e7-79ff-7325-bfb8-3f629fdbfed4',
        returnLines: [],
        newLines: [],
        payments: [{ method: 'cash', amount: 0, provider: null, cardTerminalId: null }],
        currency: 'VND',
      })

      console.log('Exchange API Response:', response.data)
      toast.success('API tồn tại! Phản hồi thành công. Xem console log.', 'Test Exchange API')
    } catch (error: any) {
      console.log('Exchange API Error:', error)
      const status = error.response?.status
      const errData = error.response?.data
      if (status === 404) {
        toast.error('API chưa được triển khai (404 Not Found)', 'Test Exchange API')
      } else if (status === 405) {
        toast.error('API sai Method (405 Method Not Allowed)', 'Test Exchange API')
      } else {
        toast.warning(
          `API có phản hồi (${status}): ${errData?.message || errData?.error || error.message}`,
          'Test Exchange API',
        )
      }
    }
  }

  const handleTestZReportAPI = async () => {
    try {
      const appService = useAppStore.getState().appService
      const shiftId = appService?.getSnapshot().context.cashSessionId
      if (!shiftId) {
        toast.warning('Không tìm thấy ca làm việc hiện tại (shiftId). Hãy mở ca trước!')
        return
      }

      toast.info(`Đang gọi GET /v1/cash-sessions/${shiftId}/z-report để lấy Z-Report...`)
      const zReportData = await getZReport(shiftId)

      console.log('=============== [DevControl] Z-REPORT API RESPONSE ===============')
      console.log(JSON.stringify(zReportData, null, 2))

      setApiZReportData(zReportData)
      setEntityModalTitle('Báo cáo Z-Report ca hiện tại')
      setEntityModalData(zReportData)
      setIsEntityModalVisible(true)

      toast.success('Lấy Z-Report thành công! Xem log ở console / modal.')
    } catch (error: any) {
      console.error('Z-Report API Error:', error)
      const errData = error.response?.data
      toast.error('Lỗi lấy Z-Report: ' + (errData?.detail || errData?.message || error.message))
    }
  }

  const handlePrintApiZReport = async () => {
    if (!apiZReportData) {
      toast.warning('Vui lòng bấm lấy dữ liệu Z-Report từ API trước!')
      return
    }
    if (isPrinting) return
    setIsPrinting(true)
    try {
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 120)))
      if (!apiZReportPrintRef.current) {
        throw new Error('Chưa render template in!')
      }
      await IMinPrinterDriver.printComponent(apiZReportPrintRef)
      toast.success('Đã gửi lệnh in Z-Report (API) thành công!')
    } catch (err: any) {
      toast.error('Lỗi in: ' + (err?.message ?? 'Không xác định'))
    } finally {
      setIsPrinting(false)
    }
  }

  const handleTestFetchChanges = async () => {
    try {
      setIsFetchingChanges(true)
      const result = await fetchProductChanges({ lastPulledAt: null })

      setSyncResult(result)
      setIsSyncResultVisible(true)
      toast.success('Lấy danh sách thay đổi sản phẩm thành công!')
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || error.message || 'Lỗi không xác định'
      toast.error('Lỗi: ' + errMsg)
    } finally {
      setIsFetchingChanges(false)
    }
  }

  const handleSyncProductsFromServer = async () => {
    try {
      setIsFetchingChanges(true)
      toast.info('Đang đồng bộ và lưu Sản phẩm & Danh mục từ Server vào Local DB...')
      console.log('[DevControl] Bắt đầu đồng bộ pullMasterData...')
      await SyncService.pullMasterData()
      console.log('[DevControl] Đồng bộ pullMasterData thành công!')
      toast.success('Đồng bộ & Lưu Local DB thành công!')
      await loadData()
    } catch (error: any) {
      console.error('[DevControl] Lỗi đồng bộ:', error)
      toast.error('Lỗi đồng bộ: ' + (error.message || 'Không xác định'))
    } finally {
      setIsFetchingChanges(false)
    }
  }

  const handleSimulateTokenExpired = () => {
    const appService = useAppStore.getState().appService
    if (appService) {
      appService.send({ type: 'TOKEN_EXPIRED' })
      toast.warning('Đã gửi sự kiện TOKEN_EXPIRED! Máy sẽ yêu cầu đăng nhập lại.', 'Simulated')
    } else {
      toast.error('App Service chưa sẵn sàng')
    }
  }

  const handleForceLogout = () => {
    toast.confirm({
      title: 'Xác nhận Logout & Reset?',
      message: 'Hành động này sẽ xóa sạch MMKV auth state và đưa máy về trạng thái chưa đăng nhập.',
      onConfirm: () => {
        const appService = useAppStore.getState().appService
        if (appService) {
          appService.send({ type: 'LOGGED_OUT' })
          toast.success('Đã force LOGOUT!')
        } else {
          toast.error('App Service chưa sẵn sàng')
        }
      },
    })
  }

  // ─── Token Lab handlers ────────────────────────────────────────────────────

  /**
   * Xoá accessToken khỏi memory (machine context) — simulate JWT hết hạn
   * Lần sau gọi API sẽ bị 401 → interceptor trigger TOKEN_EXPIRED.
   */
  const handleExpireAccessToken = () => {
    const appService = useAppStore.getState().appService
    if (!appService) return toast.error('App Service chưa sẵn sàng')
    const ctx = appService.getSnapshot().context
    if (!ctx.accessToken) return toast.warning('Không có accessToken trong memory')
    // Patch context bằng cách dispatch event giả — machine không có SET_ACCESS_TOKEN
    // nên ta dùng storage để xoá giá trị persist rồi ghi lại MMKV trực tiếp
    const raw = storage.getString('app-machine-persist')
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        parsed.accessToken = null
        storage.set('app-machine-persist', JSON.stringify(parsed))
        toast.info(
          'Đã null accessToken trong MMKV persist.\nRestart app để trigger refresh flow (cold start).\nHoặc bấm "Gọi /refresh thủ công" bên dưới.',
          'Access Token Cleared',
        )
      } catch {
        toast.error('Parse MMKV thất bại')
      }
    }
  }

  /**
   * Xoá refreshToken khỏi MMKV — simulate refresh token hết hạn / bị revoke.
   * Lần cold start tiếp theo sẽ throw → unauthenticated → PIN login.
   */
  const handleExpireRefreshToken = () => {
    storage.remove('auth-refresh-token')
    toast.warning(
      'Đã xoá refreshToken khỏi MMKV.\nRestart app → app sẽ throw lúc refresh → bắt buộc PIN login.',
      'Refresh Token Cleared',
    )
  }

  /**
   * Xoá cả hai token — simulate thiết bị bị wipe / fresh install.
   * Tương đương với clearAuth action.
   */
  const handleWipeBothTokens = () => {
    toast.confirm({
      title: 'Wipe cả 2 tokens?',
      message: 'Xoá accessToken (MMKV persist) + refreshToken → cold start sẽ yêu cầu PIN login.',
      onConfirm: () => {
        storage.remove('auth-refresh-token')
        const raw = storage.getString('app-machine-persist')
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            parsed.accessToken = null
            storage.set('app-machine-persist', JSON.stringify(parsed))
          } catch {}
        }
        toast.success('Đã wipe cả accessToken + refreshToken. Restart app để test.')
      },
    })
  }

  /**
   * Gọi thủ công POST /v1/device/auth/refresh với refreshToken hiện tại.
   * Dùng để kiểm tra rotation: console log token cũ → token mới.
   */
  const handleManualRefresh = async () => {
    const currentRefreshToken = storage.getString('auth-refresh-token')
    if (!currentRefreshToken) {
      return toast.error('Không có refreshToken trong MMKV. Hãy đăng nhập trước.')
    }
    toast.info('Đang gọi POST /v1/device/auth/refresh...')
    try {
      const result = await refreshToken(currentRefreshToken)
      storage.set('auth-refresh-token', result.refreshToken)
      toast.success(
        `Rotation OK!\nNew accessToken: ${result.accessToken.slice(0, 20)}...\nNew refreshToken: ${result.refreshToken.slice(0, 12)}...`,
        'Refresh thành công',
      )
    } catch (err: any) {
      const status = err?.response?.status
      const msg = err?.response?.data?.error || err?.message || 'Lỗi không xác định'
      toast.error(
        status === 401
          ? `401 — Token đã bị revoke hoặc hết hạn.\n${msg}`
          : `${status ?? 'Network error'} — ${msg}`,
        'Refresh thất bại',
      )
    }
  }

  /**
   * In ra console trạng thái token hiện tại để debug.
   */
  const handleLogTokenState = () => {
    toast.info('Đã log token state ra console. Mở Metro / Logcat để xem.', 'Token State')
  }

  /**
   * Test Silent Refresh flow:
   * 1. Gán accessToken sai vào app machine context
   * 2. Thực hiện gọi API (AuthAPI.getMe) để xem interceptor có tự động refresh
   * và retry thành công hay không.
   */
  const handleTestSilentRefresh = async () => {
    const appService = useAppStore.getState().appService
    if (!appService) return toast.error('App Service chưa sẵn sàng')

    toast.info('Gán Access Token không hợp lệ để test...')
    appService.send({
      type: 'ACCESS_TOKEN_REFRESHED',
      accessToken: 'invalid_token_for_testing_silent_refresh',
    })

    toast.info('Đang gọi API (getMe) thử...')
    try {
      const result = await getMe()
      toast.success(
        `Thành công!\nAPI phản hồi: Chào ${result.displayName}.\nToken đã tự động được refresh!`,
        'Silent Refresh OK',
      )
    } catch (err: any) {
      toast.error('Lỗi khi gọi API sau refresh: ' + err.message, 'Thất bại')
    }
  }

  const handleClearNotes = () => {
    const notes = useNoteStore.getState().notes
    notes.forEach((n) => useNoteStore.getState().deleteNote(n.id))
    toast.success('Đã xóa sạch danh sách ghi chú bàn giao!')
  }

  const handleSeedNotes = () => {
    const { addNote } = useNoteStore.getState()

    // 1. Overdue Note
    const overdueTarget = new Date()
    overdueTarget.setHours(overdueTarget.getHours() - 2)
    addNote({
      title: 'Kiểm hàng tồn kho bia & nước ngọt',
      content:
        'Kiểm đếm toàn bộ các két bia Tiger, Heineken và nước ngọt tại kho phụ phía sau quầy bar.',
      targetTime: overdueTarget.toISOString(),
      reminderTime: new Date(overdueTarget.getTime() - 10 * 60 * 1000).toISOString(),
      isReminderActive: true,
    })

    // 2. Upcoming Note (Due in 3 hours)
    const upcomingTarget = new Date()
    upcomingTarget.setHours(upcomingTarget.getHours() + 3)
    addNote({
      title: 'Bàn giao két tiền mặt cuối ca',
      content: 'Đếm tiền mặt trong két thu ngân, lập hóa đơn bàn giao ca cho nhân viên ca sau.',
      targetTime: upcomingTarget.toISOString(),
      reminderTime: new Date(upcomingTarget.getTime() - 15 * 60 * 1000).toISOString(),
      isReminderActive: true,
    })

    // 3. Completed Note
    const completedTarget = new Date()
    completedTarget.setHours(completedTarget.getHours() - 1)
    addNote({
      title: 'Vệ sinh máy pha cafe & khu vực quầy',
      content: 'Lau chùi máy pha cafe sạch sẽ, tắt nguồn và dọn dẹp các ly tách đã sử dụng.',
      targetTime: completedTarget.toISOString(),
      reminderTime: new Date(completedTarget.getTime()).toISOString(),
      isReminderActive: false,
    })

    // Set the first one to completed as sample
    setTimeout(() => {
      const notes = useNoteStore.getState().notes
      if (notes.length > 0) {
        useNoteStore.getState().toggleComplete(notes[0].id)
      }
    }, 50)

    toast.success('Đã nạp 3 ghi chú bàn giao mẫu!')
  }

  const handleTriggerInstantAlarm = () => {
    const { addNote } = useNoteStore.getState()
    const target = new Date(Date.now() + 15000) // target time: 15s from now
    const reminder = new Date(Date.now() + 3000) // reminder time: 3s from now

    addNote({
      title: '🔔 CẢNH BÁO BÀN GIAO MOCK',
      content:
        'Đây là ghi chú giả lập để kiểm tra âm thanh chuông báo và giao diện hiển thị đè màn hình.',
      targetTime: target.toISOString(),
      reminderTime: reminder.toISOString(),
      isReminderActive: true,
    })

    toast.info('Báo thức sẽ nổ chuông sau đúng 3 giây nữa!')
  }

  const handleTestReconciliation = async () => {
    const partnerIdTrimmed = recoPartnerId.trim()
    const affiliateIdTrimmed = recoAffiliateId.trim()

    if (!partnerIdTrimmed && !affiliateIdTrimmed) {
      toast.warning('Vui lòng nhập Partner ID hoặc Affiliate ID để đối soát.')
      return
    }
    if (!recoDateFrom || !recoDateTo) {
      toast.warning('Vui lòng nhập đầy đủ Từ ngày và Đến ngày.')
      return
    }

    setIsRecoLoading(true)
    setRecoResult(null)
    try {
      const dateFrom = new Date(recoDateFrom)
      const dateTo = new Date(recoDateTo)
      toast.info('Đang gọi API đối soát...')
      const result = await getReconciliation({
        partnerId: partnerIdTrimmed || null,
        affiliateId: affiliateIdTrimmed || null,
        dateFrom,
        dateTo,
      })
      setRecoResult(result)
      if (result) {
        const reco = result as any
        toast.success(
          `Đối soát thành công! ${reco.totalOrdersCount ?? 0} đơn — Hoa hồng: ${(reco.commissionAmount ?? 0).toLocaleString('vi-VN')}đ`,
          'Đối soát',
        )
      }
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status
      const msg = error?.message || 'Lỗi không xác định'
      toast.error(`${status ? `[${status}] ` : ''}${msg}`, 'Lỗi đối soát')
    } finally {
      setIsRecoLoading(false)
    }
  }

  const handleOpenReconciliationModal = () => {
    const partnerIdTrimmed = recoPartnerId.trim()
    const affiliateIdTrimmed = recoAffiliateId.trim()

    if (!partnerIdTrimmed && !affiliateIdTrimmed) {
      toast.warning('Vui lòng nhập Partner ID hoặc Affiliate ID.')
      return
    }
    if (!recoDateFrom || !recoDateTo) {
      toast.warning('Vui lòng nhập đầy đủ Từ ngày và Đến ngày.')
      return
    }

    devReconciliationModalRef.current?.open({
      ownerName: partnerIdTrimmed ? 'Đối tác Test' : 'CTV/HDV Test',
      ownerCode: partnerIdTrimmed || affiliateIdTrimmed,
      ownerType: partnerIdTrimmed ? 'agent' : 'collaborator',
      partnerId: partnerIdTrimmed || null,
      affiliateId: affiliateIdTrimmed || null,
      dateFrom: new Date(recoDateFrom),
      dateTo: new Date(recoDateTo),
    })
  }

  const handleOpenMockReconciliationModal = () => {
    const partnerIdTrimmed = recoPartnerId.trim() || 'MOCK-PARTNER-101'
    const affiliateIdTrimmed = recoAffiliateId.trim() || 'MOCK-AFFILIATE-202'
    const dateFrom = recoDateFrom ? new Date(recoDateFrom) : new Date()
    const dateTo = recoDateTo ? new Date(recoDateTo) : new Date()

    devReconciliationModalRef.current?.open({
      ownerName: recoPartnerId.trim() ? 'Đối tác Test (Mock)' : 'CTV/HDV Test (Mock)',
      ownerCode: recoPartnerId.trim() ? partnerIdTrimmed : affiliateIdTrimmed,
      ownerType: recoPartnerId.trim() ? 'agent' : 'collaborator',
      partnerId: partnerIdTrimmed,
      affiliateId: affiliateIdTrimmed,
      dateFrom,
      dateTo,
      mockData: {
        ownerName: recoPartnerId.trim() ? 'Đối tác Test (Mock)' : 'CTV/HDV Test (Mock)',
        ownerCode: recoPartnerId.trim() ? partnerIdTrimmed : affiliateIdTrimmed,
        ownerType: recoPartnerId.trim() ? 'agent' : 'collaborator',
        printTime: new Date().toLocaleString('vi-VN'),
        totalOrdersCount: 25,
        totalRevenue: 5000000,
        commissionRate: 0.1,
        commissionAmount: 500000,
        dateFrom: dateFrom.toLocaleDateString('vi-VN'),
        dateTo: dateTo.toLocaleDateString('vi-VN'),
      },
    })
  }

  const fetchShifts = async () => {
    setIsShiftsLoading(true)
    try {
      const axios = AxiosService.getInstance()
      const res = await axios.get<any>('/v1/cash-sessions', {
        params: { limit: 20 },
      })

      let items: any[] = []
      if (Array.isArray(res.data)) {
        items = res.data
      } else if (res.data && typeof res.data === 'object') {
        const obj = res.data
        items = obj.items || obj.data || (obj.data && obj.data.items) || obj.sessions || []
      }

      setShifts(items)

      // Auto select active session from context
      const appService = useAppStore.getState().appService
      if (appService) {
        const ctx = appService.getSnapshot().context
        if (ctx.cashSessionId) {
          setEmpShiftId(ctx.cashSessionId)
        } else if (items.length > 0 && !empShiftId) {
          setEmpShiftId(items[0].id)
        }
      } else if (items.length > 0 && !empShiftId) {
        setEmpShiftId(items[0].id)
      }
    } catch (error: any) {
      console.error('[DevControl] Lỗi lấy danh sách ca:', error)
      toast.error('Lỗi tải danh sách ca: ' + (error.message || 'Không xác định'))
    } finally {
      setIsShiftsLoading(false)
    }
  }

  useEffect(() => {
    if (empMode === 'shift') {
      fetchShifts()
    }
  }, [empMode])

  const handleQueryCTV = async () => {
    setIsEntityLoading(true)
    setEntityModalTitle('Danh sách Cộng tác viên (Affiliates)')
    setEntityModalData(null)
    setIsEntityModalVisible(true)
    try {
      toast.info('Đang gọi API lấy danh sách CTV...')
      const res = await getAffiliatesRemote({
        isActive: ctvIsActive,
        hasTransaction: ctvHasTransaction,
        limit: ctvLimit,
      })
      setEntityModalData(res)
      toast.success('Tải danh sách CTV thành công!')
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || error.message || 'Lỗi không xác định'
      setEntityModalData({ error: errMsg })
      toast.error('Lỗi: ' + errMsg)
    } finally {
      setIsEntityLoading(false)
    }
  }

  const handleQueryPartners = async () => {
    setIsEntityLoading(true)
    setEntityModalTitle('Danh sách Đối tác (Partners)')
    setEntityModalData(null)
    setIsEntityModalVisible(true)
    try {
      toast.info('Đang gọi API lấy danh sách Đối tác...')
      const res = await getPartnersRemote({
        isActive: partnerIsActive,
        hasTransaction: partnerHasTransaction,
        limit: partnerLimit,
      })
      setEntityModalData(res)
      toast.success('Tải danh sách đối tác thành công!')
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || error.message || 'Lỗi không xác định'
      setEntityModalData({ error: errMsg })
      toast.error('Lỗi: ' + errMsg)
    } finally {
      setIsEntityLoading(false)
    }
  }

  const handleQueryEmployees = async () => {
    setIsEntityLoading(true)
    setEntityModalTitle(
      empMode === 'shift'
        ? `Danh sách Nhân viên trong ca (${empShiftId || 'Chưa chọn'})`
        : 'Danh sách tất cả Nhân viên (Không ca)',
    )
    setEntityModalData(null)
    setIsEntityModalVisible(true)
    try {
      const shiftIdParam = empMode === 'shift' ? empShiftId : undefined
      toast.info('Đang gọi API lấy danh sách nhân viên...')
      const res = await getEmployees({
        shiftId: shiftIdParam,
        isPos: empIsPos,
        status: empStatus,
        hasTransaction: empHasTransaction,
      })
      setEntityModalData(res)
      toast.success('Tải danh sách nhân viên thành công!')
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || error.message || 'Lỗi không xác định'
      setEntityModalData({ error: errMsg })
      toast.error('Lỗi: ' + errMsg)
    } finally {
      setIsEntityLoading(false)
    }
  }

  return (
    <ScrollView className="flex-1 bg-surface-200 p-6">
      <Text className="mb-6 text-headline-md font-bold text-primary">Dev Control Panel</Text>
      {/* 1.5. Toast & Alert Testing */}
      <Container className="mb-6 p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-title-md font-bold text-surface-on">
            Test Alert & Toast Notification
          </Text>
          <View className="rounded-full bg-primary/10 px-3 py-1">
            <Text className="text-body-sm font-semibold text-primary">
              Lượt test: #{toastTestCount}
            </Text>
          </View>
        </View>

        {/* Section 1: Swap Mode Test (Tránh dài xuống khi quét liên tục) */}
        <View className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <Text className="mb-1 text-body-md font-bold text-emerald-700 dark:text-emerald-400">
            ⚡ Chế độ SWAP (Thay thế toast cũ ngay lập tức - Không dồn hàng)
          </Text>
          <Text className="mb-3 text-body-sm text-surface-500">
            Dùng cho luồng quét mã vạch liên tục (useScanLookup). Khi quét nhiều món liên tiếp,
            toast mới sẽ thay thế toast cũ thay vì xếp chồng dài xuống màn hình.
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <Button
              label={`⚡ Swap Success (SP #${toastTestCount})`}
              className="bg-emerald-600"
              onPress={handleTestToastSwapSuccess}
            />
            <Button
              label={`⚡ Swap Error (SP #${toastTestCount})`}
              className="bg-rose-600"
              onPress={handleTestToastSwapError}
            />
            <Button
              label="⚡ Bắn nhanh 3 Toast Swap (250ms)"
              className="bg-teal-700"
              onPress={handleTestRapidSwap}
            />
          </View>
        </View>

        {/* Section 2: Stack Mode Test (Mặc định để so sánh) */}
        <View className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <Text className="mb-1 text-body-md font-bold text-amber-700 dark:text-amber-400">
            📚 Chế độ STACK (Mặc định - Xếp chồng dồn xuống)
          </Text>
          <Text className="mb-3 text-body-sm text-surface-500">
            Hành vi mặc định khi không truyền swap: true. Các toast sẽ xếp chồng xuống dưới màn hình
            để so sánh trực quan.
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <Button
              label={`📚 Stack Success (SP #${toastTestCount})`}
              className="bg-amber-600"
              onPress={handleTestToastStackSuccess}
            />
            <Button
              label="📚 Bắn nhanh 3 Toast Stack (250ms)"
              className="bg-orange-600"
              onPress={handleTestRapidStack}
            />
          </View>
        </View>

        {/* Section 3: Standard Toasts & Dialogs */}
        <Text className="mb-2 text-body-sm font-semibold text-surface-500">
          Toast tiêu chuẩn & Hộp thoại xác nhận:
        </Text>
        <View className="flex-row flex-wrap gap-2">
          <Button
            label="Toast Success"
            className="bg-green-600"
            onPress={() => toast.success('Giao dịch đã được thực hiện thành công!', 'Thành công')}
          />
          <Button
            label="Toast Error"
            className="bg-red-600"
            onPress={() => toast.error('Có lỗi xảy ra khi kết nối máy chủ.', 'Lỗi kết nối')}
          />
          <Button
            label="Toast Warning"
            className="bg-orange-500"
            onPress={() => toast.warning('Số lượng hàng trong kho sắp hết.', 'Cảnh báo')}
          />
          <Button
            label="Toast Info"
            className="bg-blue-600"
            onPress={() => toast.info('Phiên bản phần mềm đã được cập nhật.', 'Thông báo')}
          />
          <Button
            label="Confirm Dialog"
            variant="outline"
            className="border-primary"
            textClassName="text-primary"
            onPress={() =>
              toast.confirm({
                title: 'Xác nhận in lại?',
                message: 'Bạn có chắc chắn muốn in lại hóa đơn này không?',
                onConfirm: () => toast.success('Đang gửi lệnh in...'),
                onCancel: () => {},
              })
            }
          />
          <Button
            label="Info Popup"
            variant="outline"
            className="border-primary"
            textClassName="text-primary"
            onPress={() =>
              toast.infoPopup({
                title: 'Thông báo',
                message: 'Giao dịch đã được ghi nhận. Vui lòng hoàn tiền cho khách hàng.',
                onConfirm: () => {},
              })
            }
          />
          <Button
            label="🔄 Reset số lần test"
            variant="outline"
            className="border-surface-400"
            textClassName="text-surface-600"
            onPress={() => setToastTestCount(1)}
          />
        </View>
      </Container>

      {/* Vice Screen Testing */}
      <Container className="mb-6 p-4">
        <Text className="text-title-md mb-3 font-bold text-surface-on">
          Test Vice Customer Display Screens
        </Text>
        <View className="flex-row flex-wrap gap-3">
          <Button
            label="Màn hình Chờ / Giỏ hàng"
            className="bg-sky-600"
            onPress={() =>
              ViceService.updateCart({
                items: [
                  { id: '1', name: 'Nước ngọt Coca-Cola', price: 15000, quantity: 2 },
                  { id: '2', name: 'Magnet Bitexco', price: 45000, quantity: 1 },
                ],
                subtotal: 75000,
                discount: 5000,
                tax: 6000,
                total: 76000,
              })
            }
          />
          <Button
            label="Màn hình QR Code"
            className="bg-indigo-600"
            onPress={() =>
              ViceService.showPayment({
                qrCodeUrl:
                  'https://img.vietqr.io/image/970415-1133666777-compact.png?amount=76000&addInfo=SO-MOCK-TEST',
                subtotal: 75000,
                discount: 5000,
                tax: 6000,
                total: 76000,
              })
            }
          />
          <Button
            label="Màn hình Cà Thẻ (Portable)"
            className="bg-purple-600"
            onPress={() => ViceService.showPortablePayment({ total: 76000 })}
          />
          <Button
            label="Màn hình Thanh Toán Hỗn Hợp (Mix)"
            className="bg-fuchsia-600"
            onPress={() =>
              ViceService.showMixPayment({
                subtotal: 75000,
                discount: 5000,
                tax: 6000,
                total: 76000,
                cashPaid: 50000,
                nonCashAmount: 26000,
              })
            }
          />
          <Button
            label="Màn hình Thối Tiền (Cash)"
            className="bg-emerald-600"
            onPress={() =>
              ViceService.showCashPayment({
                subtotal: 75000,
                discount: 5000,
                tax: 6000,
                total: 76000,
                customerPaid: 100000,
                change: 24000,
              })
            }
          />
          <Button
            label="Màn hình Thành Công"
            className="bg-teal-600"
            onPress={() =>
              ViceService.paymentSuccess({
                subtotal: 75000,
                discount: 5000,
                tax: 6000,
                total: 76000,
                customerPaid: 76000,
                change: 0,
              })
            }
          />
          <Button
            label="Màn hình Hết Giờ (Timeout) ⏰"
            className="bg-red-600"
            onPress={() =>
              ViceService.showStatus({
                type: 'error',
                title: 'Hết thời gian thanh toán',
                message: 'Vui lòng chờ nhân viên thao tác',
              })
            }
          />
          <Button
            label="Status Error Custom ❌"
            className="bg-rose-700"
            onPress={() =>
              ViceService.showStatus({
                type: 'error',
                title: 'Đã xảy ra lỗi!',
                message: 'Kết nối đầu đọc thẻ thất bại, vui lòng thử lại.',
              })
            }
          />
          <Button
            label="Status Success Custom ✅"
            className="bg-green-700"
            onPress={() =>
              ViceService.showStatus({
                type: 'success',
                title: 'Hoàn tất giao dịch',
                message: 'Cảm ơn quý khách đã mua sắm tại Bitexco!',
              })
            }
          />
          <Button
            label="Status Info Custom ℹ️"
            className="bg-blue-600"
            onPress={() =>
              ViceService.showStatus({
                type: 'info',
                title: 'Đang xử lý',
                message: 'Vui lòng chờ trong giây lát...',
              })
            }
          />
          <Button
            label="Reset về Home"
            variant="outline"
            className="border-neutral-500"
            textClassName="text-neutral-700"
            onPress={() =>
              ViceService.updateCart({
                items: [],
                subtotal: 0,
                discount: 0,
                tax: 0,
                total: 0,
              })
            }
          />
        </View>
      </Container>

      {/* Token Lab — test refresh token flow thực */}
      <Container className="mb-6 border border-primary/20 bg-primary/5 p-4">
        <Text className="text-title-md mb-1 font-black uppercase tracking-wider text-primary">
          🔑 Token Lab
        </Text>
        <Text className="mb-4 text-body-xs text-muted">
          Test refresh token flow thực với backend. Không dùng mock.
        </Text>

        <View className="gap-3">
          {/* Row 1: Inspect & Refresh */}
          <View className="flex-row gap-3">
            <Button
              label="Log Token State"
              variant="outline"
              className="flex-1 border-sky-500"
              textClassName="text-sky-600 text-xs font-bold"
              onPress={handleLogTokenState}
            />
            <Button
              label="Gọi /refresh thủ công"
              variant="outline"
              className="flex-1 border-violet-500"
              textClassName="text-violet-600 text-xs font-bold"
              onPress={handleManualRefresh}
            />
          </View>

          {/* Row 2: Expire scenarios */}
          <View className="flex-row gap-3">
            <Button
              label="Null accessToken"
              variant="outline"
              className="flex-1 border-amber-500"
              textClassName="text-amber-600 text-xs font-bold"
              onPress={handleExpireAccessToken}
            />
            <Button
              label="Xoá refreshToken"
              variant="outline"
              className="flex-1 border-orange-500"
              textClassName="text-orange-600 text-xs font-bold"
              onPress={handleExpireRefreshToken}
            />
          </View>

          {/* Row 3: Nuclear options */}
          <View className="flex-row gap-3">
            <Button
              label="Wipe cả 2 tokens"
              variant="outline"
              className="flex-1 border-error"
              textClassName="text-error text-xs font-bold"
              onPress={handleWipeBothTokens}
            />
            <Button
              label="Simulate TOKEN_EXPIRED"
              variant="outline"
              className="flex-1 border-amber-600"
              textClassName="text-amber-600 text-xs font-bold"
              onPress={handleSimulateTokenExpired}
            />
          </View>

          {/* Row 4: Test Silent Refresh & Force Logout */}
          <View className="flex-row gap-3">
            <Button
              label="Test Silent Refresh"
              variant="outline"
              className="flex-1 border-purple-500"
              textClassName="text-purple-600 text-xs font-bold"
              onPress={handleTestSilentRefresh}
            />
            <Button
              label="Force LOGOUT"
              variant="outline"
              className="flex-1 border-error"
              textClassName="text-error text-xs font-bold"
              onPress={handleForceLogout}
            />
          </View>
        </View>
      </Container>

      {/* Portable POS URL Configuration */}
      <Container className="mb-6 border border-violet-600/20 bg-violet-600/5 p-4">
        <Text className="text-title-md mb-1 font-black uppercase tracking-wider text-violet-700">
          ⚙️ Portable POS Configuration
        </Text>
        <Text className="mb-4 text-body-xs text-muted">
          Cấu hình địa chỉ Socket/HTTP kết nối tới thiết bị POS Ingenico Sandbox.
        </Text>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-body-sm font-bold text-surface-on">Trạng thái kết nối POS:</Text>
            <View className="flex-row items-center gap-1.5">
              <View
                className={`h-2.5 w-2.5 rounded-full ${
                  isPosConnected === true
                    ? 'bg-green-500'
                    : isPosConnected === false
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                }`}
              />
              <Text className="text-surface-onVariant text-body-xs font-bold">
                {isPosConnected === true
                  ? 'ĐÃ KẾT NỐI'
                  : isPosConnected === false
                    ? 'MẤT KẾT NỐI'
                    : 'ĐANG CHECK/CHƯA RÕ'}
              </Text>
            </View>
          </View>

          <Input
            value={posUrlInput}
            onChangeText={setPosUrlInput}
            placeholder="Ví dụ: http://192.168.1.100:8080"
            className="h-[50px] bg-white text-sm"
          />

          <Button
            label="Lưu & Thử kết nối"
            className="bg-violet-600"
            loading={isCheckingPosConnection}
            onPress={handleSaveAndTestPos}
          />
        </View>
      </Container>

      {/* Dev Handover Note & Alarm Controls */}
      <Container className="mb-6 border border-emerald-600/20 bg-emerald-600/5 p-4">
        <Text className="text-title-md mb-1 font-black uppercase tracking-wider text-emerald-700">
          Mock Handover Notes & Alarms
        </Text>
        <Text className="mb-4 text-body-xs text-muted">
          Quản lý nhanh danh sách note bàn giao & giả lập chuông báo thức tức thì
        </Text>

        <View className="gap-4">
          <View className="flex-row gap-3">
            <Button
              label="Nạp Notes mẫu Tiger/Cafe/Két"
              variant="outline"
              className="flex-1 border-emerald-600"
              textClassName="text-emerald-700 font-bold"
              onPress={handleSeedNotes}
            />
            <Button
              label="Xóa sạch Notes"
              variant="outline"
              className="flex-1 border-error"
              textClassName="text-error font-bold"
              onPress={handleClearNotes}
            />
          </View>

          <Button
            label="🔔 Kích hoạt Báo thức tức thì (Sau 3 giây)"
            className="bg-emerald-600"
            textClassName="text-white font-black"
            onPress={handleTriggerInstantAlarm}
          />
        </View>
      </Container>

      {/* 1. Seeding / Clearing */}
      <Container className="mb-6 p-4">
        <Text className="text-title-md mb-3 font-bold text-surface-on">Thao tác Dữ liệu</Text>
        <View className="flex-row gap-4">
          <Button label="Nạp Mock Data" className="flex-1 bg-primary" onPress={handleSeedData} />
          <Button
            label="Xóa sạch DB"
            variant="outline"
            className="flex-1 border-error"
            textClassName="text-error"
            onPress={handleClearData}
          />
        </View>
        <View className="mt-4 flex-col gap-4">
          <Button
            label="Test API: Kích hoạt máy POS (/v1/pos-devices/activate)"
            className="bg-blue-600"
            onPress={handleTestActivateDevice}
          />
          <Button
            label="Test API: Lấy DS Payment Methods (/v1/payment-methods)"
            className="bg-violet-600"
            onPress={handleTestGetPaymentMethods}
          />
          <Button
            label="Log Terminal Config & Context hiện tại"
            className="bg-purple-700"
            onPress={handleLogCurrentTerminalConfig}
          />
          <Button
            label="Test API: Device Context (/v1/pos/device-context)"
            className="bg-teal-600"
            onPress={handleTestGetDeviceContext}
          />
          <Button
            label="Test API: Tra cứu đơn hàng (/v1/orders/lookup)"
            className="bg-indigo-600"
            onPress={handleTestOrderLookup}
          />
          <Button
            label="Test Scan: Quét mã 20501080005179 (useScanLookup)"
            className="bg-teal-600"
            loading={isScanning}
            onPress={() => scanLookupProduct(['20501080005179'])}
          />
          <Button
            label="Test Quét 2 lần liên tục (useScanLookup - Test Swap)"
            className="bg-emerald-700"
            loading={isScanning}
            onPress={() => {
              scanLookupProduct(['20501080005179'])
              setTimeout(() => {
                scanLookupProduct(['20501080005179'])
              }, 400)
            }}
          />
          <Button
            label="Test API: Tra cứu SP 20501080005179 (/v1/pos/lookup)"
            className="bg-emerald-600"
            onPress={handleTestProductLookup}
          />
          <Button
            label="Test API: Đổi hàng (/v1/pos/orders/{id}/exchange)"
            className="bg-red-600"
            onPress={handleTestExchangeAPI}
          />
          <Button
            label="Test API: Z-Report (/v1/cash-sessions/{id}/z-report)"
            className="bg-sky-600"
            onPress={handleTestZReportAPI}
          />
          <Button
            label="In Bill Z-Report từ API"
            className="bg-teal-600"
            disabled={!apiZReportData}
            onPress={handlePrintApiZReport}
          />
          <Button
            label="Test API: Đồng bộ sản phẩm (fetchChanges)"
            className="bg-orange-600"
            loading={isFetchingChanges}
            onPress={handleTestFetchChanges}
          />
          <Button
            label="Test API: Đồng bộ Đối tác (Partner)"
            className="bg-purple-600"
            onPress={handleTestSyncPartner}
          />
          <Button
            label="Test API: Đồng bộ CTV (Affiliate)"
            className="bg-pink-600"
            onPress={handleTestSyncAffiliate}
          />
          <Button
            label="Đồng bộ sản phẩm & danh mục từ Server (Lưu Local DB)"
            className="bg-emerald-700"
            loading={isFetchingChanges}
            onPress={handleSyncProductsFromServer}
          />
        </View>
      </Container>

      {/* 2. Statistics */}
      <Container className="mb-12 p-4">
        <Text className="text-title-md mb-3 font-bold text-surface-on">Bảng Thống Kê Local DB</Text>
        <View className="mb-4 flex-row justify-around rounded-xl bg-surface-100 p-4">
          <View className="items-center">
            <Text className="text-headline-sm font-bold text-primary">{categories.length}</Text>
            <Text className="text-surface-onVariant text-body-sm">Danh mục</Text>
          </View>
          <View className="items-center">
            <Text className="text-headline-sm font-bold text-primary">{products.length}</Text>
            <Text className="text-surface-onVariant text-body-sm">Sản phẩm</Text>
          </View>
        </View>

        <Text className="mb-2 text-title-sm font-semibold text-surface-on">
          Số lượng theo danh mục:
        </Text>
        {categories.map((cat) => (
          <View
            key={cat.id}
            className="flex-row justify-between border-b border-outline-variant py-2"
          >
            <View className="flex-row items-center gap-2">
              <View
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: cat.color || '#ccc' }}
              />
              <Text className="text-body-md font-medium text-surface-on">{cat.name}</Text>
            </View>
            <Text className="text-body-md font-bold text-primary">
              {getProductCountByCat(cat.id)} món
            </Text>
          </View>
        ))}
      </Container>

      {/* 3. Receipt Preview */}
      <Text className="text-headline-sm mb-4 font-bold text-primary">Receipt Preview</Text>
      <View className="mb-12 items-center justify-center rounded-[32px] bg-surface-100 py-10 shadow-sm">
        {/* Preview hiển thị */}
        <View className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-xl">
          <BitexcoReceiptTemplate
            order={
              {
                id: 'ORD-MOCK-2026',
                createdAt: new Date(),
                total: 299480,
                subtotal: 306000,
                discount: 31000,
                totalTax: 24480,
                itemsSnapshot: [
                  {
                    sku: '2010113000043',
                    name: 'Metal Magnet Bitexco',
                    price: 78000,
                    quantity: 2,
                    subtotal: 156000,
                    taxRate: 8,
                    taxAmount: 12480,
                  },
                  {
                    sku: '2010113000088',
                    name: 'Postcard Saigon Skydeck',
                    price: 15000,
                    quantity: 1,
                    subtotal: 15000,
                    taxRate: 8,
                    taxAmount: 1200,
                  },
                  {
                    sku: '2010113000099',
                    name: 'Keychain Bitexco Tower',
                    price: 45000,
                    quantity: 3,
                    subtotal: 135000,
                    taxRate: 8,
                    taxAmount: 10800,
                  },
                ],
                paymentsSnapshot: [
                  {
                    method: 'CARD',
                    amount: 299480,
                  },
                ],
                staffId: 'NV001',
              } as any
            }
            staffName="Nguyễn Huỳnh Trâm Anh"
          />
        </View>
        <Text className="text-surface-onVariant mt-4 text-xs font-bold uppercase tracking-widest">
          Mẫu hóa đơn thực tế (Width: 576px)
        </Text>

        <View className="mt-4 flex-row gap-3">
          <Button
            label="In 3 SP"
            variant="outline"
            className="flex-1 border-primary"
            textClassName="text-primary font-bold"
            loading={isPrinting}
            disabled={isPrinting}
            onPress={() => handlePrint(receiptPrintRef3, '3 sản phẩm')}
          />
          <Button
            label="In 10 SP"
            variant="outline"
            className="flex-1 border-primary"
            textClassName="text-primary font-bold"
            loading={isPrinting}
            disabled={isPrinting}
            onPress={() => handlePrint(receiptPrintRef10, '10 sản phẩm')}
          />
        </View>

        <View className="mt-3 flex-row gap-3">
          <Button
            label="In 2 liên (3 SP)"
            variant="primary"
            className="flex-1 bg-primary"
            textClassName="text-white font-bold"
            loading={isPrinting}
            disabled={isPrinting}
            onPress={() => handlePrintDoubleCopy(receiptPrintRef3, '3 sản phẩm')}
          />
          <Button
            label="In 2 liên (10 SP)"
            variant="primary"
            className="flex-1 bg-primary"
            textClassName="text-white font-bold"
            loading={isPrinting}
            disabled={isPrinting}
            onPress={() => handlePrintDoubleCopy(receiptPrintRef10, '10 sản phẩm')}
          />
        </View>

        <View className="mt-3 flex-row gap-3">
          {[1, 2, 3].map((n) => (
            <Button
              key={n}
              label={`In CMD lần ${n}`}
              variant="primary"
              className="px-4"
              textClassName="font-bold"
              loading={isPrinting}
              disabled={isPrinting}
              onPress={() => handlePrintTextCmd(n)}
            />
          ))}
        </View>

        <View className="mt-3 flex-row gap-3">
          <Button
            label="Mở két (Cashbox)"
            variant="outline"
            className="flex-1 border-amber-500"
            textClassName="text-amber-600 font-bold"
            onPress={handleOpenCashbox}
          />
        </View>
      </View>

      {/* Hidden refs dùng để chụp ảnh in — render ngoài màn hình */}
      <View style={{ position: 'absolute', left: -2000, top: 0 }} collapsable={false}>
        {/* Mẫu 3 sản phẩm */}
        <View collapsable={false} ref={receiptPrintRef3}>
          <BitexcoReceiptTemplate
            order={
              {
                id: 'ORD-MOCK-2026',
                createdAt: new Date(),
                total: 299480,
                subtotal: 306000,
                discount: 31000,
                totalTax: 24480,
                itemsSnapshot: [
                  {
                    sku: '2010113000043',
                    name: 'Metal Magnet Bitexco',
                    price: 78000,
                    quantity: 2,
                    subtotal: 156000,
                    taxRate: 8,
                    taxAmount: 12480,
                  },
                  {
                    sku: '2010113000088',
                    name: 'Postcard Saigon Skydeck',
                    price: 15000,
                    quantity: 1,
                    subtotal: 15000,
                    taxRate: 8,
                    taxAmount: 1200,
                  },
                  {
                    sku: '2010113000099',
                    name: 'Keychain Bitexco Tower',
                    price: 45000,
                    quantity: 3,
                    subtotal: 135000,
                    taxRate: 8,
                    taxAmount: 10800,
                  },
                ],
                paymentsSnapshot: [
                  {
                    method: 'CARD',
                    amount: 299480,
                  },
                ],
                staffId: 'NV001',
              } as any
            }
            staffName="Nguyễn Huỳnh Trâm Anh"
          />
        </View>

        {/* Mẫu 10 sản phẩm */}
        <View collapsable={false} ref={receiptPrintRef10}>
          <BitexcoReceiptTemplate
            order={
              {
                id: 'ORD-MOCK-2026',
                createdAt: new Date(),
                total: 1522880,
                subtotal: 1536000,
                discount: 136000,
                totalTax: 122880,
                itemsSnapshot: [
                  {
                    sku: '2010113000043',
                    name: 'Metal Magnet Bitexco',
                    price: 78000,
                    quantity: 2,
                    subtotal: 156000,
                    taxRate: 8,
                    taxAmount: 12480,
                  },
                  {
                    sku: '2010113000088',
                    name: 'Postcard Saigon Skydeck',
                    price: 15000,
                    quantity: 1,
                    subtotal: 15000,
                    taxRate: 8,
                    taxAmount: 1200,
                  },
                  {
                    sku: '2010113000099',
                    name: 'Keychain Bitexco Tower',
                    price: 45000,
                    quantity: 3,
                    subtotal: 135000,
                    taxRate: 8,
                    taxAmount: 10800,
                  },
                  {
                    sku: '2010113000101',
                    name: 'Coffee Mug Saigon',
                    price: 120000,
                    quantity: 1,
                    subtotal: 120000,
                    taxRate: 8,
                    taxAmount: 9600,
                  },
                  {
                    sku: '2010113000102',
                    name: 'T-shirt Saigon Skydeck',
                    price: 250000,
                    quantity: 2,
                    subtotal: 500000,
                    taxRate: 8,
                    taxAmount: 40000,
                  },
                  {
                    sku: '2010113000103',
                    name: 'Notebook Skyline',
                    price: 60000,
                    quantity: 1,
                    subtotal: 60000,
                    taxRate: 8,
                    taxAmount: 4800,
                  },
                  {
                    sku: '2010113000104',
                    name: 'Canvas Tote Bag',
                    price: 95000,
                    quantity: 2,
                    subtotal: 190000,
                    taxRate: 8,
                    taxAmount: 15200,
                  },
                  {
                    sku: '2010113000105',
                    name: 'Wooden Coaster Set',
                    price: 80000,
                    quantity: 1,
                    subtotal: 80000,
                    taxRate: 8,
                    taxAmount: 6400,
                  },
                  {
                    sku: '2010113000106',
                    name: 'Snow Globe Skydeck',
                    price: 180000,
                    quantity: 1,
                    subtotal: 180000,
                    taxRate: 8,
                    taxAmount: 14400,
                  },
                  {
                    sku: '2010113000107',
                    name: 'Sticker Pack Iconic',
                    price: 20000,
                    quantity: 5,
                    subtotal: 100000,
                    taxRate: 8,
                    taxAmount: 8000,
                  },
                ],
                paymentsSnapshot: [
                  {
                    method: 'CARD',
                    amount: 1522880,
                  },
                ],
                staffId: 'NV001',
              } as any
            }
            staffName="Nguyễn Huỳnh Trâm Anh"
          />
        </View>
      </View>

      {/* 3.5 Close Shift Receipt Preview */}
      <Text className="text-headline-sm mb-4 font-bold text-primary">
        Close Shift Receipt Preview
      </Text>
      <View className="mb-12 items-center justify-center rounded-[32px] bg-surface-100 py-10 shadow-sm">
        <View
          collapsable={false}
          ref={closeShiftPrintRef}
          className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-xl"
        >
          <CloseShiftReceiptTemplate
            data={
              {
                shiftCode: 'SHIFT-260622-001',
                shiftTime: 'Ca sáng',
                openedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
                closedAt: new Date().toISOString(),
                posDeviceName: 'POS Quầy 1',
                totalOrders: 47,
                staffSummaries: [
                  {
                    staffName: 'Nguyễn Văn A',
                    staffCode: 'NV001',
                    orderCount: 25,
                    cashAmount: 5200000,
                    qrAmount: 1800000,
                    cardAmount: 3500000,
                    debtAmount: 0,
                    totalRevenue: 10500000,
                  },
                  {
                    staffName: 'Trần Thị B',
                    staffCode: 'NV002',
                    orderCount: 22,
                    cashAmount: 4100000,
                    qrAmount: 2200000,
                    cardAmount: 2800000,
                    debtAmount: 0,
                    totalRevenue: 9100000,
                  },
                ],
                grandCash: 9300000,
                grandQr: 4000000,
                grandCard: 6300000,
                grandDebt: 0,
                grandTotal: 19600000,
              } satisfies CloseShiftReceiptData
            }
          />
        </View>
        <Text className="text-surface-onVariant mt-4 text-xs font-bold uppercase tracking-widest">
          Mẫu bill kết ca có breakdown từng nhân viên (Width: 576px)
        </Text>

        <View className="mt-4 w-full flex-row gap-3 px-6">
          <Button
            label="In Bill Kết Ca"
            variant="outline"
            className="flex-1 border-primary"
            textClassName="text-primary font-bold"
            loading={isPrinting}
            disabled={isPrinting}
            onPress={() => handlePrint(closeShiftPrintRef, 'bill kết ca')}
          />
          <Button
            label="In 2 Liên"
            variant="primary"
            className="flex-1 bg-primary"
            textClassName="text-white font-bold"
            loading={isPrinting}
            disabled={isPrinting}
            onPress={() => handlePrintDoubleCopy(closeShiftPrintRef, 'bill kết ca')}
          />
        </View>
      </View>

      {/* 4. Refund Receipt Preview */}
      <Text className="text-headline-sm mb-4 font-bold text-primary">Refund Receipt Preview</Text>
      <View className="mb-12 items-center justify-center rounded-[32px] bg-surface-100 py-10 shadow-sm">
        <View
          collapsable={false}
          ref={refundPrintRef}
          className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-xl"
        >
          <RefundReceiptTemplate
            receipt={{
              orderId: 'ORD-MOCK-2026',
              orderCode: 'SO-260613163910D7',
              returnId: 'RET-MOCK-2026',
              returnCode: 'RT-260613164012A3',
              reason: 'Khách hàng đổi ý, trả hàng',
              refundedAt: new Date().toISOString(),
              refundAmount: 78000,
              lines: [
                {
                  productId: 'P001',
                  sku: '2010113000043',
                  name: 'Metal Magnet Bitexco',
                  orderedQty: 2,
                  returnedQty: 1,
                  remainingQty: 1,
                  unitPrice: 78000,
                  lineRefundAmount: 78000,
                  isReturned: true,
                },
                {
                  productId: 'P002',
                  sku: '2010113000088',
                  name: 'Postcard Saigon Skydeck',
                  orderedQty: 1,
                  returnedQty: 0,
                  remainingQty: 1,
                  unitPrice: 15000,
                  lineRefundAmount: 0,
                  isReturned: false,
                },
              ],
            }}
          />
        </View>
        <Text className="text-surface-onVariant mt-4 text-xs font-bold uppercase tracking-widest">
          Mẫu phiếu trả hàng thực tế (Width: 576px)
        </Text>

        <View className="mt-4 w-full flex-row gap-3 px-6">
          <Button
            label="In Phiếu Trả"
            variant="outline"
            className="flex-1 border-primary"
            textClassName="text-primary font-bold"
            loading={isPrinting}
            disabled={isPrinting}
            onPress={() => handlePrint(refundPrintRef, 'phiếu trả hàng')}
          />
          <Button
            label="In 2 liên"
            variant="primary"
            className="flex-1 bg-primary"
            textClassName="text-white font-bold"
            loading={isPrinting}
            disabled={isPrinting}
            onPress={() => handlePrintDoubleCopy(refundPrintRef, 'phiếu trả hàng')}
          />
        </View>
      </View>

      {/* 5. Reconciliation Receipt Preview */}
      <Text className="text-headline-sm mb-4 font-bold text-primary">
        Reconciliation Receipt Preview
      </Text>
      <View className="mb-12 items-center justify-center rounded-[32px] bg-surface-100 py-10 shadow-sm">
        <View
          collapsable={false}
          ref={reconciliationPrintRef}
          className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-xl"
        >
          <ReconciliationReceiptTemplate
            data={{
              ownerName: 'Nguyễn Thị Mai',
              ownerCode: 'CTV-101',
              ownerType: 'collaborator',
              printTime: new Date().toLocaleString('vi-VN'),
              totalOrdersCount: 2,
              totalRevenue: 350000,
              commissionRate: 0.1,
              commissionAmount: 35000,
              dateFrom: '01/06/2026',
              dateTo: '30/06/2026',
            }}
          />
        </View>
        <Text className="text-surface-onVariant mt-4 text-xs font-bold uppercase tracking-widest">
          Mẫu biên nhận đối soát thực tế (Width: 576px)
        </Text>

        <View className="mt-4 w-full flex-row gap-3 px-6">
          <Button
            label="In Phiếu Đối Soát"
            variant="outline"
            className="flex-1 border-primary"
            textClassName="text-primary font-bold"
            loading={isPrinting}
            disabled={isPrinting}
            onPress={() => handlePrint(reconciliationPrintRef, 'biên nhận đối soát')}
          />
          <Button
            label="In 2 liên"
            variant="primary"
            className="flex-1 bg-primary"
            textClassName="text-white font-bold"
            loading={isPrinting}
            disabled={isPrinting}
            onPress={() => handlePrintDoubleCopy(reconciliationPrintRef, 'biên nhận đối soát')}
          />
        </View>
      </View>

      {/* 6. Reconciliation API Test */}
      <Container className="mb-6 border border-teal-600/20 bg-teal-600/5 p-4">
        <Text className="text-title-md mb-1 font-black uppercase tracking-wider text-teal-700">
          🧾 Test API Đối Soát (Reconciliation)
        </Text>
        <Text className="mb-4 text-body-xs text-muted">
          Nhập Partner ID hoặc Affiliate ID + khoảng ngày. API tự tính doanh số &amp; hoa hồng.
        </Text>

        <View className="gap-3">
          <Input
            value={recoPartnerId}
            onChangeText={setRecoPartnerId}
            placeholder="Partner ID (Đối tác) — để trống nếu dùng Affiliate ID"
            className="h-[48px] bg-white text-sm"
          />
          <Input
            value={recoAffiliateId}
            onChangeText={setRecoAffiliateId}
            placeholder="Affiliate ID (CTV / HDV) — để trống nếu dùng Partner ID"
            className="h-[48px] bg-white text-sm"
          />
          <View className="flex-row gap-3">
            <Input
              value={recoDateFrom}
              onChangeText={setRecoDateFrom}
              placeholder="Từ ngày (YYYY-MM-DD)"
              className="h-[48px] flex-1 bg-white text-sm"
            />
            <Input
              value={recoDateTo}
              onChangeText={setRecoDateTo}
              placeholder="Đến ngày (YYYY-MM-DD)"
              className="h-[48px] flex-1 bg-white text-sm"
            />
          </View>

          <Button
            label="Gọi API Đối Soát"
            className="bg-teal-600"
            loading={isRecoLoading}
            onPress={handleTestReconciliation}
          />

          <View className="flex-row gap-3">
            <Button
              label="Mở Modal Đối Soát (Thật)"
              className="flex-1 bg-teal-700"
              onPress={handleOpenReconciliationModal}
            />
            <Button
              label="Mở Modal Đối Soát (Mock)"
              className="flex-1 bg-sky-600"
              onPress={handleOpenMockReconciliationModal}
            />
          </View>

          {recoResult && (
            <View className="mt-2 gap-2 rounded-xl border border-teal-200 bg-white p-4">
              <Text className="mb-1 text-title-sm font-bold text-teal-700">Kết quả đối soát</Text>
              <View className="flex-row justify-between border-b border-teal-100 py-1">
                <Text className="text-body-sm text-neutral-500">Mã</Text>
                <Text className="text-body-sm font-bold text-surface-on">
                  {recoResult.ownerCode}
                </Text>
              </View>
              <View className="flex-row justify-between border-b border-teal-100 py-1">
                <Text className="text-body-sm text-neutral-500">Từ ngày</Text>
                <Text className="text-body-sm font-bold text-surface-on">
                  {recoResult.dateFrom}
                </Text>
              </View>
              <View className="flex-row justify-between border-b border-teal-100 py-1">
                <Text className="text-body-sm text-neutral-500">Đến ngày</Text>
                <Text className="text-body-sm font-bold text-surface-on">{recoResult.dateTo}</Text>
              </View>
              <View className="flex-row justify-between border-b border-teal-100 py-1">
                <Text className="text-body-sm text-neutral-500">Tổng đơn</Text>
                <Text className="text-body-sm font-bold text-surface-on">
                  {recoResult.totalOrdersCount} đơn
                </Text>
              </View>
              <View className="flex-row justify-between border-b border-teal-100 py-1">
                <Text className="text-body-sm text-neutral-500">Tổng doanh số</Text>
                <Text className="text-body-md font-black text-success">
                  {recoResult.totalRevenue.toLocaleString('vi-VN')}đ
                </Text>
              </View>
              <View className="flex-row justify-between border-b border-teal-100 py-1">
                <Text className="text-body-sm text-neutral-500">Tỷ lệ hoa hồng</Text>
                <Text className="text-body-md font-bold text-primary">
                  {(recoResult.commissionRate * 100).toFixed(1)}%
                </Text>
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="text-body-sm text-neutral-500">Hoa hồng</Text>
                <Text className="text-title-md font-black text-primary">
                  {recoResult.commissionAmount.toLocaleString('vi-VN')}đ
                </Text>
              </View>
            </View>
          )}
        </View>
      </Container>

      {/* 7. Query Entities (CTV / Đối Tác / Nhân Viên) */}
      <Container className="mb-6 border border-sky-600/20 bg-sky-600/5 p-4">
        <Text className="text-title-md mb-1 font-black uppercase tracking-wider text-sky-700">
          🔍 Truy Vấn Danh Sách Thực Thể (CTV / Đối Tác / Nhân Viên)
        </Text>
        <Text className="mb-4 text-body-xs text-muted">
          Chọn các tham số lọc bằng cách click vào các pill bên dưới trước khi gọi API (không cần
          nhập tay).
        </Text>

        <View className="gap-6">
          {/* Section A: Hướng Dẫn Viên / Cộng Tác Viên (Affiliates) */}
          <View className="rounded-xl border border-sky-200 bg-white p-4">
            <Text className="text-sky-850 mb-3 text-body-md font-bold">
              👥 1. Danh sách Cộng Tác Viên (Affiliates)
            </Text>

            {/* Trạng thái (isActive) */}
            <Text className="mb-1.5 text-body-xs font-bold text-neutral-500">
              Trạng thái (isActive):
            </Text>
            <View className="mb-3 flex-row flex-wrap">
              {renderPill('Tất cả', ctvIsActive === undefined, () => setCtvIsActive(undefined))}
              {renderPill('Đang hoạt động', ctvIsActive === true, () => setCtvIsActive(true))}
              {renderPill('Ngưng hoạt động', ctvIsActive === false, () => setCtvIsActive(false))}
            </View>

            {/* Có giao dịch (hasTransaction) */}
            <Text className="mb-1.5 text-body-xs font-bold text-neutral-500">
              Có giao dịch (hasTransaction):
            </Text>
            <View className="mb-3 flex-row flex-wrap">
              {renderPill('Tất cả', ctvHasTransaction === undefined, () =>
                setCtvHasTransaction(undefined),
              )}
              {renderPill('Có giao dịch', ctvHasTransaction === true, () =>
                setCtvHasTransaction(true),
              )}
              {renderPill('Không giao dịch', ctvHasTransaction === false, () =>
                setCtvHasTransaction(false),
              )}
            </View>

            {/* Giới hạn (limit) */}
            <Text className="mb-1.5 text-body-xs font-bold text-neutral-500">
              Giới hạn số lượng (limit):
            </Text>
            <View className="mb-4 flex-row flex-wrap">
              {renderPill('10', ctvLimit === 10, () => setCtvLimit(10))}
              {renderPill('25', ctvLimit === 25, () => setCtvLimit(25))}
              {renderPill('50', ctvLimit === 50, () => setCtvLimit(50))}
              {renderPill('100', ctvLimit === 100, () => setCtvLimit(100))}
            </View>

            <Button
              label="Gọi API lấy danh sách CTV"
              className="bg-sky-600"
              loading={isEntityLoading && entityModalTitle.includes('Cộng tác viên')}
              onPress={handleQueryCTV}
            />
          </View>

          {/* Section B: Đối Tác / Đối tác (Partners) */}
          <View className="rounded-xl border border-violet-200 bg-white p-4">
            <Text className="text-violet-850 mb-3 text-body-md font-bold">
              🏢 2. Danh sách Đối Tác (Partners)
            </Text>

            {/* Trạng thái (isActive) */}
            <Text className="mb-1.5 text-body-xs font-bold text-neutral-500">
              Trạng thái (isActive):
            </Text>
            <View className="mb-3 flex-row flex-wrap">
              {renderPill('Tất cả', partnerIsActive === undefined, () =>
                setPartnerIsActive(undefined),
              )}
              {renderPill('Đang hoạt động', partnerIsActive === true, () =>
                setPartnerIsActive(true),
              )}
              {renderPill('Ngưng hoạt động', partnerIsActive === false, () =>
                setPartnerIsActive(false),
              )}
            </View>

            {/* Có giao dịch (hasTransaction) */}
            <Text className="mb-1.5 text-body-xs font-bold text-neutral-500">
              Có giao dịch (hasTransaction):
            </Text>
            <View className="mb-3 flex-row flex-wrap">
              {renderPill('Tất cả', partnerHasTransaction === undefined, () =>
                setPartnerHasTransaction(undefined),
              )}
              {renderPill('Có giao dịch', partnerHasTransaction === true, () =>
                setPartnerHasTransaction(true),
              )}
              {renderPill('Không giao dịch', partnerHasTransaction === false, () =>
                setPartnerHasTransaction(false),
              )}
            </View>

            {/* Giới hạn (limit) */}
            <Text className="mb-1.5 text-body-xs font-bold text-neutral-500">
              Giới hạn số lượng (limit):
            </Text>
            <View className="mb-4 flex-row flex-wrap">
              {renderPill('10', partnerLimit === 10, () => setPartnerLimit(10))}
              {renderPill('25', partnerLimit === 25, () => setPartnerLimit(25))}
              {renderPill('50', partnerLimit === 50, () => setPartnerLimit(50))}
              {renderPill('100', partnerLimit === 100, () => setPartnerLimit(100))}
            </View>

            <Button
              label="Gọi API lấy danh sách Đối Tác"
              className="bg-violet-600"
              loading={isEntityLoading && entityModalTitle.includes('Đối tác')}
              onPress={handleQueryPartners}
            />
          </View>

          {/* Section C: Nhân Viên (Employees) */}
          <View className="rounded-xl border border-emerald-200 bg-white p-4">
            <Text className="text-emerald-850 mb-3 text-body-md font-bold">
              👤 3. Danh sách Nhân Viên (Employees)
            </Text>

            {/* Chế độ lọc ca */}
            <Text className="mb-1.5 text-body-xs font-bold text-neutral-500">
              Bộ lọc theo ca làm việc:
            </Text>
            <View className="mb-3 flex-row flex-wrap">
              {renderPill('Tất cả (Không ca)', empMode === 'all', () => {
                setEmpMode('all')
                setEmpShiftId(undefined)
              })}
              {renderPill('Lọc theo Ca làm việc (Có ca)', empMode === 'shift', () => {
                setEmpMode('shift')
              })}
            </View>

            {/* Chọn ca làm việc (Chỉ khi empMode === 'shift') */}
            {empMode === 'shift' && (
              <View className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-body-xs font-bold text-neutral-600">
                    Chọn Ca làm việc (Chọn chứ không nhập tay):
                  </Text>
                  <Pressable
                    onPress={fetchShifts}
                    className="rounded border border-neutral-300 bg-neutral-200 px-2 py-1"
                  >
                    <Text className="text-[10px] font-bold text-neutral-700">Tải lại ca 🔄</Text>
                  </Pressable>
                </View>

                {isShiftsLoading ? (
                  <Text className="py-2 text-xs italic text-neutral-500">
                    Đang tải danh sách ca...
                  </Text>
                ) : shifts.length === 0 ? (
                  <Text className="text-danger py-2 text-xs italic">Không tìm thấy ca nào</Text>
                ) : (
                  <ScrollView
                    style={{ maxHeight: 150 }}
                    nestedScrollEnabled
                    className="border-t border-neutral-200 pt-2"
                  >
                    {shifts.map((s: any) => {
                      const isSelected = empShiftId === s.id
                      const dateStr = s.openedAt
                        ? new Date(s.openedAt).toLocaleTimeString('vi-VN')
                        : 'N/A'
                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => setEmpShiftId(s.id)}
                          className={`mb-1.5 flex-row items-center justify-between rounded-lg border p-2 ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-neutral-200 bg-white'
                          }`}
                        >
                          <View className="flex-1 pr-2">
                            <Text
                              className={`text-xs font-bold ${isSelected ? 'text-emerald-700' : 'text-neutral-800'}`}
                            >
                              Mã ca: {s.code || s.id.slice(0, 8)}
                            </Text>
                            <Text className="text-[10px] text-neutral-500">
                              Mở lúc: {dateStr} | NV:{' '}
                              {s.cashierUserId ? s.cashierUserId.slice(0, 8) : 'N/A'}
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-1.5">
                            <View
                              className={`h-2 w-2 rounded-full ${
                                s.state === 'OPEN' ? 'bg-green-500' : 'bg-neutral-400'
                              }`}
                            />
                            <Text className="text-[10px] font-bold uppercase text-neutral-500">
                              {s.state}
                            </Text>
                          </View>
                        </Pressable>
                      )
                    })}
                  </ScrollView>
                )}
              </View>
            )}
            {/* Lọc theo isPos */}
            <Text className="mb-1.5 text-body-xs font-bold text-neutral-500">
              Chỉ nhân viên POS (isPos):
            </Text>
            <View className="mb-3 flex-row flex-wrap">
              {renderPill('Tất cả', empIsPos === undefined, () => setEmpIsPos(undefined))}
              {renderPill('Chỉ POS (isPos = true)', empIsPos === true, () => setEmpIsPos(true))}
              {renderPill('Không phải POS (isPos = false)', empIsPos === false, () =>
                setEmpIsPos(false),
              )}
            </View>

            {/* Lọc theo status */}
            <Text className="mb-1.5 text-body-xs font-bold text-neutral-500">
              Trạng thái hoạt động (status):
            </Text>
            <View className="mb-3 flex-row flex-wrap">
              {renderPill('Tất cả', empStatus === undefined, () => setEmpStatus(undefined))}
              {renderPill('Hoạt động (active)', empStatus === 'active', () =>
                setEmpStatus('active'),
              )}
              {renderPill('Ngưng hoạt động (inactive)', empStatus === 'inactive', () =>
                setEmpStatus('inactive'),
              )}
            </View>

            {/* Lọc theo hasTransaction */}
            <Text className="mb-1.5 text-body-xs font-bold text-neutral-500">
              Có giao dịch (hasTransaction):
            </Text>
            <View className="mb-4 flex-row flex-wrap">
              {renderPill('Tất cả', empHasTransaction === undefined, () =>
                setEmpHasTransaction(undefined),
              )}
              {renderPill('Có giao dịch (true)', empHasTransaction === true, () =>
                setEmpHasTransaction(true),
              )}
              {renderPill('Không giao dịch (false)', empHasTransaction === false, () =>
                setEmpHasTransaction(false),
              )}
            </View>

            <Button
              label="Gọi API lấy danh sách Nhân Viên"
              className="bg-emerald-600"
              loading={isEntityLoading && entityModalTitle.includes('Nhân viên')}
              onPress={handleQueryEmployees}
            />
          </View>
        </View>
      </Container>

      <ModalBase
        visible={isSyncResultVisible}
        onClose={() => setIsSyncResultVisible(false)}
        size="90%"
      >
        <View className="flex-1 p-5">
          {/* Header */}
          <View className="mb-3 flex-row items-center justify-between border-b border-neutral-200 pb-3">
            <Text className="font-bevn-bold text-lg font-bold text-neutral-800">
              Kết quả API fetchChanges
            </Text>
            <Button
              label="Đóng"
              variant="outline"
              className="h-[32px] min-h-[32px] border-neutral-300 px-3 py-1"
              textClassName="text-xs text-neutral-600"
              onPress={() => setIsSyncResultVisible(false)}
            />
          </View>

          {/* Quick Metrics */}
          {syncResult && (
            <View className="mb-3 flex-row justify-between rounded-lg bg-neutral-100 p-3">
              <Text className="font-bevn-med text-xs text-neutral-600">
                Created:{' '}
                <Text className="font-bevn-bold font-bold text-success">
                  {syncResult.products?.created?.length ?? 0}
                </Text>
              </Text>
              <Text className="font-bevn-med text-xs text-neutral-600">
                Updated:{' '}
                <Text className="font-bevn-bold font-bold text-warning">
                  {syncResult.products?.updated?.length ?? 0}
                </Text>
              </Text>
              <Text className="font-bevn-med text-xs text-neutral-600">
                Deleted:{' '}
                <Text className="font-bevn-bold text-danger font-bold">
                  {syncResult.products?.deleted?.length ?? 0}
                </Text>
              </Text>
              <Text className="font-bevn-med text-xs text-neutral-600">
                Synced At:{' '}
                <Text className="font-bevn-bold font-bold text-primary">
                  {syncResult.syncedAt ? new Date(syncResult.syncedAt).toLocaleTimeString() : 'N/A'}
                </Text>
              </Text>
            </View>
          )}

          {/* Code Viewer Container */}
          <View className="flex-1 overflow-hidden rounded-xl bg-slate-900">
            <ScrollView className="flex-1 p-4">
              <Text className="select-all text-xs text-sky-400" style={{ fontFamily: 'monospace' }}>
                {syncResult ? JSON.stringify(syncResult, null, 2) : 'Không có dữ liệu'}
              </Text>
            </ScrollView>
          </View>
        </View>
      </ModalBase>
      <ModalBase
        visible={isEntityModalVisible}
        onClose={() => setIsEntityModalVisible(false)}
        size="90%"
      >
        <View className="flex-1 rounded-[32px] bg-white p-5">
          {/* Header */}
          <View className="mb-3 flex-row items-center justify-between border-b border-neutral-200 pb-3">
            <View className="flex-row items-center gap-2">
              <Text className="font-bevn-bold text-lg font-bold text-neutral-800">
                {entityModalTitle}
              </Text>
              {isEntityLoading && (
                <Text className="animate-pulse text-xs font-medium italic text-primary">
                  (Đang tải...)
                </Text>
              )}
            </View>
            <View className="flex-row items-center gap-2">
              <Button
                label="Sao chép JSON 📋"
                variant="outline"
                className="h-[32px] min-h-[32px] border-sky-500 bg-sky-50 px-3 py-1"
                textClassName="text-xs text-sky-700 font-bold"
                onPress={() => {
                  if (entityModalData) {
                    Clipboard.setString(JSON.stringify(entityModalData, null, 2))
                    toast.success('Đã sao chép vào bộ nhớ tạm!')
                  } else {
                    toast.warning('Không có dữ liệu để sao chép.')
                  }
                }}
              />
              <Button
                label="Đóng"
                variant="outline"
                className="h-[32px] min-h-[32px] border-neutral-300 px-3 py-1"
                textClassName="text-xs text-neutral-600 font-bold"
                onPress={() => setIsEntityModalVisible(false)}
              />
            </View>
          </View>

          {/* Code Viewer Container - Nền trắng chữ đen */}
          <View className="flex-1 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
            <ScrollView className="flex-1 p-4">
              <Text
                className="select-all text-xs text-neutral-900"
                style={{ fontFamily: 'monospace' }}
              >
                {entityModalData
                  ? JSON.stringify(entityModalData, null, 2)
                  : 'Đang tải hoặc không có dữ liệu...'}
              </Text>
            </ScrollView>
          </View>
        </View>
      </ModalBase>

      {apiZReportData && (
        <View style={{ position: 'absolute', left: -2000, top: 0 }}>
          <View collapsable={false} ref={apiZReportPrintRef}>
            <CloseShiftReceiptTemplate data={mapZReportToReceiptData(apiZReportData)} />
          </View>
        </View>
      )}

      <ReconciliationModal ref={devReconciliationModalRef} />
    </ScrollView>
  )
}

const mapZReportToReceiptData = (zReport: any): CloseShiftReceiptData => {
  const session = zReport?.session || {}
  const paymentBreakdown = zReport?.paymentBreakdown || []

  const grandCash = paymentBreakdown.find((p: any) => p.method === 'cash')?.amount || 0
  const grandQr = paymentBreakdown.find((p: any) => p.method === 'qr_bidv')?.amount || 0
  const grandCard = paymentBreakdown.find((p: any) => p.method === 'card_bidv')?.amount || 0
  const grandDebt =
    paymentBreakdown.find((p: any) => p.method === 'cong_no' || p.method === 'debt')?.amount || 0
  const grandTotal = grandCash + grandQr + grandCard + grandDebt

  const staffSummaries = (zReport?.staffs || []).map((s: any) => ({
    staffName: s.staffName || '',
    staffCode: s.staffCode || '',
    orderCount: s.orderCount || 0,
    cashAmount: s.cashAmount || 0,
    qrAmount: s.qrAmount || 0,
    cardAmount: s.cardAmount || 0,
    debtAmount: s.debtAmount || 0,
    totalRevenue: s.totalRevenue || 0,
  }))

  return {
    shiftCode: session.code || '',
    shiftTime: '---',
    openedAt: session.openedAt || new Date().toISOString(),
    closedAt: session.closedAt || new Date().toISOString(),
    posDeviceName: zReport?.posDeviceName || 'Máy POS',
    totalOrders: zReport?.orderCount || 0,
    staffSummaries,
    grandCash,
    grandQr,
    grandCard,
    grandDebt,
    grandTotal,
  }
}
