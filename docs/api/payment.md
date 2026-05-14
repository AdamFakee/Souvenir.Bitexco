# Payment & QR Code API

Tài liệu này mô tả luồng thanh toán trực tuyến (QR Code) theo kiến trúc **Local-First**. Đơn hàng được khởi tạo và quản lý trạng thái chủ yếu tại thiết kế POS local trước khi đồng bộ lên Server.

## 1. Data Structures (Response Objects)

### 1.1 GetQrResponse

| Trường       | Kiểu dữ liệu | Mô tả                                         |
| :----------- | :----------- | :-------------------------------------------- |
| `billNumber` | string       | Số hóa đơn đối soát                           |
| `qrContent`  | string       | Nội dung chuỗi để render mã QR (VietQR, v.v.) |

### 1.2 VerifyPaymentResponse

| Trường   | Kiểu dữ liệu | Mô tả                                        |
| :------- | :----------- | :------------------------------------------- |
| `isPaid` | boolean      | Trạng thái xác nhận Server đã nhận được tiền |

---

## 2. API Endpoints

### 2.1 Get QR Code

Lấy nội dung mã QR dựa vào ID đơn hàng Local.

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

### 2.2 Verify Transaction (Polling)

Client sẽ gọi API này định kỳ (mỗi 2-5 giây) để kiểm tra trạng thái thanh toán từ cổng thanh toán/ngân hàng.

- **Method**: `GET`
- **Path**: `/api/v1/payments/verify/{orderId}`

#### Response (`IBaseResponse<VerifyPaymentResponse>`)

```json
{
  "success": true,
  "data": {
    "isPaid": true
  }
}
```

---

## 3. Luồng thanh toán (Sequence)

1. **Local Create**: Client tạo bản ghi đơn hàng trong WatermelonDB với trạng thái `PENDING`.
2. **Request QR**: Gọi `getQrCode` truyền vào ID đơn hàng local.
3. **Polling**: Hiển thị QR và gọi `verifyPaymentTransaction` liên tục.
4. **Local Complete**: Khi `isPaid` là `true`, Client cập nhật đơn hàng local sang `COMPLETED`, trừ kho và lưu thông tin thanh toán.
5. **Background Sync**: Client kích hoạt lệnh đồng bộ (`SyncService.performSync`) để đẩy dữ liệu vừa cập nhật lên Server ngay lập tức.
