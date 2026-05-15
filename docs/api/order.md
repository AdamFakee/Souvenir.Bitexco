# Order & Payment API

Tài liệu về cấu trúc dữ liệu và Endpoint đồng bộ Đơn hàng.

> **Lưu ý kiến trúc**: Order hoạt động theo mô hình **Push-Only** — Client tạo đơn offline, lưu WatermelonDB, rồi **đẩy lên server** khi có mạng.  
> Server **không đẩy ngược** dữ liệu đơn hàng xuống client (không có Pull).

---

## 1. Data Interfaces (Schema)

### 1.1 OrderRaw (Bảng orders)

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

### 2.1 Push Changes (Push) — Đồng bộ đơn hàng lên server

Đẩy các đơn hàng mới/cập nhật từ client lên server sau khi thu ngân bán hàng offline.

- **Method**: `POST`
- **Path**: `/api/v1/sync/orders`

#### Request Body

| Trường           | Kiểu dữ liệu                                                      | Bắt buộc | Mô tả                                               |
| :--------------- | :---------------------------------------------------------------- | :------: | :-------------------------------------------------- |
| `changes`        | object                                                            |    Có    | Đối tượng chứa các thay đổi                         |
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
          "shift_id": "shift-uuid",
          "staff_id": "staff-uuid",
          "status": "COMPLETED",
          "total": 150000,
          "items_snapshot": [
            { "productId": "p1", "name": "Cà phê sữa", "quantity": 1, "price": 150000 }
          ],
          "payments_snapshot": [{ "method": "CASH", "amount": 150000 }]
        }
      ],
      "updated": [],
      "deleted": []
    }
  },
  "last_pulled_at": 1715137347000
}
```

**Response:**

```json
{
  "success": true,
  "status_code": 200,
  "message": "Sync success",
  "data": null,
  "meta": { "timestamp": 1715137347000 },
  "error": null
}
```

> **Lưu ý cho Backend**: Khi nhận `orders.created`, thực hiện bulk insert/upsert. Dữ liệu chi tiết nằm trong `items_snapshot` và `payments_snapshot` dưới dạng JSON — backend có thể parse để lưu vào bảng riêng nếu cần.

---

> **Không có Pull endpoint cho Orders.** Server không đẩy ngược đơn hàng xuống client.
