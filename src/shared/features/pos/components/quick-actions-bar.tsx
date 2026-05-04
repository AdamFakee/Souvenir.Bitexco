import { Button } from '@/shared/components/ui'
import { useRouter } from 'expo-router'
import { Grid, LogOut, Package, Unlock } from 'lucide-react-native'
import React, { useRef } from 'react'
import { View } from 'react-native'
import { ProductSearchModal, ProductSearchModalRef } from './product-search-modal'

export default function QuickActionsBar() {
  const router = useRouter()
  const productModalRef = useRef<ProductSearchModalRef>(null)

  const handleOpenDrawer = () => {
    // TODO: Implement open drawer native module
  }

  return (
    <View className="h-22 flex-row items-center justify-between border-t border-outline-variant bg-surface-50 px-6 py-3">
      <View className="flex-row gap-4">
        <Button
          label="Sản phẩm"
          variant="outline"
          leftIcon={Grid}
          className="px-6"
          onPress={() => productModalRef.current?.open()}
        />
        <Button
          label="Xem báo cáo ca"
          variant="outline"
          leftIcon={Package}
          className="px-6"
          onPress={() => {
            // TODO: Navigate to reports
          }}
        />
        <Button
          label="Mở két"
          variant="outline"
          leftIcon={Unlock}
          className="px-6"
          onPress={handleOpenDrawer}
        />
      </View>

      <Button
        label="Đóng ca"
        variant="error"
        leftIcon={LogOut}
        className="px-8"
        onPress={() => router.push('/(tab)/shift')}
      />

      <ProductSearchModal ref={productModalRef} />
    </View>
  )
}
