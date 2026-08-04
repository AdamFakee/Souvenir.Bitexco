# Offline Mode — Kiến trúc & Luồng xử lý

## Tổng quan

App POS hỗ trợ bán hàng ngay cả khi **mất kết nối Internet**. Dữ liệu được lưu local qua WatermelonDB (SQLite) và tự động đồng bộ lên server khi có mạng trở lại. Kiến trúc theo mô hình **Offline-First** với **Outbox Pattern** cho đơn hàng.

```
┌──────────────────────────────────────────────────────┐
│                    APP POS                           │
│                                                      │
│  ┌─────────────┐    ┌──────────────┐                 │
│  │ Online Flow  │    │ Offline Flow │                 │
│  │ (REST API)   │    │ (WatermelonDB)│                │
│  └──────┬───────┘    └──────┬───────┘                 │
│         │                   │                         │
│         └───────┬───────────┘                         │
│                 ▼                                     │
│  ┌──────────────────────────────┐                     │
│  │        SyncService           │                     │
│  │  - pullMasterData (15 phút)  │                     │
│  │  - drainOutbox (khi online)  │                     │
│  └──────────────────────────────┘                     │
└──────────────────────────────────────────────────────┘
```

---

## 1. Phát hiện trạng thái mạng

### `useIsOnline` hook

**File:** [src/shared/hooks/use-is-online.ts](../src/shared/hooks/use-is-online.ts)

Sử dụng `@react-native-community/netinfo` để lắng nghe trạng thái kết nối mạng.

```ts
// Trả về boolean — true nếu có mạng, false nếu mất mạng
const isOnline = useIsOnline()
```

### `useConnectionStore` (Zustand)

**File:** [src/shared/store/use-connection-store.ts](../src/shared/store/use-connection-store.ts)

Global store quản lý 2 loại kết nối:

- **`isNetworkConnected`**: Kết nối Internet (NetInfo)
- **`isPosConnected`**: Kết nối tới máy POS EDC (socket local)

Khi mạng khôi phục → tự động gọi `SyncService.drainOutbox()` để đẩy đơn hàng offline lên.

---

## 2. Luồng thanh toán Online vs Offline

### Nguyên tắc phân nhánh

Mỗi payment machine sẽ kiểm tra `useConnectionStore.getState().isNetworkConnected` để quyết định đi đường online hay offline:

| Phương thức       | Online                                  | Offline                                        |
| ----------------- | --------------------------------------- | ---------------------------------------------- |
| **Tiền mặt**      | Gọi `POST /v1/pos/checkout`             | Ghi WatermelonDB, chờ sync                     |
| **QR Code**       | Gọi `POST /v1/pos/checkout` → fetch QR  | **Không khả dụng** (`isAvailable: !isOffline`) |
| **Thẻ POS (EDC)** | Gọi `POST /v1/pos/checkout` → EDC flow  | **Luôn online** (cần server tạo payment)       |
| **Mix**           | Online: checkout API; Offline: local DB | Giống tiền mặt                                 |
| **Công nợ**       | Online: checkout API; Offline: local DB | Giống tiền mặt                                 |

QR strategy từ chối hoạt động khi offline:

```ts
// File: src/shared/features/payment/strategies/qr.strategy.ts
isAvailable: (_, isOffline) => !isOffline
```

### Cash payment — ví dụ điển hình

**File:** [src/shared/features/payment/machines/cash-payment.machine.ts](../src/shared/features/payment/machines/cash-payment.machine.ts)

```
saveOrder actor:
  if (isOnline) → OrderRemoteAPI.checkout(payload)  // POST /v1/pos/checkout
  else          → OrderLocalAPI.checkout(payload)    // Ghi SQLite + trừ tồn kho local
```

---

## 3. Lưu đơn hàng Offline

### `OrderLocalAPI.checkout()`

**File:** [src/shared/features/order/api/local/order.local.api.ts](../src/shared/features/order/api/local/order.local.api.ts)

Quy trình lưu đơn hàng offline:

