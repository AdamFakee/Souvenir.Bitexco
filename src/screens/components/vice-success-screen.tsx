import React, { memo, useEffect } from 'react'
import { useViceStore } from '../vice-store'
import ViceStatusScreen from './vice-status-screen'

function ViceSuccessScreen() {
  const { setCurrentScreen, clearCart } = useViceStore()

  useEffect(() => {
    // Clear cart and go to home screen after 5 seconds
    const timeout = setTimeout(() => {
      clearCart()
      setCurrentScreen('Home')
    }, 5000)

    return () => clearTimeout(timeout)
  }, [setCurrentScreen, clearCart])

  return (
    <ViceStatusScreen
      type="success"
      title="Payment Successful"
      message="Thank you! Have a great day!"
    />
  )
}

export default memo(ViceSuccessScreen)
