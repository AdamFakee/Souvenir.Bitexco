# Order & Payment API

Tài liệu chi tiết về cấu trúc dữ liệu và các Endpoint đồng bộ cho Đơn hàng, Chi tiết đơn hàng và Thanh toán.

## 1. Data Interfaces (Schema)

### 1.1 OrderRaw (Bảng orders)

Cấu trúc dữ liệu Đơn hàng khớp chính xác với `OrderRaw` interface.

| Trường              | Kiểu dữ liệu      | Bắt buộc | Mô tả                                                            |
| :------------------ | :---------------- | :------: | :--------------------------------------------------------------- |
| `id`                | string            |    Có    | UUID của đơn hàng                                                |
| `shift_id`          | string            |    Có    | UUID của ca làm việc                                             |
| `staff_id`          | string            |    Có    | UUID của nhân viên                                               |
| `status`            | OrderStatus       |    Có    | Trạng thái: `COMPLETED`, `REFUNDED`, `FAILED`                    |
| `subtotal`          | number            |    Có    | Tổng tiền trước thuế/chiết khấu                                  |
| `discount`          | number            |    Có    | Số tiền chiết khấu                                               |
| `voucher_code`      | string            |  Không   | Mã voucher áp dụng                                               |
| `voucher_discount`  | number            |    Có    | Tiền giảm giá từ voucher                                         |
| `total`             | number            |    Có    | Tổng tiền cuối cùng                                              |
| `total_tax`         | number            |    Có    | Tổng thuế                                                        |
| `note`              | string            |  Không   | Ghi chú                                                          |
| `refund_reason`     | string            |  Không   | Lý do hoàn tiền                                                  |
| `original_order_id` | string            |  Không   | ID đơn gốc (nếu là đơn hoàn)                                     |
| `customer_tax_info` | TaxInfo \| null   |    Có    | Thông tin thuế (xem chi tiết TaxInfo bên dưới)                   |
| `items_snapshot`    | ItemSnapshot[]    |    Có    | Mảng snapshot sản phẩm (xem chi tiết ItemSnapshot bên dưới)      |
| `payments_snapshot` | PaymentSnapshot[] |    Có    | Mảng snapshot thanh toán (xem chi tiết PaymentSnapshot bên dưới) |
| `is_deleted`        | boolean           |    Có    | Trạng thái xóa                                                   |
| `created_at`        | number            |  Không   | Unix timestamp (ms)                                              |
| `updated_at`        | number            |  Không   | Unix timestamp (ms)                                              |

### 1.2 OrderItemRaw (Bảng order_items)

Dữ liệu chi tiết sản phẩm.

| Trường                  | Kiểu dữ liệu | Bắt buộc | Mô tả                          |
| :---------------------- | :----------- | :------: | :----------------------------- |
| `id`                    | string       |    Có    | UUID chi tiết                  |
| `order_id`              | string       |    Có    | UUID đơn hàng                  |
| `product_id`            | string       |    Có    | UUID sản phẩm                  |
| `product_name_snapshot` | string       |    Có    | Tên sản phẩm tại thời điểm bán |
| `price_snapshot`        | number       |    Có    | Giá tại thời điểm bán          |
| `quantity`              | number       |    Có    | Số lượng                       |
| `refunded_quantity`     | number       |    Có    | Số lượng đã hoàn               |
| `subtotal`              | number       |    Có    | Thành tiền của dòng            |
| `tax_rate_snapshot`     | number       |    Có    | Thuế suất snapshot             |
| `tax_amount`            | number       |    Có    | Tiền thuế                      |
| `discount_amount`       | number       |    Có    | Tiền chiết khấu                |
| `is_deleted`            | boolean      |    Có    | Trạng thái xóa                 |
| `created_at`            | number       |  Không   | Unix timestamp                 |
| `updated_at`            | number       |  Không   | Unix timestamp                 |

### 1.3 PaymentRaw (Bảng payments)

Dữ liệu thanh toán.

| Trường           | Kiểu dữ liệu  | Bắt buộc | Mô tả                                        |
| :--------------- | :------------ | :------: | :------------------------------------------- |
| `id`             | string        |    Có    | UUID giao dịch                               |
| `order_id`       | string        |    Có    | UUID đơn hàng                                |
| `method`         | PaymentMethod |    Có    | Phương thức: `CASH`, `CARD`, `BANK_TRANSFER` |
| `amount`         | number        |    Có    | Số tiền                                      |
| `cash_tendered`  | number        |  Không   | Tiền khách đưa                               |
| `cash_change`    | number        |  Không   | Tiền thối lại                                |
| `reference_code` | string        |  Không   | Mã tham chiếu                                |
| `card_type`      | string        |  Không   | Loại thẻ                                     |
| `is_deleted`     | boolean       |    Có    | Trạng thái xóa                               |
| `created_at`     | number        |  Không   | Unix timestamp                               |
| `updated_at`     | number        |  Không   | Unix timestamp                               |