1. **Tạo ID local**: gọi `generateGuid()` → UUID v4
2. **Snapshot hóa giỏ hàng**: chuyển `CartItem[]` → `ItemSnapshot[]` (bao gồm `taxRate`, `taxAmount`, `discountAmount`)
3. **Snapshot hóa thanh toán**: chuyển payment → `PaymentSnapshot[]`
4. **Ghi WatermelonDB**: `database.write()` + `database.batch()` — tạo OrderModel với `isSynced = false`
5. **Trừ tồn kho local**: `ProductLocalAPI.prepareDeductStock()` trong cùng batch transaction

```ts
// ID được generate tại local
const preparedOrder = database.get<OrderModel>('orders').prepareCreate((o) => {
  o._raw.id = generateGuid()
  // ...
  o.isSynced = false // ← đánh dấu chưa sync
})
```

### Các loại đơn hàng offline

| Hàm                  | Trạng thái  | Dùng cho                          |
| -------------------- | ----------- | --------------------------------- |
| `checkout()`         | `COMPLETED` | Tiền mặt, công nợ (hoàn tất ngay) |
| `createOrderByQr()`  | `PENDING`   | QR payment (chờ thanh toán)       |
| `createOrderByPos()` | `PENDING`   | Thẻ POS (chờ EDC xác nhận)        |

Các hàm `completeOrderByQr()` và `completeOrderByPos()` cập nhật trạng thái `PENDING → COMPLETED` và trừ tồn kho.

---

## 4. Cơ chế sinh ID (generateGuid)

