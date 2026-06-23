# Change Requests — API Backend

**Ngày**: 22/06/2026
**Trạng thái**: Chờ Backend triển khai

---

## 1. `GET /v1/pos/orders` — Thêm query param `staff_id`

| Tham số    | Kiểu   | Bắt buộc | Mô tả                                           |
| :--------- | :----- | :------: | :---------------------------------------------- |
| `staff_id` | string |  Không   | **Mới** — UUID nhân viên. Không gửi = tất cả NV |

FE đã gửi param này. Chọn "Tất cả nhân viên" → không gửi `staff_id`.

---

## 2. `GET /v1/pos/employees` — API mới

Lấy danh sách nhân viên cho select "Nhân viên" ở màn Orders và Dashboard.

### Query Parameters

| Tham số   | Kiểu   | Bắt buộc | Mô tả                                                                         |
| :-------- | :----- | :------: | :---------------------------------------------------------------------------- |
| `shiftId` | string |  Không   | UUID của ca. Nếu có → chỉ trả nhân viên trong ca đó. Không có → toàn cửa hàng |

### Response

```json
{
  "data": [
    {
      "id": "staff-uuid",
      "displayName": "Nguyễn Văn A",
      "email": "nva@example.com",
      "status": "active"
    }
  ]
}
```

| Trường        | Kiểu   | Mô tả                      |
| :------------ | :----- | :------------------------- |
| `id`          | string | UUID nhân viên             |
| `displayName` | string | Tên hiển thị               |
| `email`       | string | Email                      |
| `status`      | string | `"active"` \| `"inactive"` |

### Cách FE gửi

```
GET /v1/pos/employees                           → toàn bộ nhân viên cửa hàng (màn Orders)
GET /v1/pos/employees?shiftId=shift-uuid-001    → chỉ nhân viên trong ca (màn Dashboard)
```

### Ghi chú

- FE dùng `id` để gửi vào `staff_id` của API `/v1/pos/orders`
- Mặc định select chọn nhân viên ca hiện tại
- Option "Tất cả nhân viên" → không gửi `staff_id`
- Chỉ hiển thị nhân viên có `status: "active"`

---

## 3. Dashboard API — Fix doanh thu: gồm QR + Card, tính sau VAT

### 3a. `GET /v1/dashboard/overview` — Sửa `totalRevenue` và thêm param `staffId`

**Method:** `GET`
**Path:** `/v1/dashboard/overview`

#### Query Parameters

| Tham số   | Kiểu   | Bắt buộc | Mô tả                                                            |
| :-------- | :----- | :------: | :--------------------------------------------------------------- |
| `shiftId` | string |    Có    | UUID của ca làm việc                                             |
| `staffId` | string |  Không   | **Mới** — UUID nhân viên. Không gửi = toàn bộ nhân viên trong ca |

#### Response hiện tại (FE đang nhận)

```json
{
  "employeeName": "Nguyễn Văn A",
  "employeeCode": "NV001",
  "shiftTime": "Ca sáng",
  "shiftStart": "08:00",
  "totalRevenue": 12300000,
  "completedOrders": 42,
  "totalProductsSold": 150,
  "cancelledOrders": 2,
  "paymentMethods": [
    { "name": "Tiền mặt", "value": 10000000 },
    { "name": "QR BIDV", "value": 2000000 }
  ]
}
```

#### Vấn đề cần sửa

1. **`totalRevenue` thiếu card**: hiện chỉ = tiền mặt, hoặc cash + QR, bỏ sót doanh thu từ thẻ (card)
2. **`totalRevenue` tính trước thuế**: hiện có thể tính theo `subtotal` (trước VAT), cần tính theo `total` (sau VAT)

#### Yêu cầu

| Trường           | Yêu cầu                                                                                      |
| :--------------- | :------------------------------------------------------------------------------------------- |
| `totalRevenue`   | Tổng `total` (đã gồm VAT) của tất cả đơn `COMPLETED`, không phân biệt phương thức thanh toán |
| `paymentMethods` | Phải có đủ các phương thức có giao dịch: Tiền mặt, QR, Thẻ. Mỗi `value` là số tiền đã thu    |
| `totalRevenue`   | Phải bằng `sum(paymentMethods[].value)`                                                      |

**Cách kiểm tra:** `totalRevenue` = `sum(paymentMethods[].value)`

#### Ghi chú về `staffId`

- Khi FE gửi `staffId`, backend chỉ tính overview cho đơn hàng của nhân viên đó
- Khi không gửi `staffId`, backend tính cho toàn bộ ca
- FE mặc định gửi `staffId` của nhân viên đang đăng nhập

---

### 3b. `GET /v1/dashboard/product-revenue` — Thêm field `totalItems`, `totalRevenue` và param `staffId`

**Method:** `GET`
**Path:** `/v1/dashboard/product-revenue`

#### Query Parameters

| Tham số   | Kiểu   | Bắt buộc | Mô tả                                                            |
| :-------- | :----- | :------: | :--------------------------------------------------------------- |
| `shiftId` | string |    Có    | UUID của ca làm việc                                             |
| `page`    | number |  Không   | Số trang (mặc định: 0)                                           |
| `limit`   | number |  Không   | Số bản ghi mỗi trang (mặc định: 10)                              |
| `staffId` | string |  Không   | **Mới** — UUID nhân viên. Không gửi = toàn bộ nhân viên trong ca |

#### Response hiện tại (FE đang nhận)

```json
{
  "items": [
    { "name": "Cà phê sữa", "qty": 10, "price": 45000, "total": 450000 },
    { "name": "Trà đào", "qty": 5, "price": 55000, "total": 275000 }
  ],
  "totalCount": 2,
  "page": 0,
  "pageSize": 10
}
```

