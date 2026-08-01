## Note 13: Bổ sung trường tên sản phẩm tiếng Anh (English product name) trong các API trả về dữ liệu sản phẩm

> **[Yêu cầu mới]**: Đối với các API lấy hoặc đồng bộ dữ liệu sản phẩm về Client, Backend cần bổ sung thêm trường tên sản phẩm bằng tiếng Anh `nameEn`.

### Chi tiết yêu cầu:

- **Mô tả:** tất cả các API trả về thông tin sản phẩm cần cung cấp thêm thuộc tính tên sản phẩm bằng tiếng Anh.
- **Các API cần áp dụng:**
  - API tìm kiếm sản phẩm: `GET /v1/pos/search`
    - Cần cho phép tìm kiếm theo tiếng Anh, tiếng Việt và theo mã SKU/Barcode.
    - Tìm kiếm theo cơ chế partial.

---

## Note 14: Lưu trữ tên sản phẩm bằng tiếng Anh trong API đồng bộ đơn hàng offline lên Server

> **[Yêu cầu mới]**: Khi client đồng bộ đơn hàng offline lên hệ thống qua API `POST /v1/pos/sync/orders`, Backend cần ghi nhận và lưu trữ tên sản phẩm trong danh sách chi tiết đơn hàng (`itemsSnapshot`) bằng tên tiếng Anh (ưu tiên lấy tên tiếng Anh của sản phẩm, nếu không có mới sử dụng tên tiếng Việt).

---

## Note 15: Lưu trữ tên sản phẩm bằng tiếng Anh trong API tạo đơn hàng (Checkout) online

> **[Yêu cầu mới]**: Khi thiết bị tạo đơn hàng trực tuyến qua API `POST /v1/pos/checkout`, Backend cần ghi nhận và lưu trữ tên sản phẩm trong danh sách chi tiết đơn hàng (`itemsSnapshot`) bằng tên tiếng Anh (ưu tiên lấy tên tiếng Anh của sản phẩm, nếu không có mới sử dụng tên tiếng Việt).

---

## Note 16: Sắp xếp mặc định trong API danh sách đối tác và cộng tác viên

> **[Yêu cầu mới]**: Đối với các API lấy danh sách đối tác (`GET /v1/pos/partners`) và cộng tác viên (`GET /v1/pos/affiliates`), Backend cần mặc định sắp xếp kết quả trả về như sau:
>
> - Các đối tác/cộng tác viên **đang hoạt động** (`isActive: true` hoặc trạng thái `ACTIVE`) phải được sắp xếp để hiển thị lên trên cùng.
> - Các đối tác/cộng tác viên **ngừng hoạt động** (`isActive: false` hoặc các trạng thái không hoạt động) phải nằm ở phía dưới cùng danh sách.

---

## Note 17: Bổ sung phương thức thanh toán Công nợ vào báo cáo kết ca (Z-Report)

> **[Yêu cầu mới]**: Đối với API lấy báo cáo Z-Report của ca làm việc (`GET /v1/cash-sessions/{id}/z-report`), Backend cần bổ sung thống kê cho phương thức thanh toán **Công nợ** (`cong_no` hoặc `debt`).
>
> - Cụ thể, trong danh sách `paymentBreakdown` (mảng phân rã các phương thức thanh toán) và các chỉ số thống kê liên quan, cần tính toán và trả về tổng số tiền thuộc phương thức thanh toán Công nợ này để thiết bị POS hiển thị báo cáo chính xác khi kết ca.

---

## Note 18: Tái cấu trúc dữ liệu trả về trong API danh sách đơn hàng (`GET /v1/pos/orders`) — Gom đơn con vào đơn gốc

> **[Yêu cầu mới]**: Nhằm giúp thu ngân tại máy POS dễ dàng theo dõi và đối soát đơn hàng, Backend cần thay đổi cách trả dữ liệu trong API `GET /v1/pos/orders`. Thay vì trả toàn bộ các đơn con phát sinh sau đổi trả, Backend cần **gom toàn bộ thông tin vào đơn gốc** và **chỉ trả về đơn gốc** trong danh sách.

### Bối cảnh vấn đề

Khi thực hiện đổi hàng, hệ thống hiện tại sinh ra:

- 1 đơn con **Refund** (để trả sản phẩm cũ)
- 1 đơn con **New Order** (để mua sản phẩm thay thế)

Khi thực hiện trả hàng, hệ thống hiện tại sinh ra:

- 1 đơn con **Refund** (để trả sản phẩm cũ)

Điều này khiến danh sách đơn hàng hiển thị quá nhiều dòng, gây rối cho thu ngân khi cần rà soát đơn hàng hoặc in lại bill.

### Yêu cầu cụ thể

#### 1. Lọc đơn con khỏi danh sách (Lưu ý: originalOrderId là FE đang định nghĩa để xác định đơn gốc, BE có thể linh hoạt điều kiện tương tự là được)

- API chỉ trả về các đơn hàng có `originalOrderId = null` (tức là đơn gốc).
- Tất cả đơn có `originalOrderId != null` sẽ không xuất hiện trong kết quả trả về.

#### 2. Gom `itemsSnapshot` — Sản phẩm thực tế khách đang giữ

Backend tổng hợp dữ liệu sản phẩm từ các đơn con vào `itemsSnapshot` của đơn gốc theo quy tắc:

- **Với sản phẩm bị trả (từ đơn con Refund)**:
  - Tính `returnedQty` = tổng số lượng đã trả qua tất cả các lần trả.
  - Tính `remainingQty = quantity - returnedQty` (số lượng thực tế khách còn giữ).

- **Với sản phẩm đổi mới lấy (từ đơn con New Order)**:
  - Thêm sản phẩm đổi mới vào `itemsSnapshot` của đơn gốc.
  - Đánh dấu `isExchange: true` để phân biệt với sản phẩm mua gốc.
  - Mặc định: `returnedQty = 0`, `remainingQty = quantity`.

> **Ví dụ**: Khách mua 2 hộp Bánh quy bơ (món A). Sau đó đổi 1 hộp lấy 1 hộp Kẹo dừa (món B).
>
> - `itemsSnapshot` trả về gồm: món A (`quantity=2, returnedQty=1, remainingQty=1`), món B (`quantity=1, returnedQty=0, remainingQty=1, isExchange=true`).
> - Nếu khách đổi cả 2 hộp món A lấy món B: món A có `remainingQty=0` (Backend vẫn giữ trong snapshot để FE tự lọc khi cần), món B có `remainingQty=2`.

- Món đã trả có `remainingQty = 0` cũng không cần xóa khỏi `itemsSnapshot` — FE sẽ tự lọc khi render.

#### 3. Gom `paymentsSnapshot` — Toàn bộ lịch sử dòng tiền

- Vẫn giữ các phương thức của đơn gốc vì hệ thống đang có rule là đổi hàng ngang giá nên sẽ không phát sinh thêm số tiền mới
- Về phần trả hàng thì trả hết nên cũng không có dính đến trường hợp trả 1 phần nên paymentsSnapshot giữ nguyên là được

#### 4. Gom `refunds` — Danh sách biên nhận trả hàng

Backend gom toàn bộ các lần trả hàng liên quan vào mảng `refunds` trong đơn gốc, mỗi phần tử là một biên nhận trả hàng đầy đủ để Client có thể in bill trả hàng khi cần mà không cần tra cứu thêm.

#### 5. Cập nhật các trường tài chính tổng hợp

| Trường          | Ý nghĩa                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| `totalRefunded` | Tổng tiền đã hoàn trả cho khách qua tất cả các lần trả (mặc định: `0`)                                    |
| `status`        | `COMPLETED` (bình thường, kể cả đã đổi hàng) \| `REFUNDED` (đã trả hàng full) \| `CANCELLED` (đã huỷ)     |
| `returnStatus`  | `NONE` \| `PARTIAL` \| `RETURNED` — chi tiết tình trạng trả hàng để FE hiển thị badge, không cần tính lại |

### Cấu trúc dữ liệu `itemsSnapshot` mở rộng

Mỗi phần tử trong `itemsSnapshot` của đơn gốc trả về cần có đầy đủ các trường sau:

