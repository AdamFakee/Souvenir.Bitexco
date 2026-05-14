# Order & Payment API

Tài liệu chi tiết về cấu trúc dữ liệu và các Endpoint đồng bộ cho Đơn hàng. Sau khi refactor, toàn bộ dữ liệu Chi tiết đơn hàng (Items) và Thanh toán (Payments) đều được lưu trữ trực tiếp bên trong bảng `orders` dưới dạng JSON Snapshots để tối ưu hóa việc đồng bộ.

## 1. Data Interfaces (Schema)

### 1.1 OrderRaw (Bảng orders)

Cấu trúc dữ liệu Đơn hàng khớp chính xác với `OrderRaw` interface. Đây là đối tượng duy nhất cần đồng bộ.

| Trường              | Kiểu dữ liệu      | Bắt buộc | Mô tả                                                            |
| :------------------ | :---------------- | :------: | :--------------------------------------------------------------- |
| `id`                | string            |    Có    | UUID của đơn hàng                                                |
| `shift_id`          | string            |    Có    | UUID của ca làm việc                                             |
| `staff_id`          | string            |    Có    | UUID của nhân viên                                               |
| `status`            | OrderStatus       |    Có    | Trạng thái: `PENDING`, `COMPLETED`, `REFUNDED`, `FAILED`         |
| `subtotal`          | number            |    Có    | Tổng tiền trước thuế/chiết khấu                                  |
| `discount`          | number            |    Có    | Số tiền chiết khấu tổng                                          |
| `voucher_code`      | string            |  Không   | Mã voucher áp dụng                                               |
| `voucher_discount`  | number            |    Có    | Tiền giảm giá từ voucher                                         |
| `total`             | number            |    Có    | Tổng tiền cuối cùng                                              |
| `total_tax`         | number            |    Có    | Tổng thuế                                                        |
| `note`              | string            |  Không   | Ghi chú đơn hàng                                                 |
| `refund_reason`     | string            |  Không   | Lý do hoàn tiền                                                  |
| `original_order_id` | string            |  Không   | ID đơn gốc (nếu là đơn hoàn)                                     |
| `customer_tax_info` | TaxInfo \| null   |    Có    | Thông tin thuế                                                   |
| `items_snapshot`    | ItemSnapshot[]    |    Có    | Mảng snapshot sản phẩm chi tiết                                  |
| `payments_snapshot` | PaymentSnapshot[] |    Có    | Mảng snapshot thanh toán (có thể chứa nhiều đợt thanh toán/hoàn) |
| `is_deleted`        | boolean           |    Có    | Trạng thái xóa                                                   |
| `created_at`        | number            |  Không   | Unix timestamp (ms)                                              |
| `updated_at`        | number            |  Không   | Unix timestamp (ms)                                              |

### 1.2 Supporting Types (JSON Snapshots)

Dữ liệu snapshot được lưu dưới dạng chuỗi JSON (trong DB local) và mảng Object (khi truyền qua API).

#### A. ItemSnapshot (Chi tiết sản phẩm)

Lưu trữ thông tin sản phẩm tại thời điểm bán để đảm bảo tính toàn vẹn của hóa đơn lịch sử.

| Trường           | Kiểu dữ liệu | Bắt buộc | Mô tả                                     |
| :--------------- | :----------- | :------: | :---------------------------------------- |
| `productId`      | string       |    Có    | ID của sản phẩm gốc                       |
| `sku`            | string       |    Có    | Mã SKU của sản phẩm                       |
| `barcode`        | string       |  Không   | Mã vạch sản phẩm                          |
| `name`           | string       |    Có    | Tên sản phẩm hiển thị trên hóa đơn        |
| `price`          | number       |    Có    | Đơn giá tại thời điểm bán                 |
| `quantity`       | number       |    Có    | Số lượng mua                              |
| `subtotal`       | number       |    Có    | Thành tiền (price \* quantity)            |
| `taxRate`        | number       |    Có    | Mức thuế (%)                              |
| `taxAmount`      | number       |    Có    | Số tiền thuế                              |
| `discountAmount` | number       |    Có    | Tiền giảm giá riêng cho món này           |
| `note`           | string       |  Không   | Ghi chú riêng cho món (ví dụ: "ít đường") |

