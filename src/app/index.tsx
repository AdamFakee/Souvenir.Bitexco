import type { ActionSheetRef, PopupRef } from '@/shared/components/ui'
import {
  ActionSheet,
  AppHeader,
  Button,
  Container,
  EmptyState,
  FullScreenLoading,
  GlobalPopup,
  IconButton,
  Input,
  LoadingIndicator,
  OptionCard,
  Placeholder,
  Popup,
} from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { database } from '@/shared/lib'
import { toast } from '@/shared/store'
import { useRouter } from 'expo-router'
import {
  Barcode,
  Bell,
  Hash,
  Home,
  Image as ImageIcon,
  MonitorCheck,
  Printer,
  QrCode,
  Search,
  ShoppingCart,
  Star,
  Trash2,
  User,
} from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'
import IminViceScreen from '../../modules/imin-vice-screen'

export default function Index() {
  const router = useRouter()
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [actionSheetInput, setActionSheetInput] = useState('')

  const actionSheetRef = useRef<ActionSheetRef>(null)
  const popupRef = useRef<PopupRef>(null)
  const [popupConfig, setPopupConfig] = useState<{
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    description: string
  }>({
    type: 'info',
    title: '',
    description: '',
  })
  const [popupAnimation, setPopupAnimation] = useState<'fade' | 'zoom' | 'diagonal'>('fade')
  const [isFullScreenLoading, setIsFullScreenLoading] = useState(false)
  const [staffCount, setStaffCount] = useState(0)
  const [latestStaff, setLatestStaff] = useState('None')

  const handleCreate = async () => {
    try {
      await database.write(async () => {
        // 1. Create Staff
        const staff = await database.get('staff').create((s: any) => {
          s.username = `nv_${Date.now()}`
          s.fullname = `Thu ngân ${Date.now()}`
          s.role = 'CASHIER'
          s.pinHash = '1111'
          s.isActive = true
          s.isDeleted = false
        })

        // 2. Create Shift
        const shift = await database.get('shifts').create((sh: any) => {
          sh.staffId = staff.id
          sh.deviceId = 'POS_01'
          sh.startTime = Date.now()
          sh.startingCash = 1000000
          sh.expectedEndingCash = 1000000
          sh.status = 'OPEN'
          sh.isDeleted = false
        })

        // 3. Create Category
        const category = await database.get('categories').create((c: any) => {
          c.name = `Đồ lưu niệm ${Date.now()}`
          c.color = '#FF5733'
          c.displayOrder = 1
          c.isDeleted = false
        })

        // 4. Create Product
        const product = await database.get('products').create((p: any) => {
          p.categoryId = category.id
          p.sku = `SP${Date.now()}`
          p.name = `Móc khóa Bitexco ${Date.now()}`
          p.price = 50000
          p.costPrice = 20000
          p.stock = 100
          p.isActive = true
          p.isDeleted = false
        })

        // 5. Create Order
        const order = await database.get('orders').create((o: any) => {
          o.shiftId = shift.id
          o.staffId = staff.id
          o.status = 'COMPLETED'
          o.subtotal = 50000
          o.discount = 0
          o.voucherDiscount = 0
          o.total = 50000
          o.itemsSnapshot = [
            {
              productId: product.id,
              sku: 'SKU_1',
              name: 'Product 1',
              price: 50000,
              quantity: 1,
              subtotal: 50000,
            },
          ]
          o.paymentsSnapshot = [
            {
              method: 'CASH',
              amount: 50000,
            },
          ]
          o.customerTaxInfo = {
            companyName: 'Bitexco Group',
            taxCode: '0123456789',
            email: 'tax@bitexco.com',
          }
          o.isDeleted = false
        })

        // 6. Create Order Item
        await database.get('order_items').create((oi: any) => {
          oi.orderId = order.id
          oi.productId = product.id
          oi.productNameSnapshot = 'xx'
          oi.priceSnapshot = 50000
          oi.quantity = 1
          oi.refundedQuantity = 0
          oi.subtotal = 50000
          oi.isDeleted = false
        })

        // 7. Create Payment
        await database.get('payments').create((pay: any) => {
          pay.orderId = order.id
          pay.method = 'CASH'
          pay.amount = 50000
          pay.cashTendered = 100000
          pay.cashChange = 50000
          pay.isDeleted = false
        })

        Alert.alert('Success', `Created linked data for 7 tables!`)
      })
      await handleRead()
    } catch (error) {
      console.log(error)
      Alert.alert('Error', String(error))
    }
  }

  const handleRead = async () => {
    try {
      const staffList = await database.get('staff').query().fetch()
      const shifts = await database.get('shifts').query().fetch()
      const categories = await database.get('categories').query().fetch()
      const products = await database.get('products').query().fetch()
      const orders = await database.get('orders').query().fetch()
      const orderItems = await database.get('order_items').query().fetch()
      const payments = await database.get('payments').query().fetch()

      let summary = `Totals: `
      summary += `Staff(${staffList.length}) `
      summary += `Shifts(${shifts.length}) `
      summary += `Cats(${categories.length}) `
      summary += `Prods(${products.length}) `
      summary += `Orders(${orders.length}) `
      summary += `Items(${orderItems.length}) `
      summary += `Pays(${payments.length})\n`

      if (staffList.length > 0) {
        const lastS = staffList[staffList.length - 1] as any
        summary += `Latest Staff: ${lastS.fullname} (${lastS.role})\n`
      }
      if (orders.length > 0) {
        const lastO = orders[orders.length - 1] as any
        summary += `Latest Order: Total ${lastO.total}đ - Status: ${lastO.status}`
      }

      setLatestStaff(summary)
      setStaffCount(staffList.length)
    } catch (error) {
      Alert.alert('Error', String(error))
    }
  }

  const handleUpdate = async () => {
    try {
      const staffList = await database.get('staff').query().fetch()
      const shifts = await database.get('shifts').query().fetch()
      const categories = await database.get('categories').query().fetch()
      const products = await database.get('products').query().fetch()
      const orders = await database.get('orders').query().fetch()
      const orderItems = await database.get('order_items').query().fetch()
      const payments = await database.get('payments').query().fetch()

      if (staffList.length === 0) {
        Alert.alert('Warning', 'No data to update')
        return
      }

      await database.write(async () => {
        if (staffList.length > 0)
          await staffList[staffList.length - 1].update(
            (s: any) => (s.fullname = `Updated Thu Ngân ${Date.now()}`),
          )
        if (shifts.length > 0)
          await shifts[shifts.length - 1].update((sh: any) => (sh.actualEndingCash = 1050000))
        if (categories.length > 0)
          await categories[categories.length - 1].update(
            (c: any) => (c.name = `Updated Cat ${Date.now()}`),
          )
        if (products.length > 0)
          await products[products.length - 1].update((p: any) => (p.price = 55000))
        if (orders.length > 0) await orders[orders.length - 1].update((o: any) => (o.total = 55000))
        if (orderItems.length > 0)
          await orderItems[orderItems.length - 1].update((oi: any) => (oi.priceSnapshot = 55000))
        if (payments.length > 0)
          await payments[payments.length - 1].update((pay: any) => (pay.amount = 55000))
      })

      Alert.alert('Success', 'Updated last records of all 7 tables!')
      await handleRead()
    } catch (error) {
      Alert.alert('Error', String(error))
    }
  }

  const handleDelete = async () => {
    try {
      const staffList = await database.get('staff').query().fetch()
      const shifts = await database.get('shifts').query().fetch()
      const categories = await database.get('categories').query().fetch()
      const products = await database.get('products').query().fetch()
      const orders = await database.get('orders').query().fetch()
      const orderItems = await database.get('order_items').query().fetch()
      const payments = await database.get('payments').query().fetch()

      if (staffList.length === 0 && orders.length === 0) {
        Alert.alert('Warning', 'No data to delete')
        return
      }

      await database.write(async () => {
        for (const item of staffList) await item.destroyPermanently()
        for (const item of shifts) await item.destroyPermanently()
        for (const item of categories) await item.destroyPermanently()
        for (const item of products) await item.destroyPermanently()
        for (const item of orders) await item.destroyPermanently()
        for (const item of orderItems) await item.destroyPermanently()
        for (const item of payments) await item.destroyPermanently()
      })

      Alert.alert('Success', 'Deleted ALL records from all 7 tables!')
      await handleRead()
    } catch (error) {
      Alert.alert('Error', String(error))
    }
  }
  useEffect(() => {
    const startSecondaryScreen = async () => {
      // 1. Kiểm tra máy có hỗ trợ không
      const isSupport = IminViceScreen.isSupportDoubleScreen()

      // 2. Kiểm tra/Xin quyền Overlay
      const hasPermission = IminViceScreen.checkOverlayPermission()
      if (!hasPermission) {
        IminViceScreen.requestOverlayPermission()
        return
      }

      if (isSupport) {
        // 3. KÍCH HOẠT: Đây là lúc "phép màu" xảy ra
        // 'ViceScreen' phải khớp với tên bạn đăng ký ở AppRegistry
        console.log('Open vice screen')
        IminViceScreen.open('ViceScreen')
      }
    }

    startSecondaryScreen()
  }, [])

  const sendCartData = () => {
    const mockItems = [
      { id: '1', name: 'Cà phê sữa đá', price: 2.5, quantity: 2 },
      { id: '2', name: 'Bánh mì thịt', price: 1.5, quantity: 1 },
    ]
    const total = mockItems.reduce((acc, item) => acc + item.price * item.quantity, 0)

    IminViceScreen.sendMsgToViceScreen('updateCart', {
      items: mockItems,
      total: total,
    })
    Alert.alert('Success', 'Cart data sent to vice screen')
  }

  const clearCart = () => {
    IminViceScreen.sendMsgToViceScreen('updateCart', {
      items: [],
      total: 0,
    })
    IminViceScreen.sendMsgToViceScreen('setOrderId', {
      orderId: '',
    })
    IminViceScreen.sendMsgToViceScreen('setCustomer', {
      name: '',
    })
  }

  const sendOrderId = () => {
    IminViceScreen.sendMsgToViceScreen('setOrderId', {
      orderId: 'TƯV62013569A',
    })
    Alert.alert('Success', 'Order ID TƯV62013569A sent')
  }

  const showPaymentQR = () => {
    IminViceScreen.sendMsgToViceScreen('showPayment', {
      qrCodeUrl:
        'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=PAYMENT_FOR_TUV62013569A',
    })
    Alert.alert('Success', 'Payment QR sent')
  }

  const showPhotographyPromo = () => {
    IminViceScreen.sendMsgToViceScreen('showPromo', {
      imageUrl:
        'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1000&auto=format&fit=crop',
    })
    Alert.alert('Success', 'Photography promo sent')
  }

  const openSecondScreen = () => IminViceScreen.open('SecondViceScreen')
  const openFirstScreen = () => IminViceScreen.open('ViceScreen')

  const sendCustomerData = () => {
    IminViceScreen.sendMsgToViceScreen('setCustomer', {
      name: 'Anh Bùi',
    })
    Alert.alert('Success', 'Customer name sent to vice screen')
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View className="mb-6">
      <Text className="mb-3 text-title-sm font-semibold text-primary">{title}</Text>
      {children}
    </View>
  )

  return (
    <View className="flex-1 bg-background">
      <AppHeader
        title="Hardware & UI Demo"
        variant="gradient"
        rightIcon={Bell}
        showLeftButton={false}
      />

      <ScrollView className="flex-1 px-md py-md" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ---------- WATERMELONDB CRUD TEST ---------- */}
        <Section title="WatermelonDB CRUD Test">
          <Container className="mb-3 p-4">
            <Text className="text-on-surface text-body-sm font-semibold">
              Staff Count: {staffCount}
            </Text>
            <Text className="text-on-surface-variant mt-1 text-body-sm">Latest: {latestStaff}</Text>
          </Container>
          <View className="flex-row flex-wrap gap-2">
            <Button
              label="Create"
              variant="primary"
              className="min-w-[120px] flex-1"
              onPress={handleCreate}
            />
            <Button
              label="Read"
              variant="secondary"
              className="min-w-[120px] flex-1"
              onPress={handleRead}
            />
          </View>
          <View className="mt-2 flex-row flex-wrap gap-2">
            <Button
              label="Update"
              variant="outline"
              className="min-w-[120px] flex-1"
              onPress={handleUpdate}
            />
            <Button
              label="Delete"
              variant="outline"
              className="min-w-[120px] flex-1"
              onPress={handleDelete}
            />
          </View>
        </Section>

        {/* ---------- HARDWARE TESTS ---------- */}
        <Section title="Hardware Controls">
          <View className="gap-3">
            <Button
              label="Go to Printer Test"
              variant="primary"
              leftIcon={Printer}
              className="h-20"
              onPress={() => router.push('/printer-test')}
            />
            <Button
              label="Go to Barcode Test"
              variant="secondary"
              leftIcon={Barcode}
              className="h-20"
              onPress={() => router.push('/barcode-test')}
            />
          </View>
        </Section>

        {/* ---------- VICE SCREEN CONTROLS ---------- */}
        <Section title="Vice Screen Communication">
          <View className="gap-3">
            <Button
              label="Send Cart Data"
              variant="primary"
              leftIcon={ShoppingCart}
              onPress={sendCartData}
            />
            <Button
              label="Set Customer Name"
              variant="secondary"
              leftIcon={User}
              onPress={sendCustomerData}
            />
            <Button
              label="Send Order ID (TƯV...)"
              variant="primary"
              leftIcon={Hash}
              onPress={sendOrderId}
            />
            <Button
              label="Show Payment QR"
              variant="secondary"
              leftIcon={QrCode}
              onPress={showPaymentQR}
            />
            <Button
              label="Show Photography Promo"
              variant="primary"
              leftIcon={ImageIcon}
              onPress={showPhotographyPromo}
            />
            <Button
              label="Clear Vice Screen"
              variant="outline"
              leftIcon={Trash2}
              onPress={clearCart}
            />
          </View>
        </Section>

        {/* ---------- NATIVE LIFECYCLE TESTS ---------- */}
        <Section title="Native Lifecycle (Warning: Performance Heavy)">
          <View className="gap-3">
            <Button
              label="Open SecondViceScreen (Native open)"
              variant="outline"
              leftIcon={MonitorCheck}
              onPress={openSecondScreen}
            />
            <Button
              label="Back to ViceApp (Native open)"
              variant="outline"
              leftIcon={MonitorCheck}
              onPress={openFirstScreen}
            />
          </View>
        </Section>

        {/* ---------- BUTTONS ---------- */}
        <Section title="Button">
          <View className="gap-3">
            <Button label="Primary Button" variant="primary" />
            <Button label="Outline Button" variant="outline" />
            <Button label="Secondary Button" variant="secondary" />
            <Button label="With Left Icon" variant="primary" leftIcon={Home} />
            <Button label="With Right Icon" variant="outline" rightIcon={Search} />
            <Button label="Loading State" variant="primary" loading={true} />
            <Button label="Disabled" variant="primary" disabled />
          </View>
        </Section>

        {/* ---------- APP HEADER VARIANTS ---------- */}
        <Section title="AppHeader">
          <View className="gap-3 overflow-hidden rounded-lg">
            <Text className="text-on-surface-variant mb-1 text-body-sm">Gradient Variant</Text>
            <View className="overflow-hidden rounded-lg">
              <AppHeader title="Gradient Header" variant="gradient" rightIcon={Bell} />
            </View>
            <Text className="text-on-surface-variant mb-1 mt-2 text-body-sm">White Variant</Text>
            <View className="overflow-hidden rounded-lg border border-outline-variant">
              <AppHeader title="White Header" variant="white" rightIcon={Star} showBorderBottom />
            </View>
          </View>
        </Section>

        {/* ---------- CONTAINER ---------- */}
        <Section title="Container">
          <View className="gap-3">
            <Container>
              <Text className="text-on-surface text-body-base">Default Container</Text>
            </Container>
            <Container shadow>
              <Text className="text-on-surface text-body-base">Container with Shadow</Text>
            </Container>
            <Container centered className="h-16">
              <Text className="text-on-surface text-body-base">Centered Container</Text>
            </Container>
          </View>
        </Section>

        {/* ---------- INPUTS ---------- */}
        <Section title="Input">
          <View className="gap-3">
            <Input placeholder="Normal input..." value={inputValue} onChangeText={setInputValue} />
            <Input placeholder="Error state input..." error />
            <Input placeholder="Disabled input..." editable={false} />
          </View>
        </Section>

        {/* ---------- OPTION CARD ---------- */}
        <Section title="OptionCard">
          {['Option A', 'Option B', 'Option C'].map((opt) => (
            <OptionCard
              key={opt}
              text={opt}
              isSelected={selectedOption === opt}
              onPress={() => setSelectedOption(opt)}
              leftIcon={
                <Star
                  size={20}
                  color={selectedOption === opt ? COLORS.primary.default : COLORS.surface.onVariant}
                />
              }
            />
          ))}
        </Section>

        {/* ---------- LOADING ---------- */}
        <Section title="LoadingIndicator">
          <View className="flex-row items-center gap-6">
            <LoadingIndicator size="small" />
            <LoadingIndicator size="large" />
            <LoadingIndicator size="large" color={COLORS.primary.default} />
          </View>
        </Section>

        {/* ---------- PLACEHOLDER ---------- */}
        <Section title="Placeholder">
          <View className="h-32 w-full overflow-hidden rounded-lg">
            <Placeholder text="Placeholder content" />
          </View>
        </Section>
        {/* ---------- ACTION SHEET ---------- */}
        <Section title="Action Sheet">
          <Button
            label="Open Action Sheet"
            variant="primary"
            onPress={() => actionSheetRef.current?.open()}
          />
        </Section>

        {/* ---------- POPUP ---------- */}
        <Section title="Popup (Ref Based)">
          <View className="flex-row flex-wrap gap-2">
            <Button
              label="Success"
              variant="primary"
              className="min-w-[120px] flex-1"
              onPress={() => {
                setPopupAnimation('fade')
                setPopupConfig({
                  type: 'success',
                  title: 'Thành công',
                  description: 'Thao tác của bạn đã được thực hiện thành công.',
                })
                popupRef.current?.open()
              }}
            />
            <Button
              label="Error"
              variant="outline"
              className="min-w-[120px] flex-1"
              onPress={() => {
                setPopupAnimation('fade')
                setPopupConfig({
                  type: 'error',
                  title: 'Lỗi',
                  description: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
                })
                popupRef.current?.open()
              }}
            />
          </View>
          <View className="mt-2 flex-row flex-wrap gap-2">
            <Button
              label="Warning"
              variant="secondary"
              className="min-w-[120px] flex-1"
              onPress={() => {
                setPopupAnimation('fade')
                setPopupConfig({
                  type: 'warning',
                  title: 'Cảnh báo',
                  description: 'Hành động này có thể gây mất dữ liệu.',
                })
                popupRef.current?.open()
              }}
            />
            <Button
              label="Info"
              variant="outline"
              className="min-w-[120px] flex-1"
              onPress={() => {
                setPopupAnimation('fade')
                setPopupConfig({
                  type: 'info',
                  title: 'Thông báo',
                  description: 'Đây là một thông báo thông thường.',
                })
                popupRef.current?.open()
              }}
            />
          </View>
          <View className="mt-2 flex-row flex-wrap gap-2">
            <Button
              label="Diagonal Success"
              variant="primary"
              className="min-w-[120px] flex-1"
              onPress={() => {
                setPopupAnimation('diagonal')
                setPopupConfig({
                  type: 'success',
                  title: 'Diagonal Animation',
                  description: 'Hiệu ứng slide + zoom chéo.',
                })
                popupRef.current?.open()
              }}
            />
            <Button
              label="Zoom Info"
              variant="outline"
              className="min-w-[120px] flex-1"
              onPress={() => {
                setPopupAnimation('zoom')
                setPopupConfig({
                  type: 'info',
                  title: 'Zoom Animation',
                  description: 'Hiệu ứng phóng to nhẹ nhàng.',
                })
                popupRef.current?.open()
              }}
            />
          </View>
        </Section>

        {/* ---------- GLOBAL POPUP ---------- */}
        <Section title="Global Popup (Toast)">
          <View className="flex-row flex-wrap gap-2">
            <Button
              label="Toast Success"
              variant="primary"
              className="min-w-[120px] flex-1"
              onPress={() => toast.success('Đã lưu cài đặt', 'Hoàn tất')}
            />
            <Button
              label="Toast Error"
              variant="outline"
              className="min-w-[120px] flex-1"
              onPress={() => toast.error('Không thể kết nối máy in', 'Lỗi kết nối')}
            />
          </View>
          <View className="mt-2">
            <Button
              label="Confirm Dialog"
              variant="secondary"
              onPress={() =>
                toast.confirm({
                  title: 'Xóa dữ liệu?',
                  message: 'Bạn có chắc chắn muốn xóa toàn bộ dữ liệu không?',
                  onConfirm: () => Alert.alert('Đã xóa'),
                })
              }
            />
          </View>
        </Section>

        {/* ---------- FULL SCREEN LOADING ---------- */}
        <Section title="Full Screen Loading">
          <Button
            label="Trigger Full Screen Loading (2s)"
            variant="primary"
            onPress={() => {
              setIsFullScreenLoading(true)
              setTimeout(() => setIsFullScreenLoading(false), 2000)
            }}
          />
        </Section>

        {/* ---------- ICON BUTTON ---------- */}
        <Section title="IconButton">
          <View className="flex-row items-center gap-4 rounded-lg bg-surface-50 p-4">
            <IconButton icon={Home} variant="sm" />
            <IconButton icon={Bell} variant="md" />
            <IconButton icon={Star} variant="lg" />
            <IconButton icon={Search} variant="xl" />
          </View>
        </Section>

        {/* ---------- EMPTY STATE ---------- */}
        <Section title="EmptyState">
          <View className="overflow-hidden rounded-lg border border-outline-variant bg-surface-50">
            <EmptyState
              title="Không có dữ liệu"
              description="Hiện tại chưa có mục nào để hiển thị."
              icon={ShoppingCart}
              actionLabel="Thêm mới"
              onAction={() => Alert.alert('Action clicked')}
            />
          </View>
        </Section>
      </ScrollView>

      {/* Overlays & Modals */}
      <ActionSheet ref={actionSheetRef} title="Demo Action Sheet" subtitle="Cấu hình tùy chọn">
        <View className="gap-4">
          <Text className="text-on-surface text-body-base">
            Đây là nội dung bên trong Action Sheet. Bạn có thể tùy biến UI ở đây.
          </Text>
          <Input
            placeholder="Nhập nội dung test bàn phím..."
            value={actionSheetInput}
            onChangeText={setActionSheetInput}
          />
          <Button label="Đóng Sheet" onPress={() => actionSheetRef.current?.close()} />
        </View>
      </ActionSheet>

      <Popup
        ref={popupRef}
        type={popupConfig.type}
        title={popupConfig.title}
        description={popupConfig.description}
        animation={popupAnimation}
      >
        <Button label="Đóng Popup" onPress={() => popupRef.current?.close()} />
      </Popup>

      <FullScreenLoading visible={isFullScreenLoading} message="Đang tải dữ liệu..." />

      <GlobalPopup />
    </View>
  )
}