```
{
  lineId        : string    // ID duy nhất của dòng — không dùng productId làm key
  productId     : string    // ID sản phẩm
  sku           : string    // Mã SKU
  name          : string    // Tên sản phẩm (ưu tiên tiếng Anh)
  price         : number    // Đơn giá tại thời điểm phát sinh dòng
  quantity      : number    // Số lượng gốc của dòng (không đổi)
  returnedQty   : number    // Tổng số lượng đã trả của riêng dòng này (mặc định: 0)
  remainingQty  : number    // = quantity - returnedQty
  subtotal      : number    // = price × quantity (chưa cấn trừ)
  taxRate       : number    // Thuế suất (%)
  taxAmount     : number    // Tiền thuế gốc
  discountAmount: number    // Giảm giá cho dòng này
  isExchange    : boolean   // true = dòng đổi hàng nhận vào, false = dòng mua gốc
}
```

### Cấu trúc `refunds[]` trong đơn gốc

```
refunds: [
  {
    orderId     : string    // ID đơn gốc
    orderCode   : string    // Mã đơn gốc
    returnId    : string    // ID đơn con refund
    returnCode  : string    // Mã đơn con refund (ví dụ: "RT000123")
    reason      : string    // Lý do trả hàng
    staffId     : string    // Nhân viên thực hiện trả hàng
    refundedAt  : string    // Thời gian trả hàng (ISO String)
    refundAmount: number    // Số tiền hoàn trong lần trả này
    lines: [
      {
        productId       : string
        lineId          : string   // trỏ về OrderItemSnapshot.lineId bị trừ
        sku             : string
        name            : string
        orderedQty      : number   // Số lượng của dòng tại thời điểm trả
        returnedQty     : number   // Số lượng trả trong lần này
        remainingQty    : number   // Số lượng còn lại sau lần trả này
        unitPrice       : number
        lineRefundAmount: number
        isReturned      : boolean  // Luôn true
      }
    ]
  }
]
```

### Interface TypeScript đầy đủ — `OrderListApiItem`

Đây là toàn bộ cấu trúc của **một đơn hàng gốc** được trả về trong mảng `items` của API `GET /v1/pos/orders`.