#### B. PaymentSnapshot (Chi tiết thanh toán)

Hỗ trợ thanh toán một phần hoặc hoàn tiền.

| Trường          | Kiểu dữ liệu  | Bắt buộc | Mô tả                                                      |
| :-------------- | :------------ | :------: | :--------------------------------------------------------- |
| `method`        | PaymentMethod |    Có    | `CASH`, `CARD`, `BANK_TRANSFER`                            |
| `amount`        | number        |    Có    | Số tiền (Số dương: Thanh toán, **Số âm: Hoàn tiền**)       |
| `cashTendered`  | number        |  Không   | Tiền khách đưa (Dành cho CASH)                             |
| `cashChange`    | number        |  Không   | Tiền thối lại (Dành cho CASH)                              |
| `referenceCode` | string        |  Không   | Mã tham chiếu giao dịch (QR/Card)                          |
| `cardType`      | string        |  Không   | Loại thẻ (Dành cho CARD)                                   |
| `createdAt`     | number        |  Không   | Unix timestamp ghi nhận giao dịch (để phân biệt đợt thanh) |

---

## 2. API Endpoints

### 2.1 Fetch Changes (Pull)

Lấy danh sách các thay đổi của Đơn hàng từ Server.

- **Method**: `GET`
- **Path**: `/api/v1/sync/orders`

#### Request Query Parameters

| Tham số          | Kiểu dữ liệu | Bắt buộc | Mô tả                                            |
| :--------------- | :----------- | :------: | :----------------------------------------------- |
| `last_pulled_at` | number       |  Không   | Unix timestamp (ms) lần cuối đồng bộ thành công. |

#### Response Data (`IBaseResponse<OrderSyncChanges>`)

Dữ liệu nằm trong trường `data`:

| Trường   | Kiểu dữ liệu                                                      | Mô tả                        |
| :------- | :---------------------------------------------------------------- | :--------------------------- |
| `orders` | `{ created: OrderRaw[], updated: OrderRaw[], deleted: string[] }` | Các thay đổi của bảng orders |

**Ví dụ Response:**

```json
{
  "success": true,
  "status_code": 200,
  "message": "Fetch success",
  "data": {
    "orders": {
      "created": [
        {
          "id": "uuid-1",
          "total": 150000,
          "items_snapshot": [{ "productId": "p1", "name": "Cà phê sữa", "quantity": 1 }],
          "payments_snapshot": [{ "method": "CASH", "amount": 150000 }]
        }
      ],
      "updated": [],
      "deleted": []
    }
  },
  "meta": { "timestamp": 1715137347 },
  "error": null
}
```

### 2.2 Push Changes (Push)

Đẩy dữ liệu thay đổi của Đơn hàng từ Local lên Server.

- **Method**: `POST`
- **Path**: `/api/v1/sync/orders`

#### Request Body (`PushChangesParams`)

| Trường           | Kiểu dữ liệu                                                      | Bắt buộc | Mô tả                                               |
| :--------------- | :---------------------------------------------------------------- | :------: | :-------------------------------------------------- |
| `changes`        | object                                                            |    Có    | Đối tượng chứa các thay đổi (`OrderSyncChanges`)    |
| `changes.orders` | `{ created: OrderRaw[], updated: OrderRaw[], deleted: string[] }` |    Có    | Các thay đổi của bảng orders                        |
| `last_pulled_at` | number                                                            |    Có    | Thời điểm Client thực hiện Pull trước khi Push (ms) |

**Ví dụ Request Body:**

```json
{
  "changes": {
    "orders": {
      "created": [
        {
          "id": "uuid-pos-001",
          "status": "COMPLETED",
          "items_snapshot": [...],
          "payments_snapshot": [...]
        }
      ],
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
  "message": "Sync success",
  "data": null,
  "meta": { "timestamp": 1715137347 },
  "error": null
}
```
