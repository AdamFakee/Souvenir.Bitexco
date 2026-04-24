import { AppHeader, Button, Container } from '@/shared/components/ui'
import { PrinterService, getPrinterStatusText } from '@/shared/services'
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Info,
  Layout,
  Printer,
  RefreshCcw,
} from 'lucide-react-native'
import React, { useEffect, useRef, useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'
import PrinterImin from 'react-native-printer-imin'
import QRCode from 'react-native-qrcode-svg'

// --- 1. INTERFACES ---
interface TicketData {
  ticketName: string
  qrCode: string
  unitPrice?: number
  dateTime: string
}

interface CoffeeOrderItem {
  name: string
  qty: number
  price: number
  options?: string[]
}

interface CoffeeReceiptData {
  orderId: string
  table?: string
  staff: string
  dateTime: string
  items: CoffeeOrderItem[]
  subTotal: number
  tax: number
  total: number
  paymentMethod: string
}

// --- 2. PRINT TEMPLATES (UI FOR BITMAP) ---
const SkydeckTicketTemplate = ({
  data,
  printWithPrice = false,
}: {
  data: TicketData
  printWithPrice?: boolean
}) => (
  <View className="bg-white px-4 py-10" style={{ width: 576 }}>
    <View className="mb-6 items-center">
      <Text style={{ fontSize: 48, fontWeight: '900', color: '#000', textAlign: 'center' }}>
        SAIGON SKYDECK
      </Text>
      <Text
        style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: '#000',
          textAlign: 'center',
          marginTop: 4,
        }}
      >
        Bitexco Financial Tower, Quận 1, HCM
      </Text>
    </View>
    <View
      style={{
        borderBottomWidth: 3,
        borderBottomColor: '#000',
        borderStyle: 'dashed',
        marginVertical: 15,
      }}
    />
    <Text style={{ fontSize: 32, fontWeight: '900', textAlign: 'center', marginVertical: 20 }}>
      VÉ THAM QUAN
    </Text>
    <View className="gap-3">
      <View className="flex-row justify-between">
        <Text style={{ fontSize: 22 }}>Mã vé:</Text>
        <Text style={{ fontSize: 22, fontWeight: '900' }}>{data.qrCode}</Text>
      </View>
      <View className="flex-row justify-between">
        <Text style={{ fontSize: 22 }}>Thời gian:</Text>
        <Text style={{ fontSize: 22, fontWeight: '900' }}>{data.dateTime}</Text>
      </View>
    </View>
    <View
      style={{
        borderBottomWidth: 3,
        borderBottomColor: '#000',
        borderStyle: 'dashed',
        marginVertical: 15,
      }}
    />
    <View className="py-4">
      <Text style={{ fontSize: 32, fontWeight: '900', color: '#000' }}>
        {data.ticketName.toUpperCase()}
      </Text>
      {printWithPrice && data.unitPrice && (
        <View className="mt-4 flex-row items-end justify-between">
          <Text style={{ fontSize: 24, fontWeight: 'bold' }}>GIÁ VÉ:</Text>
          <Text style={{ fontSize: 40, fontWeight: '900' }}>
            {data.unitPrice.toLocaleString('vi-VN')} Đ
          </Text>
        </View>
      )}
    </View>
    <View
      style={{
        borderBottomWidth: 3,
        borderBottomColor: '#000',
        borderStyle: 'dashed',
        marginVertical: 15,
      }}
    />
    <View className="my-10 items-center">
      <Text style={{ fontSize: 18, fontWeight: '900', marginBottom: 15 }}>QUÉT MÃ ĐỂ VÀO CỔNG</Text>
      <View style={{ padding: 10, borderWidth: 4, borderColor: '#000' }}>
        <QRCode value={data.qrCode} size={300} quietZone={10} />
      </View>
    </View>
    <View
      style={{
        borderBottomWidth: 3,
        borderBottomColor: '#000',
        borderStyle: 'dashed',
        marginVertical: 15,
      }}
    />
    <View className="mt-6 items-center">
      <Text style={{ fontSize: 24, fontWeight: '900' }}>CẢM ƠN QUÝ KHÁCH</Text>
      <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 10 }}>
        Hotline: (+84) 2839 156 156
      </Text>
    </View>
  </View>
)