**File:** [src/shared/features/order/api/remote/order.remote.api.ts:420-440](../src/shared/features/order/api/remote/order.remote.api.ts#L420-L440)

### `generateGuid()` — Sinh UUID v4 phía client

```ts
export const generateGuid = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
```

**Cách hoạt động:**

- Regex replace trên pattern UUID v4 `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- `Math.random() * 16 | 0` → số ngẫu nhiên 0–15 (1 hex digit)
- Vị trí `4` cố định → version 4
- Vị trí `y`: `(r & 0x3) | 0x8` → 2 bit đầu luôn `10xx` (theo chuẩn UUID v4 variant 1)
- Kết quả: UUID v4 hợp lệ, VD `a1b2c3d4-e5f6-4abc-8def-0123456789ab`

> **Lưu ý:** Dùng `Math.random()` không phải CSPRNG — xác suất trùng cực thấp nhưng không an toàn tuyệt đối.

### `localIdToGuid()` — Chuẩn hóa ID trước khi gửi lên server

```ts
export const localIdToGuid = (localId: string): string => {
  // Nhánh 1: Nếu đã là UUID hợp lệ → trả về nguyên bản
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (guidRegex.test(localId)) return localId

  // Nhánh 2: Fallback — chuyển string bất kỳ → UUID
  let hex = ''
  for (let i = 0; i < localId.length; i++) {
    hex += localId.charCodeAt(i).toString(16).padStart(2, '0')
  }
  hex = hex.padEnd(32, '0').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}
```

Hai nhánh:

1. **Đã là UUID** → trả thẳng, không xử lý gì thêm
2. **Không phải UUID** (VD: string ngắn, ID từ nguồn khác) → chuyển từng ký tự thành hex char code, pad đủ 32 ký tự, format thành UUID

> **Thực tế:** Vì `generateGuid()` luôn sinh ra UUID v4 chuẩn, `localIdToGuid()` luôn rơi vào nhánh 1 (regex match → return nguyên bản). Nhánh 2 là defensive code.

### Luồng ID từ client → backend

```
1. TẠO ĐƠN (client)
   OrderLocalAPI.checkout()
   └─ o._raw.id = generateGuid()       // "a1b2c3d4-e5f6-4abc-8def-0123456789ab"
   └─ lưu WatermelonDB (is_synced = false)

2. KHI SYNC (SyncService.drainOutbox)
   └─ lấy đơn chưa sync từ WatermelonDB
   └─ map sang OrderRaw:
       id: localIdToGuid(o.id)         // regex match → giữ nguyên UUID
   └─ POST /v1/pos/sync/orders
       body: {
         orders: [{
           id: "a1b2c3d4-e5f6-4abc-8def-0123456789ab"  // ← UUID do client tự sinh
           // ...các field khác
         }]
       }

3. BACKEND
   └─ nhận UUID từ client làm ID chính thức của đơn hàng
   └─ không cần round-trip xin ID từ server (phù hợp offline-first)
```

| Bước                 | Hàm                        | Kết quả                                 |
| -------------------- | -------------------------- | --------------------------------------- |
| Tạo đơn              | `generateGuid()`           | UUID v4 từ `Math.random()`              |
| Chuẩn hóa trước sync | `localIdToGuid(id)`        | UUID v4 (giữ nguyên)                    |
| Gửi backend          | `POST /v1/pos/sync/orders` | Backend nhận UUID này làm `id` đơn hàng |

Backend nhận UUID do client tự sinh và dùng nó làm ID chính thức — không có round-trip để xin ID từ server. Đây là thiết kế cốt lõi của offline-first: client phải tự sinh ID mà không phụ thuộc server.

---

## 5. Sync dữ liệu

### `SyncService`

**File:** [src/shared/lib/database/sync/sync.service.ts](../src/shared/lib/database/sync/sync.service.ts)

Gồm 2 cơ chế sync riêng biệt:

#### 5.1 Pull Master Data (Products & Categories)

- **Trigger**: định kỳ mỗi **15 phút** (từ `useAppInit`)
- **Cơ chế**: WatermelonDB `synchronize()` — pull changes từ server theo `lastPulledAt`
- **API gọi**:
  - `GET /v1/pos/products/sync?lastSyncedAt=...&page=...&limit=200` → `ProductRemoteAPI.fetchChanges()`
  - `GET /v1/pos/categories/sync` (hiện mock rỗng) → `CategoryRemoteAPI.fetchChanges()`
- **Xử lý**: so sánh với local DB → quyết định CREATE / UPDATE / DELETE
- **Không push ngược** lên server (products/categories là read-only trên client)

#### 5.2 Drain Outbox (Orders)

- **Trigger**:
  - Tự động khi mạng khôi phục (trong `useConnectionStore.initListeners()`)
  - Gọi thủ công qua `useSync().syncNow()`
- **Cơ chế**: Outbox Pattern thủ công (không dùng WatermelonDB sync)
- **API gọi**: `POST /v1/pos/sync/orders`
- **Quy trình**:
  1. `OrderLocalAPI.getUnsyncedOrders()` — lấy tất cả đơn có `is_synced = false`
  2. Map sang `OrderRaw[]` — dùng `localIdToGuid()` chuẩn hóa ID
  3. Chunk 10 đơn/lần → gọi `OrderRemoteAPI.syncOfflineOrders(chunk)`
  4. Nếu thành công → `OrderLocalAPI.markOrdersAsSynced(chunkIds)` → set `is_synced = true`
  5. Nếu lỗi → `break` (dừng sync, giữ lại để thử lần sau)

```ts
// SyncService.drainOutbox() — flow chính
const unsyncedOrders = await OrderLocalAPI.getUnsyncedOrders()
const rawOrders = unsyncedOrders.map(o => ({ id: localIdToGuid(o.id), ... }))
for (chunk of chunks(rawOrders, 10)) {
  await OrderRemoteAPI.syncOfflineOrders(chunk)  // POST /v1/pos/sync/orders
  await OrderLocalAPI.markOrdersAsSynced(chunkIds)
}
```

---

## 6. Các API liên quan đến sync

### Sync Orders lên server

| Endpoint                   | Method    | Mục đích                      |
| -------------------------- | --------- | ----------------------------- |
| `POST /v1/pos/sync/orders` | Bulk sync | Đẩy danh sách đơn offline lên |

### Checkout Online

| Endpoint                | Method          | Mục đích                          |
| ----------------------- | --------------- | --------------------------------- |
| `POST /v1/pos/checkout` | Atomic checkout | Tạo đơn + payment trong 1 request |

### Pull Master Data

| Endpoint                      | Method          | Mục đích                                         |
| ----------------------------- | --------------- | ------------------------------------------------ |
| `GET /v1/pos/products/sync`   | Sync products   | Pull products theo `lastSyncedAt`, có phân trang |
| `GET /v1/pos/categories/sync` | Sync categories | Pull categories (hiện mock)                      |

### Tra cứu sản phẩm (có offline fallback)

| Endpoint             | Method           | Mục đích             |
| -------------------- | ---------------- | -------------------- |
| `GET /v1/pos/lookup` | Lookup chính xác | Tìm theo barcode/SKU |
| `GET /v1/pos/search` | Tìm kiếm         | Tìm theo từ khóa     |

### Orders

| Endpoint                            | Method      | Mục đích                    |
| ----------------------------------- | ----------- | --------------------------- |
| `GET /v1/pos/orders`                | List orders | Lấy danh sách đơn từ server |
| `POST /v1/pos/orders/{id}/refund`   | Refund      | Trả hàng                    |
| `POST /v1/pos/orders/{id}/exchange` | Exchange    | Đổi hàng                    |
| `POST /v1/pos/orders/{id}/cancel`   | Cancel      | Hủy đơn                     |

---

## 7. WatermelonDB Schema — bảng `orders`

**File:** [src/shared/lib/database/schema.ts](../src/shared/lib/database/schema.ts)

```ts
tableSchema({
  name: 'orders',
  columns: [
    { name: 'shift_id', type: 'string', isIndexed: true },
    { name: 'staff_id', type: 'string', isIndexed: true },
    { name: 'status', type: 'string' }, // PENDING | COMPLETED | REFUNDED | FAILED
    { name: 'subtotal', type: 'number' },
    { name: 'discount', type: 'number' },
    { name: 'voucher_code', type: 'string', isOptional: true },
    { name: 'voucher_discount', type: 'number' },
    { name: 'total', type: 'number' },
    { name: 'total_tax', type: 'number' },
    { name: 'note', type: 'string', isOptional: true },
    { name: 'refund_reason', type: 'string', isOptional: true },
    { name: 'original_order_id', type: 'string', isOptional: true },
    { name: 'customer_tax_info', type: 'string', isOptional: true }, // JSON
    { name: 'items_snapshot', type: 'string' }, // JSON — ItemSnapshot[]
    { name: 'payments_snapshot', type: 'string' }, // JSON — PaymentSnapshot[]
    { name: 'is_deleted', type: 'boolean' },
    { name: 'is_synced', type: 'boolean' }, // ← Cờ đánh dấu đã sync
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
})
```

### OrderModel

**File:** [src/shared/lib/database/models/order.ts](../src/shared/lib/database/models/order.ts)

Dùng `@json` decorator cho `items_snapshot`, `payments_snapshot`, `customer_tax_info` — WatermelonDB tự serialize/deserialize JSON.

---

## 8. Tìm kiếm sản phẩm — Online First, Offline Fallback

**File:** [src/shared/features/pos/hooks/use-product-search.ts](../src/shared/features/pos/hooks/use-product-search.ts)

```
if (isNetworkConnected):
  try ProductRemoteAPI.searchProducts()     // GET /v1/pos/search
  catch → fallback ProductLocalAPI.getProducts()  // WatermelonDB local
else:
  ProductLocalAPI.getProducts()             // WatermelonDB local
```

---

## 9. UI — Tab đơn hàng Offline

**File:** [src/shared/features/order/hooks/use-offline-orders.ts](../src/shared/features/order/hooks/use-offline-orders.ts)

- Hook `useOfflineOrders()` dùng TanStack `useInfiniteQuery` để load đơn hàng chưa sync (`isSynced: false`)
- Có `staleTime: 5000` — tự refresh mỗi 5 giây
- Trả về `stats` (tổng số đơn, tổng sản phẩm, tổng doanh thu) của các đơn chưa sync

Giao diện `OrderList` component hỗ trợ prop `mode="offline"` để hiển thị tab đơn offline.

---

## 10. React Query & Network Awareness

**File:** [src/shared/lib/react-query.ts](../src/shared/lib/react-query.ts)

```ts
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected)
  })
})
```

TanStack Query tự động:

- Tạm dừng fetch khi offline (nếu query dùng `networkMode: 'offlineFirst'`)
- Tự động refetch khi mạng khôi phục (`refetchOnReconnect`)

**Preset OFFLINE_PERSIST** ([src/shared/configs/query.config.ts](../src/shared/configs/query.config.ts)):

```ts
OFFLINE_PERSIST: {
  staleTime: 0,
  gcTime: days(7),
  networkMode: 'offlineFirst',
}
```

---

## 11. Tóm tắt luồng dữ liệu

```
                    ┌──────────────┐
                    │   App Start   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  useAppInit  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
    ┌─────────────┐ ┌───────────┐ ┌──────────────┐
    │ Pull Master │ │  Network  │ │ POS Connect  │
    │ Data (15min)│ │  Listener │ │  Listener    │
    └─────────────┘ └─────┬─────┘ └──────────────┘
                           │
                    ┌──────▼───────┐
                    │ Mạng khôi    │
                    │ phục?        │
                    └──────┬───────┘
                           │ Yes
                    ┌──────▼───────┐
                    │ drainOutbox  │
                    │ (sync orders)│
                    └──────────────┘

