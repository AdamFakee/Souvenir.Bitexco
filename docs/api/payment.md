# Payment & QR Code API

Tài liệu này mô tả luồng thanh toán trực tuyến (QR Code) và cách đồng bộ dữ liệu sau khi giao dịch thành công.

## 1. Data Structures (Response Objects)

### 1.1 CreateOrderResponse

| Trường    | Kiểu dữ liệu | Mô tả                                   |
| :-------- | :----------- | :-------------------------------------- |
| `orderId` | string       | ID đơn hàng tạm thời do Backend sinh ra |

### 1.2 GetQrResponse

| Trường       | Kiểu dữ liệu | Mô tả                                         |
| :----------- | :----------- | :-------------------------------------------- |
| `billNumber` | string       | Số hóa đơn đối soát                           |
| `qrContent`  | string       | Nội dung chuỗi để render mã QR (VietQR, v.v.) |

### 1.3 VerifyPaymentResponse

| Trường   | Kiểu dữ liệu | Mô tả                                 |
| :------- | :----------- | :------------------------------------ |
| `isPaid` | boolean      | Trạng thái đã nhận được tiền hay chưa |

### 1.4 OrderSyncDataResponse

Đối tượng trả về dữ liệu chuẩn để Client lưu vào database local sau khi thanh toán thành công. Cấu trúc các bảng con (`order`, `orderItems`, `payments`) bám sát theo Schema trong [Order API](order.md).

---

## 2. API Endpoints

### 2.1 Create Temporary Order

Khởi tạo đơn hàng trên server để lấy ID thanh toán.

- **Method**: `POST`
- **Path**: `/api/v1/payments/create-order`

#### Request Body

| Trường        | Kiểu dữ liệu | Bắt buộc | Mô tả                             |
| :------------ | :----------- | :------: | :-------------------------------- |
| `items`       | CartItem[]   |    Có    | Danh sách sản phẩm trong giỏ hàng |
| `total`       | number       |    Có    | Tổng tiền cuối cùng               |
| `discount`    | number       |    Có    | Số tiền chiết khấu                |
| `voucherCode` | string       |  Không   | Mã voucher áp dụng                |
| `staffId`     | string       |    Có    | ID nhân viên thực hiện            |
| `shiftId`     | string       |    Có    | ID ca làm việc hiện tại           |

---

### 2.2 Get QR Code

Lấy nội dung mã QR dựa vào ID đơn hàng vừa tạo.

- **Method**: `GET`
- **Path**: `/api/v1/payments/qr-code/{orderId}`

#### Response (`IBaseResponse<GetQrResponse>`)

```json
{
  "success": true,
  "data": {
    "billNumber": "BILL_1715137347",
    "qrContent": "00020101021238540010A000000727..."
  }
}
```

---

### 2.3 Verify Transaction (Polling)

Client sẽ gọi API này định kỳ (ví dụ mỗi 2 giây) để kiểm tra trạng thái thanh toán.

- **Method**: `GET`
- **Path**: `/api/v1/payments/verify/{orderId}`

#### Response (`IBaseResponse<VerifyPaymentResponse>`)

```json
{
  "success": true,
  "data": {
    "isPaid": true // Trả về true khi Backend xác nhận đã nhận tiền
  }
}
```

---

### 2.4 Get Order Sync Data

Sau khi `isPaid` trả về `true`, Client gọi API này để lấy toàn bộ dữ liệu đơn hàng chuẩn (đã được server đánh số, tính thuế, v.v.) để lưu vào Local DB.

- **Method**: `GET`
- **Path**: `/api/v1/payments/sync-data/{orderId}`

#### Response (`IBaseResponse<OrderSyncDataResponse>`)

Dữ liệu trả về bao gồm 3 phần tương ứng với 3 bảng trong Database Local:

```json
{
  "success": true,
  "data": {
    "order": { "id": "...", "status": "COMPLETED", "...": "..." },
    "orderItems": [{ "...": "..." }],
    "payments": [{ "method": "BANK_TRANSFER", "...": "..." }]
  }
}
```
