# Voucher API

Tài liệu mô tả API xác thực mã giảm giá (Voucher) trực tiếp từ Server.

## 1. Data Structures (Interfaces)

### 1.1 VerifyVoucherPayload (Request)

| Trường     | Kiểu dữ liệu | Bắt buộc | Mô tả                                 |
| :--------- | :----------- | :------: | :------------------------------------ |
| `code`     | string       |    Có    | Mã giảm giá khách hàng nhập           |
| `subtotal` | number       |    Có    | Tổng tiền đơn hàng trước khi giảm giá |

### 1.2 VerifyVoucherResponse (Response)

Dữ liệu trả về khi mã hợp lệ.

| Trường                 | Kiểu dữ liệu | Mô tả                                                                             |
| :--------------------- | :----------- | :-------------------------------------------------------------------------------- |
| `code`                 | string       | Mã giảm giá đã được chuẩn hóa                                                     |
| `percent`              | number       | Phần trăm giảm giá (từ 0 - 100)                                                   |
| `maxDiscountAmount`    | number       | Số tiền giảm tối đa cho phép (Optional)                                           |
| `applicableProductIds` | string[]     | Danh sách ID sản phẩm được phép áp dụng voucher này (Nếu rỗng là áp dụng toàn bộ) |

---

## 2. API Endpoints

### 2.1 Verify Voucher

Kiểm tra tính hợp lệ và lấy thông tin chiết khấu của Voucher.

- **Method**: `POST`
- **Path**: `/api/v1/vouchers/verify`

#### Request Body (`VerifyVoucherPayload`)

```json
{
  "code": "KM20",
  "subtotal": 500000
}
```

#### Response Data (`IBaseResponse<VerifyVoucherResponse>`)

**Trường hợp hợp lệ:**

```json
{
  "success": true,
  "status_code": 200,
  "data": {
    "code": "KM20",
    "percent": 20,
    "maxDiscountAmount": 50000,
    "applicableProductIds": ["prod_1", "prod_2"]
  },
  "meta": { "timestamp": 1715137347 },
  "error": null
}
```

**Trường hợp không hợp lệ:**

```json
{
  "success": false,
  "status_code": 400,
  "data": null,
  "meta": { "timestamp": 1715137347 },
  "error": {
    "code": "VOUCHER_INVALID",
    "message": "Mã giảm giá không hợp lệ hoặc đã hết hạn"
  }
}
```
