import { ViceService } from '@/screens/vice-service'
import { Container, ModalBase } from '@/shared/components/ui'
import { Button } from '@/shared/components/ui/button'
import { ProductRemoteAPI } from '@/shared/features/product/api/remote/product.remote.api'
import { useAppStore } from '@/shared/features/app'
import { AuthAPI } from '@/shared/features/auth'
import mockCategories from '@/shared/features/category/api/remote/mock-categories.json'
import { useNoteStore } from '@/shared/features/note'
import { BitexcoReceiptTemplate } from '@/shared/features/order/components/bitexco-receipt-template'
import { RefundReceiptTemplate } from '@/shared/features/order/components/refund-receipt-template'
import mockProducts from '@/shared/features/product/api/remote/mock-products.json'
import { AxiosService } from '@/shared/lib/axios/axios.service'
import { database } from '@/shared/lib/database'
import CategoryModel from '@/shared/lib/database/models/category'
import ProductModel from '@/shared/lib/database/models/product'
import OrderModel from '@/shared/lib/database/models/order'
import { OrderRemoteAPI } from '@/shared/features/order/api/remote/order.remote.api'
import { storage } from '@/shared/lib/storage'
import { toast } from '@/shared/store'
import React, { useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

export default function DevControlScreen() {
  const [categories, setCategories] = useState<CategoryModel[]>([])
  const [products, setProducts] = useState<ProductModel[]>([])
  const [syncResult, setSyncResult] = useState<any>(null)
  const [isSyncResultVisible, setIsSyncResultVisible] = useState(false)
  const [isFetchingChanges, setIsFetchingChanges] = useState(false)

  const loadData = async () => {
    try {
      const cats = await database.collections.get<CategoryModel>('categories').query().fetch()
      const prods = await database.collections.get<ProductModel>('products').query().fetch()
      setCategories(cats)
      setProducts(prods)
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSeedData = async () => {
    try {
      await database.write(async () => {
        // Clear existing first
        const allProds = await database.collections.get<ProductModel>('products').query().fetch()
        const allCats = await database.collections.get<CategoryModel>('categories').query().fetch()

        for (const p of allProds) await p.destroyPermanently()
        for (const c of allCats) await c.destroyPermanently()

        // Seed Categories
        for (const cat of mockCategories) {
          await database.collections.get<CategoryModel>('categories').create((record: any) => {
            record._raw.id = cat.id
            record.name = cat.name
            record.color = cat.color
            record.displayOrder = cat.display_order
            record.isDeleted = cat.is_deleted
          })
        }

        // Seed Products
        for (const prod of mockProducts) {
          await database.collections.get<ProductModel>('products').create((record: any) => {
            record._raw.id = prod.id
            record.sku = prod.sku
            record.barcode = prod.barcodes?.[0] || prod.sku
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
      toast.success('Đã nạp dữ liệu Mock vào Local DB!', 'Thành công')
      loadData()
    } catch (error) {
      console.error('Seeding error:', error)
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
            const allCats = await database.collections
              .get<CategoryModel>('categories')
              .query()
              .fetch()
            for (const p of allProds) await p.destroyPermanently()
            for (const c of allCats) await c.destroyPermanently()
          })
          toast.success('Đã xóa sạch DB!', 'Thành công')
          loadData()
        } catch (e) {
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
      const response = await AxiosService.getInstance().post('/v1/pos-devices/activate', {
        deviceCode: 'TEST 1',
        activationToken: '500107', // Sửa lại token nếu admin cấp token khác
      })
      console.log('✅ Activate Device Success:', JSON.stringify(response.data))
      toast.success('Kích hoạt thành công! Xem log console.')
    } catch (error: any) {
      const errData = error.response?.data
      console.error('❌ Activate Device Error:', errData || error.message)
      toast.error('Lỗi: ' + (errData?.detail || errData?.message || error.message))
    }
  }

  const handleTestGetPaymentMethods = async () => {
    try {
      toast.info('Đang gọi API lấy Payment Methods...')
      const response = await AxiosService.getInstance().get<any[]>('/v1/payment-methods')
      console.log('✅ Get Payment Methods Success:', JSON.stringify(response.data, null, 2))

      const enabledMethods = response.data.filter((m) => m.enabled)
      const appService = useAppStore.getState().appService
      if (appService) {
        appService.send({ type: 'PAYMENT_METHODS_UPDATED', paymentMethods: enabledMethods })
        toast.success(
          `Đã cập nhật ${enabledMethods.length} phương thức khả dụng vào Machine! Xem console.`,
        )
      } else {
        toast.warning('Lấy thành công nhưng App Service chưa sẵn sàng.')
      }
    } catch (error: any) {
      const errData = error.response?.data
      console.error('❌ Get Payment Methods Error:', errData || error.message)
      toast.error('Lỗi: ' + (errData?.detail || errData?.message || error.message))
    }
  }

  const handleTestGetDeviceContext = async () => {
    try {
      toast.info('Đang gọi GET /v1/pos/device-context...')
      const result = await AuthAPI.getDeviceContext()
      console.log('✅ Device Context:', JSON.stringify(result, null, 2))
      toast.success(
        `isActive: ${result.isActive ? '✅ TRUE' : '❌ FALSE'}\ndeviceCode: ${result.deviceCode}\nwarehouseId: ${result.warehouseId ?? 'null'}`,
        'Device Context',
      )
    } catch (error: any) {
      const status = error?.response?.status
      const errData = error?.response?.data
      console.error('❌ Device Context Error:', errData || error.message)
      toast.error(
        `${status ?? 'Network error'} — ${errData?.message || errData?.error || error.message}`,
        'Device Context Lỗi',
      )
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
        const remoteOrdersRes = await OrderRemoteAPI.getOrders({ limit: 5 })
        if (remoteOrdersRes.success && remoteOrdersRes.data && remoteOrdersRes.data.length > 0) {
          orderId = remoteOrdersRes.data[0].id
        }
      }

      if (!orderId) {
        toast.warning('Không tìm thấy đơn hàng nào trong local DB hoặc server để test.')
        return
      }

      toast.info(`Đang tra cứu đơn hàng code/id: ${orderId}`)
      const response = await OrderRemoteAPI.lookupOrder(orderId)
      console.log('✅ Order Lookup Success:', JSON.stringify(response, null, 2))
      toast.success('Tra cứu thành công! Xem console log.', 'Order Lookup')
    } catch (error: any) {
      const errData = error.response?.data
      console.error('❌ Order Lookup Error:', errData || error.message)
      toast.error('Lỗi: ' + (errData?.detail || errData?.message || error.message), 'Order Lookup')
    }
  }

  const handleTestFetchChanges = async () => {
    try {
      setIsFetchingChanges(true)
      if (!ProductRemoteAPI.fetchChanges) {
        throw new Error('fetchChanges is not implemented')
      }
      const result = await ProductRemoteAPI.fetchChanges({ lastPulledAt: null })
      setSyncResult(result)
      setIsSyncResultVisible(true)
      toast.success('Lấy danh sách thay đổi sản phẩm thành công!')
    } catch (error: any) {
      console.error('❌ Fetch Changes Error:', error)
      const errMsg = error?.response?.data?.message || error.message || 'Lỗi không xác định'
      toast.error('Lỗi: ' + errMsg)
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
      console.log('[TokenLab] Old refreshToken:', currentRefreshToken.slice(0, 20) + '...')
      const result = await AuthAPI.refresh(currentRefreshToken)
      // Lưu token mới vào MMKV (giống logic trong refreshAuthFlow)
      storage.set('auth-refresh-token', result.refreshToken)
      console.log('[TokenLab] New accessToken:', result.accessToken.slice(0, 40) + '...')
      console.log('[TokenLab] New refreshToken:', result.refreshToken.slice(0, 20) + '...')
      toast.success(
        `Rotation OK!\nNew accessToken: ${result.accessToken.slice(0, 20)}...\nNew refreshToken: ${result.refreshToken.slice(0, 12)}...`,
        'Refresh thành công',
      )
    } catch (err: any) {
      const status = err?.response?.status
      const msg = err?.response?.data?.error || err?.message || 'Lỗi không xác định'
      console.error('[TokenLab] Refresh failed:', err?.response?.data || err)
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
    const ctx = useAppStore.getState().appService?.getSnapshot().context
    const refreshToken = storage.getString('auth-refresh-token')
    console.log('======== TOKEN STATE ========')
    console.log(
      'accessToken (memory):',
      ctx?.accessToken ? ctx.accessToken.slice(0, 40) + '...' : 'null',
    )
    console.log('refreshToken (MMKV):', refreshToken ? refreshToken.slice(0, 20) + '...' : 'null')
    console.log('employee:', ctx?.employee?.displayName ?? 'null')
    console.log('machineState:', useAppStore.getState().appService?.getSnapshot().value ?? 'n/a')
    console.log('==============================')
    toast.info('Đã log token state ra console. Mở Metro / Logcat để xem.', 'Token State')
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

  return (
    <ScrollView className="flex-1 bg-surface-200 p-6">
      <Text className="mb-6 text-headline-md font-bold text-primary">Dev Control Panel</Text>
      {/* 1.5. Toast & Alert Testing */}
      <Container className="mb-6 p-4">
        <Text className="text-title-md mb-3 font-bold text-surface-on">Test Alert & Toast</Text>
        <View className="flex-row flex-wrap gap-3">
          <Button
            label="Toast Success"
            className="bg-green-500"
            onPress={() => toast.success('Giao dịch đã được thực hiện thành công!', 'Thành công')}
          />
          <Button
            label="Toast Error"
            className="bg-red-500"
            onPress={() => toast.error('Có lỗi xảy ra khi kết nối máy chủ.', 'Lỗi kết nối')}
          />
          <Button
            label="Toast Warning"
            className="bg-orange-500"
            onPress={() => toast.warning('Số lượng hàng trong kho sắp hết.', 'Cảnh báo')}
          />
          <Button
            label="Toast Info"
            className="bg-blue-500"
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
                onCancel: () => console.log('Hủy in'),
              })
            }
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

          {/* Row 4: Force logout */}
          <Button
            label="Force LOGOUT (dispatch LOGGED_OUT)"
            variant="outline"
            className="border-error"
            textClassName="text-error text-xs font-bold"
            onPress={handleForceLogout}
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
            label="Test API: Đồng bộ sản phẩm (fetchChanges)"
            className="bg-orange-600"
            loading={isFetchingChanges}
            onPress={handleTestFetchChanges}
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
        <View className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-xl">
          <BitexcoReceiptTemplate
            order={
              {
                id: 'ORD-MOCK-2026',
                createdAt: new Date(),
                total: 171000,
                subtotal: 171000,
                discount: 0,
                totalTax: 15545,
                itemsSnapshot: [
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
                ],
                paymentsSnapshot: [
                  {
                    method: 'CARD',
                    amount: 171000,
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
      </View>

      {/* 4. Refund Receipt Preview */}
      <Text className="text-headline-sm mb-4 font-bold text-primary">Refund Receipt Preview</Text>
      <View className="mb-12 items-center justify-center rounded-[32px] bg-surface-100 py-10 shadow-sm">
        <View className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-xl">
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
          Mẫu phiếu trả hàng thực tế (Width: 384px)
        </Text>
      </View>

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
    </ScrollView>
  )
}
