# Bổ sung API: Trả hàng / Hoàn tiền đơn hàng

Tài liệu này bổ sung endpoint trả hàng/hoàn tiền cho máy POS. Luồng FE có thể hiển thị các bước tạo yêu cầu, nhập kho hàng trả, hoàn tiền và hoàn tất, nhưng backend hiện xử lý bằng **một endpoint atomic online**.

---

## 1. Trả hàng / Hoàn tiền đơn hàng

> **Luồng hoạt động:** Thu ngân chọn một hoặc nhiều sản phẩm trong đơn gốc, nhập số lượng cần trả cho từng sản phẩm, sau đó POS gửi một request online để backend validate, nhập lại tồn kho và trả về dữ liệu in phiếu trả hàng. **Tiền hoàn thực tế do thu ngân tự xử lý trực tiếp với khách tại quầy; hệ thống chỉ ghi nhận số tiền cần hoàn và dữ liệu phiếu trả hàng, không cần xử lý nghiệp vụ chi tiền/settlement.**

- **Endpoint:** `POST /v1/pos/orders/{id}/refund`
- **Xác thực:** Yêu cầu `Authorization: Bearer <accessToken>` (Device JWT)
- **Quyền hạn (Permission):** `pos:refund`
- **Yêu cầu online:** Bắt buộc có mạng; FE không tạo phiếu trả hàng offline và không tự mutate tồn kho/local payment.

### Path Parameters

| Tham số | Kiểu dữ liệu | Bắt buộc | Mô tả                              |
| ------- | ------------ | -------- | ---------------------------------- |
| `id`    | string       | Có       | UUID của đơn hàng gốc cần trả hàng |

### Request Body

```json
{
  "idempotencyKey": "client-generated-uuid",
  "reason": "Sản phẩm lỗi",
  "shift_id": "uuid-ca-lam-viec",
  "staff_id": "uuid-nhan-vien",
  "lines": [
    {
      "productId": "uuid-san-pham-1",
      "qty": 2
    },
    {
      "productId": "uuid-san-pham-2",
      "qty": 1
    }
  ]
}
```

### Body Fields

| Trường           | Kiểu dữ liệu | Bắt buộc | Mô tả                                                                                                            |
| ---------------- | ------------ | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `idempotencyKey` | string       | Có       | UUID do FE sinh cho mỗi lần bấm xác nhận trả hàng, dùng để backend chống duplicate khi POS retry/mạng chập chờn. |
| `reason`         | string       | Không    | Lý do trả hàng. Có thể là chuỗi rỗng nếu thu ngân không nhập lý do.                                              |
| `shift_id`       | string       | Có       | UUID ca làm việc/cash session hiện tại.                                                                          |
| `staff_id`       | string       | Có       | UUID nhân viên thực hiện trả hàng.                                                                               |
| `lines`          | array        | Có       | Danh sách sản phẩm và số lượng cần trả. Phải có ít nhất 1 dòng hợp lệ.                                           |
| `productId`      | string       | Có       | UUID sản phẩm trong đơn gốc.                                                                                     |
| `qty`            | number       | Có       | Số lượng trả của sản phẩm. Phải `> 0` và không vượt số lượng còn trả.                                            |

---

## 2. Business Rules

| Mã   | Rule                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------ |
| BR01 | Chỉ được trả hàng với đơn hàng đã thanh toán thành công.                                                                       |
| BR02 | Chỉ được trả các sản phẩm tồn tại trong đơn hàng gốc.                                                                          |
| BR03 | Số lượng trả không được vượt quá số lượng đã mua trừ số lượng đã trả trước đó.                                                 |
| BR04 | Backend là nguồn dữ liệu chính để đối chiếu phiếu trả hàng và đơn hàng gốc.                                                    |
| BR05 | Người dùng phải chọn ít nhất 1 sản phẩm để trả hàng.                                                                           |
| BR06 | Số lượng trả của mỗi dòng phải lớn hơn 0.                                                                                      |
| BR07 | Giá trị hoàn trả tính theo giá thực tế trên đơn hàng gốc, sau giảm giá nếu có.                                                 |
| BR08 | Sau khi trả hàng thành công, backend cập nhật lại tồn kho của sản phẩm được trả.                                               |
| BR09 | Tiền hoàn thực tế do thu ngân tự xử lý trực tiếp; backend không cần xử lý chi tiền/settlement.                                 |
| BR10 | Một đơn hàng có thể phát sinh nhiều lần trả hàng cho đến khi trả hết số lượng đã mua.                                          |
| BR11 | Không cho phép trả hàng với đơn hàng đã bị hủy hoặc trạng thái không hợp lệ.                                                   |
| BR12 | Không cho phép chỉnh sửa phiếu trả hàng sau khi backend đã hoàn tất xử lý.                                                     |
| BR13 | Backend ghi nhận người thực hiện, thời gian và số tiền cần hoàn.                                                               |
| BR14 | Backend deduplicate request theo `idempotencyKey` trong TTL ngắn, đề xuất 5 phút, để tránh tạo 2 phiếu trả hàng khi POS retry. |

---

## 3. Quy tắc làm tròn tiền hoàn

Số tiền hoàn áp dụng quy tắc làm tròn tiền mặt Việt Nam, giống POS đang dùng cho thanh toán tiền mặt:

- Làm tròn đến hàng nghìn.
- Dưới 500đ: làm tròn xuống.
- Từ 500đ trở lên: làm tròn lên.

Ví dụ:

| Giá trị tính toán | Giá trị hoàn sau làm tròn |
| ----------------- | ------------------------- |
| `10_400`          | `10_000`                  |
| `10_500`          | `11_000`                  |
| `125_499`         | `125_000`                 |
| `125_500`         | `126_000`                 |