KHI BÁN HÀNG:
                    ┌──────────────┐
                    │  Checkout    │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ isOnline?    │
                    └──┬────────┬──┘
                   Yes │        │ No
               ┌───────▼──┐ ┌───▼──────────┐
               │ REST API │ │ WatermelonDB  │
               │ checkout │ │ checkout()    │
               │ /v1/pos/ │ │ is_synced=    │
               │ checkout │ │ false         │
               └──────────┘ └───┬───────────┘
                                │
                        ┌───────▼───────┐
                        │ Khi có mạng:  │
                        │ drainOutbox() │
                        │ → POST sync/  │
                        │   orders      │
                        │ → markSynced  │
                        └───────────────┘
```

---

## 12. Các file chính liên quan

| File                                                                                                                            | Vai trò                                           |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| [src/shared/hooks/use-is-online.ts](../src/shared/hooks/use-is-online.ts)                                                       | Hook phát hiện online/offline                     |
| [src/shared/store/use-connection-store.ts](../src/shared/store/use-connection-store.ts)                                         | Global connection state + auto sync               |
| [src/shared/lib/database/sync/sync.service.ts](../src/shared/lib/database/sync/sync.service.ts)                                 | Sync service: pull master data + drain outbox     |
| [src/shared/lib/database/sync/hooks/use-sync.ts](../src/shared/lib/database/sync/hooks/use-sync.ts)                             | Hook sync thủ công                                |
| [src/shared/features/order/api/local/order.local.api.ts](../src/shared/features/order/api/local/order.local.api.ts)             | CRUD đơn hàng local (WatermelonDB)                |
| [src/shared/features/order/api/remote/order.remote.api.ts](../src/shared/features/order/api/remote/order.remote.api.ts)         | Remote API + `generateGuid()` + `localIdToGuid()` |
| [src/shared/features/product/api/local/product.local.api.ts](../src/shared/features/product/api/local/product.local.api.ts)     | Local product lookup + trừ tồn kho                |
| [src/shared/features/product/api/remote/product.remote.api.ts](../src/shared/features/product/api/remote/product.remote.api.ts) | Remote product search + sync                      |
| [src/shared/features/payment/machines/cash-payment.machine.ts](../src/shared/features/payment/machines/cash-payment.machine.ts) | Cash payment — phân nhánh online/offline          |
| [src/shared/features/pos/hooks/use-product-search.ts](../src/shared/features/pos/hooks/use-product-search.ts)                   | Tìm SP: online first → offline fallback           |
| [src/shared/features/order/hooks/use-offline-orders.ts](../src/shared/features/order/hooks/use-offline-orders.ts)               | Hook load đơn offline cho UI                      |
| [src/shared/lib/database/schema.ts](../src/shared/lib/database/schema.ts)                                                       | WatermelonDB schema version 7                     |
| [src/shared/lib/database/models/order.ts](../src/shared/lib/database/models/order.ts)                                           | OrderModel với `is_synced` field                  |
| [src/shared/lib/react-query.ts](../src/shared/lib/react-query.ts)                                                               | React Query + network listener                    |
| [src/shared/configs/query.config.ts](../src/shared/configs/query.config.ts)                                                     | Query presets (có OFFLINE_PERSIST)                |
