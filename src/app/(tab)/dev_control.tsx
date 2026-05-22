import { Container } from '@/shared/components/ui'
import { Button } from '@/shared/components/ui/button'
import mockCategories from '@/shared/features/category/api/remote/mock-categories.json'
import { BitexcoReceiptTemplate } from '@/shared/features/order/components/bitexco-receipt-template'
import mockProducts from '@/shared/features/product/api/remote/mock-products.json'
import { AxiosService } from '@/shared/lib/axios/axios.service'
import { database } from '@/shared/lib/database'
import CategoryModel from '@/shared/lib/database/models/category'
import ProductModel from '@/shared/lib/database/models/product'
import { toast } from '@/shared/store'
import React, { useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { storage } from '@/shared/lib/storage'
import { useAppStore } from '@/shared/features/app'

export default function DevControlScreen() {
  const [categories, setCategories] = useState<CategoryModel[]>([])
  const [products, setProducts] = useState<ProductModel[]>([])
  const [mockHasOpenShift, setMockHasOpenShift] = useState(
    storage.getBoolean('mock-has-open-shift') ?? false,
  )

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
            record.categoryId = prod.category_id
            record.sku = prod.sku
            record.nameEn = prod.name_en
            record.nameVi = prod.name_vi
            record.unit = prod.unit
            record.taxRate = prod.tax_rate
            record.price = prod.price
            record.costPrice = prod.cost_price
            record.stock = prod.stock
            record.image = prod.image
            record.supplier = prod.supplier
            record.isActive = prod.is_active
            record.isDeleted = prod.is_deleted
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
    return products.filter((p) => p.categoryId === catId).length
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

  const handleToggleOpenShiftMock = (enabled: boolean) => {
    storage.set('mock-has-open-shift', enabled)
    setMockHasOpenShift(enabled)
    toast.success(`Mock: ${enabled ? 'Đã bật' : 'Đã tắt'} trạng thái Có Ca Đang Mở`, 'Thành công')
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

      {/* Mock v1.8 Auth & Shift Controls */}
      <Container className="mb-6 border border-primary/20 bg-primary/5 p-4">
        <Text className="text-title-md mb-1 font-black uppercase tracking-wider text-primary">
          Mock v1.8 Auth & Shift
        </Text>
        <Text className="text-body-xs mb-4 text-muted">
          Thay đổi trạng thái API mock & giả lập các sự kiện State Machine của hệ thống
        </Text>

        <View className="gap-4">
          <View className="flex-row gap-3">
            <Button
              label="Mock: CHƯA MỞ CA"
              variant={!mockHasOpenShift ? 'primary' : 'outline'}
              className={`flex-1 ${!mockHasOpenShift ? 'bg-primary' : 'border-primary'}`}
              textClassName={!mockHasOpenShift ? 'text-white' : 'text-primary'}
              onPress={() => handleToggleOpenShiftMock(false)}
            />
            <Button
              label="Mock: CÓ CA ĐANG MỞ"
              variant={mockHasOpenShift ? 'primary' : 'outline'}
              className={`flex-1 ${mockHasOpenShift ? 'bg-primary' : 'border-primary'}`}
              textClassName={mockHasOpenShift ? 'text-white' : 'text-primary'}
              onPress={() => handleToggleOpenShiftMock(true)}
            />
          </View>

          <View className="flex-row gap-3">
            <Button
              label="Simulate: Hết hạn Token (401)"
              variant="outline"
              className="flex-1 border-amber-600"
              textClassName="text-amber-600"
              onPress={handleSimulateTokenExpired}
            />
            <Button
              label="Force LOGOUT (Reset)"
              variant="outline"
              className="flex-1 border-error"
              textClassName="text-error"
              onPress={handleForceLogout}
            />
          </View>
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
        <View className="mt-4">
          <Button
            label="Test API: Kích hoạt máy POS (/v1/pos-devices/activate)"
            className="bg-blue-600"
            onPress={handleTestActivateDevice}
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
    </ScrollView>
  )
}