### 1.4 Supporting Types

#### TaxInfo

```json
{
  "companyName": "string",
  "taxCode": "string",
  "email": "string"
}
```

#### ItemSnapshot

```json
{
  "productId": "string",
  "sku": "string",
  "barcode": "string (optional)",
  "name": "string",
  "price": "number",
  "quantity": "number",
  "subtotal": "number",
  "taxRate": "number",
  "taxAmount": "number",
  "discountAmount": "number"
}
```

#### PaymentSnapshot

```json
{
  "method": "string",
  "amount": "number"
}
```

---

## 2. API Endpoints

### 2.1 Fetch Changes (Pull)

Lấy danh sách các thay đổi của Đơn hàng, Chi tiết đơn và Thanh toán từ Server.

- **Method**: `GET`
- **Path**: `/api/v1/sync/orders`

#### Request Query Parameters

| Tham số          | Kiểu dữ liệu | Bắt buộc | Mô tả                                            |
| :--------------- | :----------- | :------: | :----------------------------------------------- |
| `last_pulled_at` | number       |  Không   | Unix timestamp (ms) lần cuối đồng bộ thành công. |

#### Response Data (`IBaseResponse<OrderSyncChanges>`)

Dữ liệu nằm trong trường `data`:

| Trường        | Kiểu dữ liệu                                                              | Mô tả                             |
| :------------ | :------------------------------------------------------------------------ | :-------------------------------- |
| `orders`      | `{ created: OrderRaw[], updated: OrderRaw[], deleted: string[] }`         | Các thay đổi của bảng orders      |
| `order_items` | `{ created: OrderItemRaw[], updated: OrderItemRaw[], deleted: string[] }` | Các thay đổi của bảng order_items |
| `payments`    | `{ created: PaymentRaw[], updated: PaymentRaw[], deleted: string[] }`     | Các thay đổi của bảng payments    |

**Ví dụ Response:**

```json
{
  "success": true,
  "status_code": 200,
  "message": "Fetch success",
  "data": {
    "orders": {
      "created": [], // Mảng OrderRaw
      "updated": [],
      "deleted": []
    },
    "order_items": {
      "created": [],
      "updated": [],
      "deleted": []
    },
    "payments": {
      "created": [],
      "updated": [],
      "deleted": []
    }
  },
  "meta": { "timestamp": 1715137347 },
  "error": null
}
```

### 2.2 Push Changes (Push)

Đẩy dữ liệu thay đổi của Đơn hàng và các bảng liên quan từ Local lên Server.

- **Method**: `POST`
- **Path**: `/api/v1/sync/orders`

#### Request Body (`PushChangesParams`)

| Trường                | Kiểu dữ liệu                                                              | Bắt buộc | Mô tả                                                 |
| :-------------------- | :------------------------------------------------------------------------ | :------: | :---------------------------------------------------- |
| `changes`             | object                                                                    |    Có    | Đối tượng chứa các bảng thay đổi (`OrderSyncChanges`) |
| `changes.orders`      | `{ created: OrderRaw[], updated: OrderRaw[], deleted: string[] }`         |    Có    | Các thay đổi của bảng orders                          |
| `changes.order_items` | `{ created: OrderItemRaw[], updated: OrderItemRaw[], deleted: string[] }` |    Có    | Các thay đổi của bảng order_items                     |
| `changes.payments`    | `{ created: PaymentRaw[], updated: PaymentRaw[], deleted: string[] }`     |    Có    | Các thay đổi của bảng payments                        |
| `last_pulled_at`      | number                                                                    |    Có    | Thời điểm Client thực hiện Pull trước khi Push        |

**Ví dụ Request Body:**

```json
{
  "changes": {
    "orders": {
      "created": [{ "id": "uuid-1", "status": "COMPLETED", "...": "..." }],
      "updated": [],
      "deleted": []
    },
    "order_items": {
      "created": [{ "id": "item-1", "order_id": "uuid-1", "...": "..." }],
      "updated": [],
      "deleted": []
    },
    "payments": {
      "created": [{ "id": "pay-1", "order_id": "uuid-1", "...": "..." }],
      "updated": [],
      "deleted": []
    }
  },
  "last_pulled_at": 1715137347
}
```

**Response Structure:**

```json
{
  "success": true,
  "status_code": 200,
  "message": "Push success",
  "data": null,
  "meta": { "timestamp": 1715137347 },
  "error": null
}
```