> FE chỉ hiển thị tạm tính theo cùng quy tắc. Giá trị authoritative vẫn là `refundAmount` backend trả về.

### Phạm vi xử lý tiền hoàn

- Backend chỉ cần tính/ghi nhận `refundAmount` và trả dữ liệu để FE hiển thị/in phiếu.
- Việc đưa tiền hoàn thực tế cho khách do thu ngân tự xử lý trực tiếp tại quầy.
- Không yêu cầu backend tạo settlement/transaction chi tiền thật với ngân hàng/cổng thanh toán cho flow này.

---

## 4. Định dạng Response

> Không có global envelope wrapper. Response body là raw JSON của object — **không** có `{ success, data }` bọc ngoài.

### Success — Object đơn (200 OK)

Backend trả trực tiếp data mới sau khi refund thành công. Data cần đánh dấu món nào hoàn và món nào không hoàn để FE in phiếu trả hàng.

```json
{
  "returnId": "uuid-phieu-tra-hang",
  "returnCode": "RTN-20260602-001",
  "orderId": "uuid-don-goc",
  "orderCode": "SO-20260602-001",
  "refundAmount": 126000,
  "status": "COMPLETED",
  "receipt": {
    "orderId": "uuid-don-goc",
    "orderCode": "SO-20260602-001",
    "returnId": "uuid-phieu-tra-hang",
    "returnCode": "RTN-20260602-001",
    "reason": "Sản phẩm lỗi",
    "refundedAt": "2026-06-02T10:30:00Z",
    "refundAmount": 126000,
    "lines": [
      {
        "productId": "uuid-san-pham-1",
        "sku": "SP-001",
        "name": "Cà phê sữa đá",
        "orderedQty": 4,
        "returnedQty": 2,
        "remainingQty": 2,
        "unitPrice": 63000,
        "lineRefundAmount": 126000,
        "isReturned": true
      },
      {
        "productId": "uuid-san-pham-2",
        "sku": "SP-002",
        "name": "Trà đào",
        "orderedQty": 1,
        "returnedQty": 0,
        "remainingQty": 1,
        "unitPrice": 45000,
        "lineRefundAmount": 0,
        "isReturned": false
      }
    ]
  }
}
```

### Response Fields

| Trường         | Kiểu dữ liệu | Mô tả                                                                           |
| -------------- | ------------ | ------------------------------------------------------------------------------- |
| `returnId`     | string       | UUID phiếu trả hàng/hoàn tiền.                                                  |
| `returnCode`   | string       | Mã phiếu trả hàng human-readable để hiển thị/in bill, ví dụ `RTN-20260602-001`. |
| `orderId`      | string       | UUID đơn hàng gốc.                                                              |
| `orderCode`    | string       | Mã đơn hàng gốc hiển thị/in bill.                                               |
| `refundAmount` | number       | Tổng số tiền hoàn sau làm tròn.                                                 |
| `status`       | string       | Trạng thái xử lý trả hàng, thường là `COMPLETED` khi endpoint thành công.       |
| `receipt`      | object       | Dữ liệu in phiếu trả hàng.                                                      |

### Receipt Line Fields

| Trường             | Kiểu dữ liệu | Mô tả                                                                                                                                                                                                     |
| ------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `productId`        | string       | UUID sản phẩm.                                                                                                                                                                                            |
| `sku`              | string       | SKU sản phẩm.                                                                                                                                                                                             |
| `name`             | string       | Tên sản phẩm.                                                                                                                                                                                             |
| `orderedQty`       | number       | Số lượng đã mua trong đơn gốc.                                                                                                                                                                            |
| `returnedQty`      | number       | Số lượng hoàn trong lần xử lý này.                                                                                                                                                                        |
| `remainingQty`     | number       | Số lượng còn có thể trả sau lần xử lý này, tính theo công thức `orderedQty - totalReturnedQtyAcrossAllReturns`. Đây là số lượng còn lại sau khi đã cộng tất cả các lần trả hàng trước đó và lần hiện tại. |
| `unitPrice`        | number       | Đơn giá dùng để in bill/tham chiếu.                                                                                                                                                                       |
| `lineRefundAmount` | number       | Số tiền hoàn của dòng này.                                                                                                                                                                                |
| `isReturned`       | boolean      | `true` nếu dòng này có hoàn trong lần này, ngược lại `false`.                                                                                                                                             |

---

## 5. Error Response

### Business lỗi (400 / 409)

```json
{ "error": "order.return_quantity_exceeded" }
```

Ví dụ server error:

```json
{ "error": "Internal server error", "traceId": "trace-uuid" }
```

---

## 6. Ghi chú tích hợp FE

1. FE gửi đúng các dòng được chọn; không gửi dòng có `qty = 0`.
2. FE hỗ trợ chọn tất cả, chọn một sản phẩm, hoặc chọn một sản phẩm với số lượng `2`, `3`, `4`, ...
3. FE reset state/machine mỗi lần mở và đóng modal trả hàng để tránh dính dữ liệu cũ.
4. FE không tự cập nhật tồn kho, payment snapshot hoặc order status sau khi gọi API.
5. FE chỉ hiển thị số tiền cần hoàn; tiền hoàn thực tế do thu ngân tự xử lý trực tiếp với khách.
6. FE dùng `receipt.lines` backend trả về để in phiếu trả hàng, vì backend đã đánh dấu item hoàn/không hoàn và số lượng còn lại.
7. Nếu `reason` rỗng, FE không in dòng lý do trên phiếu trả hàng.
