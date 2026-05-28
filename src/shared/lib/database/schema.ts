import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 6,
  tables: [
    tableSchema({
      name: 'categories',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'display_order', type: 'number' },
        { name: 'is_deleted', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'products',
      columns: [
        { name: 'sku', type: 'string', isIndexed: true },
        { name: 'barcode', type: 'string', isOptional: true, isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'price', type: 'number' },
        { name: 'tax_rate', type: 'number' },
        { name: 'stock', type: 'number' },
        { name: 'unit_id', type: 'string' },
        { name: 'unit_code', type: 'string' },
        { name: 'is_active', type: 'boolean' },
        { name: 'is_deleted', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'orders',
      columns: [
        { name: 'shift_id', type: 'string', isIndexed: true },
        { name: 'staff_id', type: 'string', isIndexed: true },
        { name: 'status', type: 'string' },
        { name: 'subtotal', type: 'number' },
        { name: 'discount', type: 'number' },
        { name: 'voucher_code', type: 'string', isOptional: true },
        { name: 'voucher_discount', type: 'number' },
        { name: 'total', type: 'number' },
        { name: 'total_tax', type: 'number' },
        { name: 'note', type: 'string', isOptional: true },
        { name: 'refund_reason', type: 'string', isOptional: true },
        { name: 'original_order_id', type: 'string', isOptional: true },
        { name: 'customer_tax_info', type: 'string', isOptional: true },
        { name: 'items_snapshot', type: 'string' },
        { name: 'payments_snapshot', type: 'string' },
        { name: 'is_deleted', type: 'boolean' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
})