#### Vấn đề cần sửa

1. **Thiếu field tổng**: response không có `totalItems` và `totalRevenue`, FE phải tự tính từ `items` đã phân trang
2. **`ProductRevenueItem.total` chưa gồm VAT**: có thể = `price * qty` (trước thuế), cần là doanh thu thực tế đã thu

#### Yêu cầu thêm field mới

| Field mới      | Kiểu   | Mô tả                                                                                            |
| :------------- | :----- | :----------------------------------------------------------------------------------------------- |
| `totalItems`   | number | Tổng số lượng sản phẩm đã bán (sum `qty`), không phân trang                                      |
| `totalRevenue` | number | Tổng doanh thu tất cả sản phẩm (đã gồm VAT, gồm tất cả phương thức thanh toán), không phân trang |

#### Response mong muốn sau khi sửa

```json
{
  "items": [
    { "name": "Cà phê sữa", "qty": 10, "price": 45000, "total": 450000 },
    { "name": "Trà đào", "qty": 5, "price": 55000, "total": 275000 }
  ],
  "totalCount": 2,
  "page": 0,
  "pageSize": 10,
  "totalItems": 15,
  "totalRevenue": 725000
}
```

#### Chi tiết từng field trong `items[]`

| Trường  | Kiểu   | Mô tả                                                                  |
| :------ | :----- | :--------------------------------------------------------------------- |
| `name`  | string | Tên sản phẩm                                                           |
| `qty`   | number | Số lượng đã bán                                                        |
| `price` | number | Đơn giá (có thể là giá trước hoặc sau thuế, FE chỉ hiển thị tham khảo) |
| `total` | number | **Doanh thu thực tế** của sản phẩm đó: đã gồm VAT, đã trừ discount     |

#### Ghi chú

- `totalItems` = tổng `qty` của **tất cả** items thỏa filter (không bị giới hạn bởi phân trang)
- `totalRevenue` = tổng `total` của **tất cả** items (đã gồm VAT, không phân trang, không phân biệt payment method)
- `ProductRevenueItem.total` không được tính đơn thuần bằng `price * qty`, mà phải là số tiền thực tế khách trả cho sản phẩm đó (sau VAT, sau discount)
- Khi FE gửi `staffId`, backend chỉ tính cho đơn hàng của nhân viên đó
- Khi không gửi `staffId`, backend tính cho toàn bộ ca

**Cách kiểm tra:** `totalRevenue` trong response này phải ≤ `totalRevenue` của `/v1/dashboard/overview` (vì overview có thể bao gồm thêm phí khác ngoài sản phẩm)

---

## 4. `GET /v1/cash-sessions/{id}/z-report` — Thêm `staffs`

### Mô tả

Khi kết ca, FE cần in bill kết ca. Nếu trong ca có nhiều hơn 1 nhân viên cùng hoạt động, bill phải hiển thị doanh thu chi tiết **từng nhân viên**: tên, mã NV, số đơn, cash, QR, card, tổng.

### Hiện trạng `ZReportResponse`

```ts
interface ZReportResponse {
  session: CashSession
  posDeviceName: string
  posDeviceCode: string
  warehouseName: string
  warehouseCode: string
  orderCount: number
  refundCount: number
  paymentBreakdown: {
    // ← tổng cả ca, không tách theo NV
    method: string
    amount: number
  }[]
}
```

### Yêu cầu thêm field

| Field mới | Kiểu  | Mô tả                                              |
| :-------- | :---- | :------------------------------------------------- |
| `staffs`  | array | Danh sách nhân viên có đơn trong ca, kèm doanh thu |

### Chi tiết `staffs[]`

| Trường         | Kiểu   | Mô tả                                                            |
| :------------- | :----- | :--------------------------------------------------------------- |
| `staffId`      | string | UUID nhân viên                                                   |
| `staffName`    | string | Tên hiển thị                                                     |
| `staffCode`    | string | Mã nhân viên                                                     |
| `orderCount`   | number | Số đơn hàng đã tạo trong ca                                      |
| `cashAmount`   | number | Tổng tiền mặt nhân viên này đã thu                               |
| `qrAmount`     | number | Tổng QR nhân viên này đã thu                                     |
| `cardAmount`   | number | Tổng thẻ nhân viên này đã thu                                    |
| `totalRevenue` | number | Tổng doanh thu = cashAmount + qrAmount + cardAmount (đã gồm VAT) |

### Response mong muốn

```json
{
  "session": {
    "id": "...",
    "code": "SHIFT-001",
    "state": "CLOSED",
    "openedAt": "...",
    "closedAt": "..."
  },
  "posDeviceName": "POS Quầy 1",
  "posDeviceCode": "POS-001",
  "warehouseName": "Kho Bitexco",
  "warehouseCode": "WH-001",
  "orderCount": 47,
  "refundCount": 3,
  "payments": [
    { "method": "cash", "amount": 9300000 },
    { "method": "qr_bidv", "amount": 4000000 },
    { "method": "card_bidv", "amount": 6300000 }
  ],
  "staffs": [
    {
      "staffId": "staff-uuid-001",
      "staffName": "Nguyễn Văn A",
      "staffCode": "NV001",
      "orderCount": 25,
      "cashAmount": 5200000,
      "qrAmount": 1800000,
      "cardAmount": 3500000,
      "totalRevenue": 10500000
    },
    {
      "staffId": "staff-uuid-002",
      "staffName": "Trần Thị B",
      "staffCode": "NV002",
      "orderCount": 22,
      "cashAmount": 4100000,
      "qrAmount": 2200000,
      "cardAmount": 2800000,
      "totalRevenue": 9100000
    }
  ]
}
```
