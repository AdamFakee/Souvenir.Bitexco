import {
  AppHeader,
  Button,
  Container,
  Input,
  LoadingIndicator,
  OptionCard,
  Placeholder,
} from '@/shared/components/ui'
import { useRouter } from 'expo-router'
import {
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
import { useEffect, useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'
import IminViceScreen from '../../modules/imin-vice-screen'

export default function Index() {
  const router = useRouter()
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')

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
      <Text className="text-heading mb-3 font-bold text-primary">{title}</Text>
      {children}
    </View>
  )

  return (
    <View className="flex-1 bg-background-white">
      <AppHeader
        title="Hardware & UI Demo"
        variant="gradient"
        rightIcon={Bell}
        showLeftButton={false}
      />

      <ScrollView className="flex-1 px-md py-md" contentContainerStyle={{ paddingBottom: 40 }}>
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
            <Text className="text-desc mb-1 text-text-secondary">Gradient Variant</Text>
            <View className="overflow-hidden rounded-lg">
              <AppHeader title="Gradient Header" variant="gradient" rightIcon={Bell} />
            </View>
            <Text className="text-desc mb-1 mt-2 text-text-secondary">White Variant</Text>
            <View className="overflow-hidden rounded-lg border border-background-secondary">
              <AppHeader title="White Header" variant="white" rightIcon={Star} showBorderBottom />
            </View>
          </View>
        </Section>

        {/* ---------- CONTAINER ---------- */}
        <Section title="Container">
          <View className="gap-3">
            <Container>
              <Text className="text-desc text-text-primary-black">Default Container</Text>
            </Container>
            <Container shadow>
              <Text className="text-desc text-text-primary-black">Container with Shadow</Text>
            </Container>
            <Container centered className="h-16">
              <Text className="text-desc text-text-primary-black">Centered Container</Text>
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
              leftIcon={<Star size={20} color={selectedOption === opt ? '#9B0000' : '#707070'} />}
            />
          ))}
        </Section>

        {/* ---------- LOADING ---------- */}
        <Section title="LoadingIndicator">
          <View className="flex-row items-center gap-6">
            <LoadingIndicator size="small" />
            <LoadingIndicator size="large" />
            <LoadingIndicator size="large" color="#9B0000" />
          </View>
        </Section>

        {/* ---------- PLACEHOLDER ---------- */}
        <Section title="Placeholder">
          <View className="h-32 w-full overflow-hidden rounded-lg">
            <Placeholder text="Placeholder content" />
          </View>
        </Section>
      </ScrollView>
    </View>
  )
}
