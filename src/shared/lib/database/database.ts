import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

import { CategoryModel, OrderModel, ProductModel, PartnerModel, AffiliateModel } from './models'
import { schema } from './schema'

// Create the adapter
const adapter = new SQLiteAdapter({
  schema,
  jsi: true,
  dbName: 'gold_pos',
  onSetUpError: (_error) => {},
})

// Instantiate the database
export const database = new Database({
  adapter,
  modelClasses: [CategoryModel, ProductModel, OrderModel, PartnerModel, AffiliateModel],
})
