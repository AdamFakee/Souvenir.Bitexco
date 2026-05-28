# BÁO CÁO BUG: LỖI KHÔNG TỰ ĐỘNG CẬP NHẬT TRẠNG THÁI ORDER KHI PAYMENT CAPTURED

**Ngày ghi nhận:** 28/05/2026  
**Người phát hiện:** Mobile POS Team  
**Mức độ nghiêm trọng:** Nghiêm trọng (Giao dịch quẹt thẻ thành công tiền đã trừ nhưng đơn hàng vẫn ở trạng thái Đang chờ)

---

## 1. TỔNG QUAN LỖI (SUMMARY)

- **Ngữ cảnh:** Giao dịch thanh toán quẹt thẻ di động qua máy POS EDC (Stand-alone/Atomic).
- **Hành vi thực tế:**
  1. Giao dịch quẹt thẻ thành công trên thiết bị ngân hàng.
  2. Máy POS gọi API ghi nhận thẻ (`/card-capture`) thành công.
  3. Máy POS điều khiển chuyển trạng thái thanh toán từ `INITIATED` ➔ `PROCESSING` ➔ `AUTHORIZED` ➔ `CAPTURED` hoàn toàn thành công trên Server (trạng thái Payment chuyển sang `CAPTURED`).
  4. **Lỗi:** Mặc dù **Payment** đã chuyển sang trạng thái cuối cùng là `CAPTURED` (đã thu tiền thành công), nhưng **Đơn hàng (Order)** liên quan vẫn giữ nguyên trạng thái cũ là `CONFIRMED` / `PENDING` chứ không tự động chuyển sang `FULFILLED` / `COMPLETED`.

- **Nguyên nhân gốc rễ đề xuất:**
  Hệ thống Backend thiếu trigger nghiệp vụ (business trigger) để tự động cập nhật trạng thái của Đơn hàng khi Payment liên đới đạt đến trạng thái `CAPTURED` (đã thu đủ tiền).

---

## 2. CHỨNG CỨ KỸ THUẬT (TECHNICAL EVIDENCE)

### A. Kết quả quẹt thẻ từ Máy EDC di động (Sunmi/Ingenico):

Giao dịch được Ngân hàng phê duyệt thành công rực rỡ:

```json
{
  "clientId": "",
  "command": "sale",
  "merTransId": "019e6cde-48eb-7018-add5-2e7cdfbd9be3", // Khớp 100% với Payment ID / Order ID
  "requestId": "",
  "status": "DONE",
  "statusCode": "0",
  "statusText": "DONE",
  "transInfo": {
    "STAN": "000556",
    "amount": "350000",
    "approvalCode": "313963",
    "batchNo": "000004",
    "cardInput": "M",
    "cardNo": "5151 XXXX XXXX 4768",
    "cardType": "MASTERCARD BIDV",
    "currencyCode": "704",
    "expireDate": "XX/XX",
    "mid": "000000925126645",
    "posSerial": "23C7MD412296",
    "receiptNo": "000381",
    "refNo": "614801081012",
    "returnCode": "00", // Giao dịch được duyệt thành công
    "tid": "01684838",
    "time": "20260528 113631",
    "transName": "THANH TOÁN",
    "transStatus": "APPROVE",
    "transType": "sale"
  },
  "version": "2.0.30"
}
```

### B. Tiến trình gọi API của Client sang Server:

Client thực thi 100% đúng chuẩn đặc tả thiết kế, được ghi nhận thành công từ log console:

```text
LOG  [PortablePayment] Card capture OK
      -> POST /v1/payments/019e6cde-48eb-7018-add5-2e7cdfbd9be3/card-capture - HTTP 200 OK

LOG  [PortablePayment] Payment → AUTHORIZED, version: 3
      -> POST /v1/payments/019e6cde-48eb-7018-add5-2e7cdfbd9be3/transitions { action: "authorize", expectedVersion: 2 } - HTTP 200 OK

LOG  [PortablePayment] Payment → CAPTURED, version: 4
      -> POST /v1/payments/019e6cde-48eb-7018-add5-2e7cdfbd9be3/transitions { action: "capture", expectedVersion: 3 } - HTTP 200 OK
```
