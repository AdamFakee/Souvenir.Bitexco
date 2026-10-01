import { useConnectionStore } from '@/core/hardware'
import { useDevice } from '@/features/app/hooks/use-app-context'
import { getProductByCode, lookupProduct } from '@/features/product'
import { toast } from '@/shared/store'
import { useCallback, useState } from 'react'
import { usePosActor } from './use-pos-actor'

/**
 * Hook xử lý logic tìm kiếm & thêm sản phẩm vào giỏ hàng khi quét barcode/SKU
 *
 * Chiến lược: **Smart Local-First & Realtime Stock Check**
 * - 1. Ưu tiên Local SQLite nếu còn hàng (stock > 0) -> Phản hồi tức thì (<5ms).
 * - 2. Nếu Local không tìm thấy HOẶC Local báo hết hàng (stock <= 0) mà đang có kết nối mạng:
 *      -> Tự động gọi API remote `lookupProduct` (kèm `warehouseId`) để kiểm tra tồn kho thời gian thực từ server.
 * - 3. Nếu tìm thấy sản phẩm hợp lệ, gửi action `ADD_ITEM` vào POS Machine Actor.
 */
export function useScanLookup() {
  const posActor = usePosActor()
  const device = useDevice()
  const warehouseId = device?.warehouseId
  const [isProcessing, setIsProcessing] = useState(false)

  const handleScan = useCallback(
    async (codes: string[]) => {
      // Bỏ qua nếu danh sách mã quét rỗng
      if (codes.length === 0) return
      setIsProcessing(true)

      try {
        const isNetworkConnected = useConnectionStore.getState().isNetworkConnected

        // Duyệt qua từng mã barcode nhận được từ máy quét
        for (const code of codes) {
          const trimmedCode = code.trim()
          if (!trimmedCode) continue

          let product: any = null

          // =====================================================================
          // 1. LUỒNG LOCAL: Truy vấn database SQLite nội bộ
          // =====================================================================
          try {
            const localProduct = await getProductByCode(trimmedCode)
            if (localProduct) {
              product = {
                id: localProduct.id,
                name: localProduct.nameEn || localProduct.name,
                sku: localProduct.sku,
                price: localProduct.price || 0,
                stock: localProduct.stock ?? 0,
                barcode: localProduct.barcode,
                taxRate: localProduct.taxRate,
                unit: localProduct.unitCode,
                unitId: localProduct.unitId,
              }
            }
          } catch (e) {
            console.warn('[useScanLookup] Lỗi khi truy vấn sản phẩm local:', e)
          }

          // =====================================================================
          // 2. LUỒNG ONLINE FALLBACK / REALTIME STOCK CHECK:
          //    Kích hoạt khi:
          //    - Chưa tìm thấy sản phẩm ở local (sản phẩm mới tạo trên server)
          //    - HOẶC local báo hết hàng (stock <= 0) nhưng máy đang online
          //      (cần check online xem kho đã được cập nhật/nhập thêm hàng chưa)
          // =====================================================================
          const shouldCheckOnline =
            isNetworkConnected && (!product || (product.stock !== null && product.stock <= 0))

          if (shouldCheckOnline) {
            try {
              const remoteResult = await lookupProduct({
                sku: trimmedCode,
                barcode: trimmedCode,
                warehouseId,
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
                }
              }
            } catch {
              // Bỏ qua lỗi mạng nếu online lookup thất bại
            }
          }

          // =====================================================================
          // 3. XỬ LÝ KẾT QUẢ: Thêm vào giỏ hàng hoặc báo lỗi không tìm thấy
          // =====================================================================
          if (product) {
            posActor?.send({ type: 'ADD_ITEM', product })
            toast.success(`Đã thêm: ${product.name}`)
          } else {
            toast.error(`Không tìm thấy sản phẩm cho mã: ${trimmedCode}`, 'Thông báo')
          }
        }
      } finally {
        setIsProcessing(false)
      }
    },
    [posActor, warehouseId],
  )

  return {
    handleScan,
    isProcessing,
  }
}
export default useScanLookup
