import { Container } from '@/shared/components/ui'
import { Button } from '@/shared/components/ui/button'
import mockCategories from '@/shared/features/category/api/remote/mock-categories.json'
import mockProducts from '@/shared/features/product/api/remote/mock-products.json'
import { database } from '@/shared/lib/database'
import CategoryModel from '@/shared/lib/database/models/category'
import ProductModel from '@/shared/lib/database/models/product'
import React, { useEffect, useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'

export default function DevControlScreen() {
  const [categories, setCategories] = useState<CategoryModel[]>([])
  const [products, setProducts] = useState<ProductModel[]>([])

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
      Alert.alert('Thành công', 'Đã nạp dữ liệu Mock vào Local DB!')
      loadData()
    } catch (error) {
      console.error('Seeding error:', error)
      Alert.alert('Lỗi', 'Không thể nạp dữ liệu.')
    }
  }

  const handleClearData = async () => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa sạch Local DB?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa sạch',
        style: 'destructive',
        onPress: async () => {
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
            Alert.alert('Thành công', 'Đã xóa sạch DB!')
            loadData()
          } catch (e) {
            Alert.alert('Lỗi', 'Không thể xóa.')
          }
        },
      },
    ])
  }

  const getProductCountByCat = (catId: string) => {
    return products.filter((p) => p.categoryId === catId).length
  }

  return (
    <ScrollView className="flex-1 bg-surface-200 p-6">
      <Text className="mb-6 text-headline-md font-bold text-primary">Dev Control Panel</Text>

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
    </ScrollView>
  )
}
