import React, { useEffect } from 'react'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import IminViceScreen from '../../modules/imin-vice-screen'
import {
  ViceCashPaymentScreen,
  ViceHomeScreen,
  VicePaymentScreen,
  VicePortablePaymentScreen,
  ViceSuccessScreen,
  ViceMixPaymentScreen,
  ViceStatusScreen,
} from './components'
import { useViceStore } from './vice-store'

export default function ViceApp() {
  const currentScreen = useViceStore((state) => state.currentScreen)
  const statusType = useViceStore((state) => state.statusType)
  const statusTitle = useViceStore((state) => state.statusTitle)
  const statusMessage = useViceStore((state) => state.statusMessage)
  const {
    updateCart,
    setCustomerName,
    setOrderId,
    showPayment,
    showPortablePayment,
    showMixPayment,
    showCashPayment,
    showStatus,
  } = useViceStore()

  useEffect(() => {
    // Lắng nghe sự kiện từ màn hình chính gửi sang
    const subscription = IminViceScreen.addListener('onDataReceived', (event: any) => {
      const { method, params } = event

      switch (method) {
        case 'updateCart':
          let parsedItems = []
          try {
            if (params.itemsJson) {
              parsedItems = JSON.parse(params.itemsJson)
            } else {
              parsedItems = params.items || []
            }
          } catch (e) {
            console.error('[ViceApp] Failed to parse itemsJson:', e)
          }
          updateCart({
            items: parsedItems,
            subtotal: params.subtotal || 0,
            discount: params.discount || 0,
            tax: params.tax || 0,
            total: params.total || 0,
          })
          break
        case 'setCustomer':
          setCustomerName(params.name || '')
          break
        case 'setOrderId':
          setOrderId(params.orderId || '')
          break
        case 'showPayment':
          showPayment({
            qrCodeUrl: params.qrCodeUrl,
            subtotal: params.subtotal || 0,
            discount: params.discount || 0,
            tax: params.tax || 0,
            total: params.total || 0,
          })
          break
        case 'showPortablePayment':
          showPortablePayment(params?.total ? { total: params.total } : undefined)
          break
        case 'showMixPayment':
          showMixPayment({
            subtotal: params.subtotal || 0,
            discount: params.discount || 0,
            tax: params.tax || 0,
            total: params.total || 0,
            cashPaid: params.cashPaid || 0,
            nonCashAmount: params.nonCashAmount || 0,
          })
          break
        case 'showCashPayment':
          showCashPayment({
            subtotal: params.subtotal || 0,
            discount: params.discount || 0,
            tax: params.tax || 0,
            total: params.total || 0,
            customerPaid: params.customerPaid || 0,
            change: params.change || 0,
            isSuccess: params.isSuccess || false,
          })
          break
        case 'showStatus':
          showStatus({
            type: params.type || 'info',
            title: params.title || '',
            message: params.message || '',
          })
          break
      }
    })

    return () => {
      subscription.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-white">
        {currentScreen === 'Home' && <ViceHomeScreen />}
        {currentScreen === 'Payment' && <VicePaymentScreen />}
        {currentScreen === 'CashPayment' && <ViceCashPaymentScreen />}
        {currentScreen === 'PortablePayment' && <VicePortablePaymentScreen />}
        {currentScreen === 'MixPayment' && <ViceMixPaymentScreen />}
        {currentScreen === 'Success' && <ViceSuccessScreen />}
        {currentScreen === 'Status' && (
          <ViceStatusScreen type={statusType} title={statusTitle} message={statusMessage} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  )
}