```typescript
// ── Sub-types ────────────────────────────────────────────────────────────────

interface OrderItemSnapshot {
  lineId: string // ID duy nhất của dòng item trong snapshot
  // KHÔNG dùng productId làm key vì 1 sản phẩm có thể xuất hiện
  // nhiều dòng: 1 dòng gốc + N dòng exchange-in
  productId: string // ID sản phẩm
  sku: string // Mã SKU (ví dụ: "SP000123")
  name: string // Tên sản phẩm (ưu tiên tiếng Anh, fallback tiếng Việt)
  price: number // Đơn giá tại thời điểm phát sinh dòng này
  quantity: number // Số lượng gốc của dòng (KHÔNG đổi sau khi tạo dòng)
  returnedQty: number // Tổng số lượng đã trả CỦA RIÊNG dòng này — mặc định: 0
  remainingQty: number // = quantity - returnedQty
  subtotal: number // = price × quantity (chưa cấn trừ giảm giá/thuế)
  taxRate: number // Thuế suất (%) — ví dụ: 10
  taxAmount: number // Tiền thuế gốc của dòng
  discountAmount: number // Giảm giá áp dụng cho dòng — mặc định: 0
  isExchange: boolean // true = dòng phát sinh từ đổi hàng (nhận vào)
  // false = dòng mua gốc
}

interface OrderPaymentSnapshot {
  method: 'cash' | 'qr_bidv' | 'card_bidv' | 'cong_no'
  amount: number // Số tiền (âm nếu là hoàn tiền)
  cashTendered?: number // Khách đưa — chỉ có khi method = 'cash'
  cashChange?: number // Tiền thừa thối lại — chỉ có khi method = 'cash'
}

interface RefundLine {
  productId: string
  lineId: string // trỏ về OrderItemSnapshot.lineId bị trừ
  sku: string
  name: string
  orderedQty: number // Số lượng của dòng tại thời điểm trả
  returnedQty: number // Số lượng trả trong lần này
  remainingQty: number // Số lượng còn lại của dòng sau lần trả này
  unitPrice: number // Đơn giá tại thời điểm trả
  lineRefundAmount: number // Số tiền hoàn của dòng này
  isReturned: boolean // Luôn true trong refund lines
}

interface RefundRecord {
  orderId: string // ID đơn gốc
  orderCode: string // Mã đơn gốc (ví dụ: "HD000123")
  returnId: string // ID đơn con refund
  returnCode: string // Mã đơn con refund (ví dụ: "RT000555")
  reason: string // Lý do trả hàng
  staffId: string // Nhân viên thực hiện trả hàng
  refundedAt: string // ISO 8601
  refundAmount: number // Tổng tiền hoàn trong lần trả này
  lines: RefundLine[]
}

interface ExchangeLine {
  productId: string
  lineId: string // trỏ tới OrderItemSnapshot.lineId liên quan
  // (out: dòng gốc bị trừ / in: dòng mới tạo)
  sku: string
  name: string
  qty: number
  unitPrice: number
}

interface ExchangeRecord {
  exchangeId: string // ID định danh lần đổi hàng
  orderId: string // ID đơn gốc
  orderCode: string
  returnId: string // ID đơn con Refund sinh ra bởi lần đổi này
  returnCode: string
  newOrderId: string // ID đơn con New Order sinh ra bởi lần đổi này
  newOrderCode: string
  staffId: string
  exchangedAt: string // ISO 8601
  linesOut: ExchangeLine[] // Sản phẩm khách trả ra
  linesIn: ExchangeLine[] // Sản phẩm khách nhận vào
  priceDifference: number // Dương = khách trả thêm, âm = khách được hoàn, 0 = ngang giá
  settlementMethod?: 'cash' | 'qr_bidv' | 'card_bidv' | 'cong_no'
  // Hình thức cấn trừ chênh lệch
}

// ── Đơn vị trả về trong `items[]` ────────────────────────────────────────────

interface OrderListApiItem {
  id: string
  code: string | null // Mã đơn hàng (ví dụ: "HD000123"), null nếu chưa có
  shiftId: string // ID ca làm việc
  staffId: string // ID nhân viên tạo đơn
  staffName?: string | null // Tên nhân viên

  // ── Trạng thái ──
  // COMPLETED : đơn bình thường — kể cả khi đã từng đổi hàng
  // REFUNDED  : đã trả hàng full — terminal state
  // CANCELLED : đã huỷ — terminal state
  status: 'COMPLETED' | 'REFUNDED' | 'CANCELLED'
  returnStatus: 'NONE' | 'PARTIAL' | 'RETURNED'

  // ── Khả năng đổi / trả (Backend tính sẵn, FE không cần tự kiểm tra) ──
  // Điều kiện chung để canExchange = true VÀ canReturn = true:
  //   1. Đơn được tạo trong cùng ngày (createdAt cùng ngày với thời điểm request)
  //   2. Chưa từng phát sinh đổi/trả lần nào (exchanges.length = 0 VÀ refunds.length = 0)
  //   3. Không áp dụng voucher (voucherCode = null)
  //   4. Không có phương thức thanh toán công nợ (paymentsSnapshot không chứa method = 'cong_no')
  // Nếu vi phạm bất kỳ điều kiện nào → cả hai field đều = false.
  canExchange: boolean // true = đơn đủ điều kiện để đổi hàng
  canReturn: boolean // true = đơn đủ điều kiện để trả hàng

  // ── Tài chính ──
  subtotal: number // Tổng tiền hàng gốc trước giảm giá (= sum(price × quantity) của đơn gốc)
  discount: number // Giảm giá toàn đơn
  voucherCode?: string // Mã voucher đã áp dụng
  voucherDiscount: number // Số tiền giảm từ voucher — mặc định: 0
  totalTax: number // Tổng thuế VAT gốc
  total: number // Tổng thanh toán gốc (không đổi theo refund/exchange sau này)
  totalRefunded: number // Tổng tiền hoàn về tay khách — mặc định: 0

  // ── Sản phẩm (đã gom đổi trả) ──
  itemsSnapshot: OrderItemSnapshot[]

  // ── Thanh toán (giữ nguyên của đơn gốc — exchange ngang giá, refund trả full) ──
  paymentsSnapshot: OrderPaymentSnapshot[]

  // ── Biên nhận trả hàng thuần (không kèm đổi hàng) ──
  refunds: RefundRecord[] // [] nếu chưa từng trả thuần

  // ── Biên nhận đổi hàng ──
  exchanges: ExchangeRecord[] // [] nếu chưa từng đổi hàng

  // ── Thông tin khác ──
  note?: string
  customerTaxInfo?: {
    taxCode?: string
    companyName?: string
    companyAddress?: string
    buyerName?: string
    email?: string
  } | null
  agentType?: 'retail' | 'collaborator' | 'agent'
  affiliateId?: string | null
  partnerId?: string | null
  affiliate?: { id: string; code: string; name: string } | null
  partner?: { id: string; code: string; nameVi: string } | null

  createdAt: string // ISO 8601 — thời điểm tạo đơn gốc
  updatedAt: string // ISO 8601 — thời điểm cập nhật gần nhất
}

// ── Response wrapper đầy đủ ──────────────────────────────────────────────────

interface GetOrdersResponse {
  items: OrderListApiItem[]
  meta: {
    total: number // Tổng số đơn gốc (đã lọc bỏ đơn con)
    totalItems: number // Tổng số sản phẩm (tính theo remainingQty > 0)
    totalRevenue: number // Tổng doanh thu thực thu = sum(total - totalRefunded) của các đơn gốc (đã trừ các khoản đã hoàn trả)
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
  }
}
```

