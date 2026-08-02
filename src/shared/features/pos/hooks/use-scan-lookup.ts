import { ProductLocalAPI } from '@/shared/features/product'
import { ProductRemoteAPI } from '@/shared/features/product/api/remote/product.remote.api'
import { toast } from '@/shared/store'
import { useCallback, useState } from 'react'
import { usePosActor } from './use-pos-actor'

export function useScanLookup() {
  const posActor = usePosActor()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleScan = useCallback(
    async (codes: string[]) => {
      if (codes.length === 0) return
      setIsProcessing(true)

      try {
        for (const code of codes) {
          let product = null

          // 1. Luồng Online First
          try {
            const remoteResult = await ProductRemoteAPI.lookupProduct({
              sku: code,
            })
            if (remoteResult) {
              product = {
                id: remoteResult.variantId,
                name: remoteResult.productNameEn || remoteResult.productName,
                sku: remoteResult.sku,
                price: remoteResult.price,
                stock: remoteResult.available,
                barcode: remoteResult.barcode,
                taxRate: remoteResult.taxRate,
                unit: remoteResult.unitCode,
                unitId: remoteResult.unitId,
              } as any
            }
          } catch {}

          // 2. Luồng Offline Fallback
          if (!product) {
            const localProduct = await ProductLocalAPI.getProductByCode(code)
            if (localProduct) {
              product = {
                id: localProduct.id,
                name: localProduct.nameEn || localProduct.name,
                sku: localProduct.sku,
                price: localProduct.price || 0,
                stock: localProduct.stock || 0,
                barcode: localProduct.barcode,
                taxRate: localProduct.taxRate,
                unit: localProduct.unitCode,
                unitId: localProduct.unitId,
              } as any
            }
          }

          // 3. Xử lý kết quả vào giỏ hàng
          if (product) {
            posActor?.send({ type: 'ADD_ITEM', product })
            toast.success(`Đã thêm: ${product.name}`)
          } else {
            toast.error(`Không tìm thấy sản phẩm cho mã: ${code}`, 'Thông báo')
          }
        }
      } finally {
        setIsProcessing(false)
      }
    },
    [posActor],
  )

  return {
    handleScan,
    isProcessing,
  }
}
export default useScanLookup