const CoffeeReceiptTemplate = ({ data }: { data: CoffeeReceiptData }) => (
  <View className="bg-white px-4 py-10" style={{ width: 576 }}>
    <View className="mb-6 items-center">
      <Text style={{ fontSize: 44, fontWeight: '900', color: '#000', letterSpacing: 2 }}>
        ANTIGRAVITY COFFEE
      </Text>
      <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
        123 Phan Xích Long, Phú Nhuận, HCM
      </Text>
    </View>
    <View
      style={{
        borderBottomWidth: 3,
        borderBottomColor: '#000',
        borderStyle: 'dashed',
        marginVertical: 10,
      }}
    />
    <View className="mb-2 flex-row justify-between">
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>HD: {data.orderId}</Text>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Bàn: {data.table || '---'}</Text>
    </View>
    <View
      style={{
        borderBottomWidth: 3,
        borderBottomColor: '#000',
        borderStyle: 'solid',
        marginVertical: 10,
      }}
    />
    <View className="flex-row pb-2">
      <Text style={{ flex: 3, fontSize: 20, fontWeight: '900' }}>SẢN PHẨM</Text>
      <Text style={{ flex: 1, fontSize: 20, fontWeight: '900', textAlign: 'center' }}>SL</Text>
      <Text style={{ flex: 1.5, fontSize: 20, fontWeight: '900', textAlign: 'right' }}>T.TIỀN</Text>
    </View>
    {data.items.map((item, index) => (
      <View key={index} className="py-2">
        <View className="flex-row">
          <Text style={{ flex: 3, fontSize: 22, fontWeight: 'bold' }}>{item.name}</Text>
          <Text style={{ flex: 1, fontSize: 22, textAlign: 'center' }}>{item.qty}</Text>
          <Text style={{ flex: 1.5, fontSize: 22, textAlign: 'right', fontWeight: 'bold' }}>
            {(item.qty * item.price).toLocaleString()}
          </Text>
        </View>
        {item.options?.map((opt, oIdx) => (
          <Text key={oIdx} style={{ fontSize: 18, marginLeft: 15, fontStyle: 'italic' }}>
            + {opt}
          </Text>
        ))}
      </View>
    ))}
    <View
      style={{
        borderBottomWidth: 2,
        borderBottomColor: '#000',
        borderStyle: 'dashed',
        marginVertical: 10,
      }}
    />
    <View className="gap-2">
      <View className="flex-row justify-between pt-2">
        <Text style={{ fontSize: 28, fontWeight: '900' }}>THÀNH TIỀN:</Text>
        <Text style={{ fontSize: 36, fontWeight: '900' }}>{data.total.toLocaleString()} đ</Text>
      </View>
    </View>
    <View
      style={{
        borderBottomWidth: 3,
        borderBottomColor: '#000',
        borderStyle: 'dashed',
        marginVertical: 15,
      }}
    />
    <View className="items-center">
      <View style={{ padding: 10, borderWidth: 3, borderColor: '#000' }}>
        <QRCode value={`PAY_${data.orderId}`} size={200} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: '900', marginTop: 20, textAlign: 'center' }}>
        XIN CẢM ƠN QUÝ KHÁCH!
      </Text>
    </View>
  </View>
)