---

## Note 19: Cập nhật dữ liệu trả về trong API Dashboard Overview và Product Revenue

### 1. `GET /v1/pos/dashboard/overview` — `DashboardOverviewResponse`

**Yêu cầu thay đổi:**

| Trường            | Thay đổi                                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `totalRevenue`    | Chỉ tính doanh thu của các **đơn chưa huỷ** (`status != 'CANCELLED'`). Công thức: `sum(total - totalRefunded)` của tất cả đơn không phải CANCELLED. |
| `totalOrders`     | **[Thêm mới]** Tổng số đơn đã phát sinh (bao gồm COMPLETED, REFUNDED — không tính CANCELLED)                                                        |
| `completedOrders` | Giữ nguyên — số đơn `status = 'COMPLETED'`                                                                                                          |
| `refundedOrders`  | **[Thêm mới]** Số đơn `status = 'REFUNDED'`                                                                                                         |
| `cancelledOrders` | **[Xoá]** Không hiển thị số đơn đã huỷ trên dashboard nữa                                                                                           |

**Interface sau khi cập nhật:**

```typescript
interface DashboardOverviewResponse {
  employeeName: string
  employeeCode: string
  shiftTime: string
  shiftStart: string
  totalRevenue: number // sum(total - totalRefunded)
  totalOrders: number // Tổng đơn phát sinh
  completedOrders: number // Đơn hoàn thành, chưa trả hàng ( đổi hàng => phát sinh đơn trả hàng nhưng bản chất đơn gốc vẫn đang là đơn hoàn thành)
  refundedOrders: number // Đơn trả hàng
  paymentMethods: PaymentMethodItem[]
}
```

---

### 2. `GET /v1/pos/dashboard/product-revenue` — `ProductRevenueResponse`

**Yêu cầu thay đổi:**

| Trường         | Thay đổi                                                                                                                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items`        | Chỉ tính các sản phẩm **chưa bị trả** — tức là chỉ tổng hợp theo `remainingQty > 0` trong `itemsSnapshot`. Sản phẩm bị trả hết (`remainingQty = 0`) không được tính vào danh sách doanh thu sản phẩm. |
| `totalRevenue` | Tính theo doanh thu thực của từng sản phẩm sau khi trừ phần đã hoàn: `price × remainingQty`                                                                                                           |

**Interface giữ nguyên cấu trúc, chỉ thay đổi logic tổng hợp phía Backend:**

```typescript
interface ProductRevenueResponse {
  items: ProductRevenueItem[] // Chỉ gồm sản phẩm có remainingQty > 0
  totalCount: number
  page: number
  pageSize: number
  totalItems?: number // Tổng số lượng sản phẩm thực tế (tính theo remainingQty)
  totalRevenue?: number // Tổng doanh thu = sum(price × remainingQty) của từng dòng
}
```
