# Báo cáo Lỗi Tính toán Checkout API (Backend)

Đội ngũ phát triển POS gửi thông tin lỗi tính toán trên Backend khi thực hiện checkout có áp dụng Voucher và VAT.

---

## 1. Tóm tắt các lỗi chính của Backend

1. **Lỗi giảm giá 2 lần (Double Discount):**
   - **Mô tả:** Backend tự động cộng dồn cả `discountAmount` (truyền trong từng dòng sản phẩm `lines`) và `voucherDiscount`/`voucherCode` (ở cấp độ root payload) vào tổng giảm giá `discountTotal`.
   - **Hệ quả:** Khách hàng được giảm gấp đôi số tiền voucher (Ví dụ: voucher 12,000 VND -> Backend giảm 24,000 VND).

2. **Lỗi tính VAT theo đơn giá gồm thuế (Tax-inclusive) thay vì trước thuế (Tax-exclusive):**
   - **Mô tả:** Theo công thức quy chuẩn của POS:
     - `giá_net = giá_trước_thuế - (giá_trước_thuế × %voucher)`
     - `tiền_VAT = giá_net × %VAT`
     - `thành_tiền = giá_net + tiền_VAT`
     - _Với đơn giá trước thuế là 100,000 VND, voucher 12% (12,000 VND), VAT 8%: giá net = 88,000 VND; VAT = 7,040 VND; thành tiền = 95,040 VND._
   - **Backend tính sai:** Backend coi đơn giá 100,000 VND đã bao gồm VAT nên quy đổi ngược:
     - `giá_sau_giảm_gồm_thuế = 100,000 - 12,000 = 88,000`
     - `giá_net_trước_thuế = 88,000 / 1.08 = 81,481`
     - `taxTotal (VAT) = 81,481 × 8% = 6,519`
     - `subTotal` (Tổng trước thuế trước giảm giá) = `81,481 + 12,000 = 93,481`
   - **Hệ quả:** Tính sai lệch toàn bộ `subTotal`, `taxTotal` và `grandTotal`.

3. **Lỗi tự ý thay đổi số tiền thanh toán của các cổng thanh toán QR/Thẻ (QR/Card Payment Amount):**
   - **Mô tả:** Khi FE gửi yêu cầu thanh toán qua QR (`qr_bidv`) hoặc Thẻ (`card_bidv`) với số tiền khớp đúng với hóa đơn là `95,040` VND. Do Backend tính sai `grandTotal` thành `76,000` VND, Backend tự ý ghi đè số tiền giao dịch của cổng thanh toán xuống `76,000` VND trong phản hồi trả về.
   - **Hệ quả:** Máy POS hoặc mã QR hiển thị sai số tiền thanh toán (thực tế khách phải trả 95,040 VND nhưng chỉ thu của khách 76,000 VND).

---

## 2. Chi tiết Log & Dữ liệu Đối chiếu (Thực tế vs Kỳ vọng)

### Case 1: Thanh toán Tiền mặt (Cash Checkout)

- **API:** `POST /v1/pos/checkout`
- **Request Payload từ FE (Gửi đúng số tiền khách trả 95,000 VND cho đơn giá 100,000 VND trước thuế, giảm 12,000 VND, VAT 8% = 95,040 VND):**
  ```json
  {
    "cashSessionId": "019f6528-76be-72cc-a263-28fb19c72440",
    "lines": [
      {
        "variantId": "019ef30c-fc08-7d47-926f-81f3653c4deb",
        "qty": 1,
        "unitPrice": 100000,
        "discountAmount": 12000,
        "taxRate": 8
      }
    ],
    "payments": [
      {
        "method": "cash",
        "amount": 95000
      }
    ],
    "voucherCode": "XXXXXXXXXX"
  }
  ```
- **Response thực tế từ Backend (Sai):**
  ```json
  {
    "subTotal": 93481, // SAI (Kỳ vọng: 100,000)
    "discountTotal": 24000, // SAI - Bị nhân đôi (Kỳ vọng: 12,000)
    "taxTotal": 6519, // SAI (Kỳ vọng: 7,040)
    "grandTotal": 76000, // SAI (Kỳ vọng: 95,040)
    "change": 19000, // SAI - Trả lại thừa do grandTotal sai (Kỳ vọng: 0)
    "voucherDiscount": 12000
  }
  ```

---

### Case 2: Thanh toán QR (QR BIDV Checkout)

- **API:** `POST /v1/pos/checkout`
- **Request Payload từ FE (Yêu cầu thanh toán QR đúng số tiền 95,040 VND):**
  ```json
  {
    "lines": [
      {
        "variantId": "019ef30c-fc08-7d47-926f-81f3653c4deb",
        "qty": 1,
        "unitPrice": 100000,
        "discountAmount": 12000,
        "taxRate": 8
      }
    ],
    "payments": [
      {
        "method": "qr_bidv",
        "amount": 95040
      }
    ],
    "voucherCode": "XXXXXXXXXX"
  }
  ```
- **Response thực tế từ Backend (Sai):**
  ```json
  {
    "grandTotal": 76000,
    "payments": [
      {
        "method": "qr_bidv",
        "amount": 76000, // SAI - Tự ý giảm số tiền QR từ 95,040 xuống 76,000
        "state": "INITIATED"
      }
    ]
  }
  ```

---

### Case 3: Thanh toán Thẻ di động (Portable Card Checkout)

- **API:** `POST /v1/pos/checkout`
- **Request Payload từ FE (Yêu cầu thanh toán thẻ đúng số tiền 95,040 VND):**
  ```json
  {
    "lines": [
      {
        "variantId": "019ef30c-fc08-7d47-926f-81f3653c4deb",
        "qty": 1,
        "unitPrice": 100000,
        "discountAmount": 12000,
        "taxRate": 8
      }
    ],
    "payments": [
      {
        "method": "card_bidv",
        "amount": 95040
      }
    ],
    "voucherCode": "XXXXXXXXXX"
  }
  ```
- **Response thực tế từ Backend (Sai):**
  ```json
  {
    "grandTotal": 76000,
    "payments": [
      {
        "method": "card_bidv",
        "amount": 76000, // SAI - Tự ý giảm số tiền yêu cầu quẹt thẻ xuống 76,000
        "state": "INITIATED"
      }
    ]
  }
  ```

---

### Case 4: Thanh toán Hỗn hợp (Mix Payment - Cash + QR)

- **API:** `POST /v1/pos/checkout`
- **Request Payload từ FE (Khách trả 10,000 VND tiền mặt + quẹt QR 85,040 VND):**
  ```json
  {
    "lines": [
      {
        "variantId": "019ef30c-fc08-7d47-926f-81f3653c4deb",
        "qty": 1,
        "unitPrice": 100000,
        "discountAmount": 12000,
        "taxRate": 8
      }
    ],
    "payments": [
      {
        "method": "cash",
        "amount": 10000
      },
      {
        "method": "qr_bidv",
        "amount": 85040
      }
    ],
    "voucherCode": "XXXXXXXXXX"
  }
  ```
- **Response thực tế từ Backend (Sai):**
  ```json
  {
    "grandTotal": 76000,
    "payments": [
      {
        "method": "cash",
        "amount": 10000,
        "state": "CAPTURED"
      },
      {
        "method": "qr_bidv",
        "amount": 66000, // SAI - Tự ý giảm số tiền quẹt QR xuống 66,000 (76,000 - 10,000)
        "state": "INITIATED"
      }
    ]
  }
  ```