// --- 3. MAIN COMPONENT ---
export default function PosPrinterTest() {
  const [printerStatus, setPrinterStatus] = useState<string>('Đang kiểm tra...')
  const [isReady, setIsReady] = useState(false)
  const ticketRef = useRef(null)
  const coffeeBillRef = useRef(null)

  const [deviceInfo, setDeviceInfo] = useState({
    serialNumber: '',
    modelName: '',
    firmware: '',
    density: 0,
    speed: 0,
  })

  useEffect(() => {
    initDevicePrinter()
  }, [])

  const initDevicePrinter = async () => {
    try {
      await PrinterImin.initPrinter()
      const status = await PrinterImin.getPrinterStatus()
      const statusCode = Number(status.code)
      setPrinterStatus(getPrinterStatusText(statusCode))
      setIsReady(statusCode === 0)

      const sn = await PrinterImin.getPrinterSerialNumber()
      const model = await PrinterImin.getPrinterModelName()
      const firmware = await PrinterImin.getPrinterFirmwareVersion()
      const density = await PrinterImin.getPrinterDensity()
      const speed = await PrinterImin.getPrinterSpeed()

      setDeviceInfo({
        serialNumber: sn,
        modelName: model,
        firmware: firmware,
        density: density,
        speed: speed,
      })
    } catch (error) {
      setPrinterStatus('Lỗi khởi tạo')
    }
  }

  const handlePrintStandard = async () => {
    try {
      await PrinterImin.printText('HÓA ĐƠN TIÊU CHUẨN', { align: 1, fontSize: 32, fontStyle: 1 })
      await PrinterImin.printAndLineFeed()
      await PrinterImin.printColumnsString([
        { text: 'Sản phẩm', width: 2, align: 0, fontSize: 24 },
        { text: 'SL', width: 1, align: 1, fontSize: 24 },
        { text: 'Thành tiền', width: 1, align: 2, fontSize: 24 },
      ])
      await PrinterImin.printText('--------------------------------')
      await PrinterImin.printColumnsString([
        { text: 'Cà phê Highland', width: 2, align: 0, fontSize: 24 },
        { text: 'x1', width: 1, align: 1, fontSize: 24 },
        { text: '45.000', width: 1, align: 2, fontSize: 24 },
      ])
      await PrinterImin.printAndFeedPaper(100)
      await PrinterImin.partialCut()
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể in')
    }
  }

  const handlePrintComponent = async () => {
    try {
      if (!ticketRef.current) return
      await PrinterService.printComponent(ticketRef)
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể in component')
    }
  }

  const handlePrintCoffeeBill = async () => {
    try {
      if (!coffeeBillRef.current) return
      await PrinterService.printComponent(coffeeBillRef)
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể in bill cafe')
    }
  }

  const Section = ({ title, icon: Icon, children }: any) => (
    <View className="mb-6">
      <View className="mb-3 flex-row items-center">
        <Icon size={20} color="#9B0000" />
        <Text className="ml-2 font-bold text-lg text-primary">{title}</Text>
      </View>
      {children}
    </View>
  )

  const InfoRow = ({ label, value }: { label: string; value: any }) => (
    <View className="flex-row justify-between border-b border-background-secondary py-2">
      <Text className="text-text-secondary">{label}</Text>
      <Text className="font-mono text-text-primary-black">{value || '---'}</Text>
    </View>
  )

  return (
    <View className="flex-1 bg-background-white">
      <AppHeader title="Hardware Integration Test" variant="gradient" />

      {/* Hidden Containers for component printing */}
      <View style={{ position: 'absolute', left: -3000, top: 0 }}>
        <View collapsable={false} ref={ticketRef}>
          <SkydeckTicketTemplate
            data={{
              ticketName: 'SKYDECK ADULT - VIP PACKAGE',
              qrCode: 'SKD-2026-VIP',
              unitPrice: 450000,
              dateTime: '24/04/2026 18:45',
            }}
            printWithPrice
          />
        </View>
        <View collapsable={false} ref={coffeeBillRef}>
          <CoffeeReceiptTemplate
            data={{
              orderId: 'CF-888',
              table: 'VIP-01',
              staff: 'Quỳnh Anh',
              dateTime: '24/04/2026 13:30',
              items: [
                {
                  name: 'Caramel Macchiato',
                  qty: 1,
                  price: 65000,
                  options: ['Size L', 'Ít đường', 'Thêm đá'],
                },
                {
                  name: 'Trà Đào Cam Sả',
                  qty: 2,
                  price: 55000,
                  options: ['Size M', 'Nhiều thạch'],
                },
              ],
              subTotal: 220000,
              tax: 17600,
              total: 237600,
              paymentMethod: 'MOMO',
            }}
          />
        </View>
      </View>

      <ScrollView className="flex-1 p-md" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Status Section */}
        <Container shadow centered className="mb-6 py-6">
          <View
            className={isReady ? 'rounded-full bg-green-100 p-4' : 'rounded-full bg-red-100 p-4'}
          >
            {isReady ? (
              <CheckCircle2 size={40} color="#22C55E" />
            ) : (
              <AlertCircle size={40} color="#EF4444" />
            )}
          </View>
          <Text className="mt-3 font-bold text-xl text-text-primary-black">{printerStatus}</Text>
        </Container>

        {/* Device Info */}
        <Section title="Thiết bị iMin Swan 2" icon={Info}>
          <Container className="bg-background-secondary/30 p-4">
            <InfoRow label="Model" value={deviceInfo.modelName} />
            <InfoRow label="Serial" value={deviceInfo.serialNumber} />
            <InfoRow label="Firmware" value={deviceInfo.firmware} />
          </Container>
        </Section>

        {/* Action Section */}
        <Section title="Kịch bản in ấn" icon={Printer}>
          <View className="gap-3">
            <Button
              label="In Bill Cafe (Component)"
              variant="primary"
              leftIcon={Layout}
              onPress={handlePrintCoffeeBill}
              disabled={!isReady}
            />
            <Button
              label="In Vé Skydeck (Component)"
              variant="outline"
              leftIcon={Layout}
              onPress={handlePrintComponent}
              disabled={!isReady}
            />
            <Button
              label="In Bill Native Standard"
              variant="secondary"
              leftIcon={FileText}
              onPress={handlePrintStandard}
              disabled={!isReady}
            />
            <Button
              label="Làm mới trạng thái"
              variant="outline"
              leftIcon={RefreshCcw}
              onPress={initDevicePrinter}
            />
          </View>
        </Section>
      </ScrollView>
    </View>
  )
}
