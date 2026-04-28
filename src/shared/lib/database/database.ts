import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

import {
  CategoryModel,
  OrderItemModel,
  OrderModel,
  PaymentModel,
  ProductModel,
  ShiftModel,
  StaffModel,
} from './models'
import { schema } from './schema'

// Create the adapter
const adapter = new SQLiteAdapter({
  schema,
  jsi: true,
  dbName: 'gold_pos',
  onSetUpError: (error) => {
    console.error('WatermelonDB Setup Error', error)
  },
})

// Instantiate the database
export const database = new Database({
  adapter,
  modelClasses: [
    StaffModel,
    ShiftModel,
    CategoryModel,
    ProductModel,
    OrderModel,
    OrderItemModel,
    PaymentModel,
  ],
})
