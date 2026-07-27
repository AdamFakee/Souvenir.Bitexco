---

## 1. Lỗi Auth & Trạng thái Phiên Làm Việc (Refresh Token Session Issue)

### Case 5: Làm mới Token làm mất liên kết phiên bán hàng (Session Linkage Loss)

- **API:** `POST /v1/device/auth/refresh`
- **Request Payload từ FE (Gửi Refresh Token để gia hạn phiên làm việc):**
  ```json
  {
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiIwMTlmNjUyOC03NmJlLTcyY2MtYTI2My0yOGZiMTljNzI0NDAiLCJleHAiOjE3MTcyOTYwMDB9..."
  }
  ```
- **Hành vi gặp lỗi (Real Behavior):**
  1. API `/v1/device/auth/refresh` phản hồi thành công (`200 OK`) kèm theo cặp `accessToken` và `refreshToken` mới.
  2. Tuy nhiên, cặp token mới này hoàn toàn bị tách rời khỏi session cũ. Backend không ánh xạ (map) token mới này tới:
     - Phiên bán hàng đang hoạt động của thiết bị (`cashSessionId`).
     - Thông tin phân quyền/ngữ cảnh thiết bị (device context) được thiết lập khi đăng nhập ban đầu.
  3. Khi FE sử dụng `accessToken` mới này để thực hiện các nghiệp vụ tiếp theo (như `POST /v1/pos/checkout` hoặc `POST /v1/cash-sessions/close`), Backend trả về lỗi `403 Forbidden` hoặc `401 Unauthorized` kèm thông báo *"Không tìm thấy ca làm việc hoạt động"* hoặc *"Thiết bị chưa được kích hoạt/cấu hình"*, mặc dù trước khi refresh thì ca làm việc và thiết bị vẫn hoạt động bình thường.

- **Kỳ vọng từ Backend (Expected Behavior):**
  - Khi thực hiện Refresh Token, Backend phải truy vấn thông tin session/device context được liên kết với `refreshToken` cũ.
  - Cặp `accessToken` và `refreshToken` mới sinh ra phải được tự động liên kết (link) sang cùng một session ID và ngữ cảnh thiết bị đó để đảm bảo quá trình làm việc của thu ngân diễn ra liên tục, không bị đứt gãy trạng thái đăng nhập hay mất ca bán hàng hiện tại.

---

## 2. Lỗi tính toán sai thuế / tổng tiền đơn hàng khi đồng bộ Offline (Offline Order Sync Tax Double Calculation Issue)

- **API:** `POST /v1/pos/sync/orders`
- **Request Payload từ FE (Gửi danh sách đơn hàng offline lên Server để đồng bộ):**

  ```json
  {
    "orders": [
      {
        "id": "71ef7d51-3446-4f09-a2c3-e7da1425672d",
        "shiftId": "019f9235-54e0-771e-bd82-8c11a4851115",
        "staffId": "e1000000-0000-0000-0000-000000000017",
        "status": "COMPLETED",
        "subTotal": 100000,
        "discount": 0,
        "voucherCode": null,
        "voucherDiscount": 0,
        "totalTax": 7407,
        "total": 100000,
        "note": null,
        "refundReason": null,
        "originalOrderId": null,
        "customerTaxInfo": null,
        "createdAt": "2026-07-24T09:45:28.507Z",
        "updatedAt": "2026-07-24T09:45:28.507Z",
        "itemsSnapshot": [
          {
            "productId": "019ef30d-0945-70fd-a2de-d5d32e2d6a5e",
            "sku": "2030102000054",
            "name": "Áo SKD xanh trời 3XL",
            "price": 100000,
            "quantity": 1,
            "subtotal": 100000,
            "taxRate": 8,
            "taxAmount": 7407,
            "discountAmount": 0
          }
        ],
        "paymentsSnapshot": [
          {
            "method": "CASH",
            "amount": 100000,
            "cashTendered": 100000,
            "cashChange": 0
          }
        ]
      }
    ]
  }
  ```

- **Hành vi gặp lỗi (Real Behavior):**
  - FE gửi lên đơn giá sản phẩm và tổng tiền là giá đã bao gồm thuế (ví dụ: `price: 100,000đ`, `subTotal: 100,000đ` với thuế `totalTax: 7,407đ` trích xuất bên trong).
  - Tuy nhiên, Backend của API đồng bộ đơn hàng offline lại tự động cộng thêm thuế lần nữa trên giá trị này (tính thành `100,000 * 1.08 = 108,000đ` tổng thanh toán), dẫn tới lệch dữ liệu và sai tổng tiền đơn hàng khi hiển thị/đối soát trên hệ thống.

- **Kỳ vọng từ Backend (Expected Behavior):**
  - Backend khi nhận đơn đồng bộ offline phải hoạt động giống hệt như API Checkout online (`POST /v1/pos/checkout`): trích xuất thuế VAT từ đơn giá đã bao gồm thuế được gửi lên, không được tự ý cộng thêm thuế chồng lên. Tổng tiền thanh toán (`total`) phải luôn bằng `subTotal - discount` đối với cấu hình sản phẩm giá đã bao gồm thuế (tax-inclusive).

---

## 3. Lỗi lọc sản phẩm đồng bộ theo thời gian (Sync Products Filtering Issue by lastSyncedAt)

- **API:** `GET /v1/pos/products/sync`
- **Request Parameters từ FE (Gửi yêu cầu đồng bộ sản phẩm thay đổi):**

  ```json
  {
    "lastSyncedAt": "2026-07-24T09:03:52.165Z",
    "page": 0,
    "limit": 200,
    "warehouseId": "c0000000-0000-0000-0000-000000000002"
  }
  ```

- **Hành vi gặp lỗi (Real Behavior):**
  - Khi FE gửi tham số `lastSyncedAt` (thời điểm đồng bộ lần cuối cục bộ của thiết bị), Backend không thực hiện lọc hoặc lọc không chính xác các sản phẩm đã thay đổi.
  - Kết quả là Backend trả về danh sách trống (`items: []`) mặc dù thực tế trên server có những sản phẩm vừa được cập nhật hoặc thêm mới (có `updatedAt` hoặc `createdAt` lớn hơn `lastSyncedAt`), làm cho thiết bị thu ngân không thể cập nhật thông tin sản phẩm mới nhất khi chạy đồng bộ incremental.

- **Kỳ vọng từ Backend (Expected Behavior):**
  - Backend cần so sánh thời điểm `lastSyncedAt` gửi lên với thuộc tính thời gian cập nhật/tạo của sản phẩm trên server (`updatedAt > lastSyncedAt` hoặc `createdAt > lastSyncedAt`).
  - Chỉ trả về các sản phẩm đã được thay đổi hoặc tạo mới kể từ thời điểm `lastSyncedAt` để giảm thiểu tải băng thông và cập nhật chính xác dữ liệu dưới client.

---

## 4. Lỗi chưa trừ tiền mặt trong ca làm việc khi hoàn trả/đổi trả đơn hàng thành công (Cash Shift/Session Deduction on Return Issue)

- **API:** `POST /v1/pos/orders/{id}/refund` và `GET /api/v1/shifts/:shiftId/statistics`

- **Hành vi gặp lỗi (Real Behavior):**
  - Đối với các đơn đổi trả thành công có liên quan đến hoàn trả tiền mặt (đơn gốc thanh toán bằng tiền mặt hoặc yêu cầu hoàn lại bằng tiền mặt), Backend xử lý tạo phiếu trả hàng thành công (`200 OK`) và tính toán đúng số tiền cần hoàn (`refundAmount`).
  - Tuy nhiên, hệ thống chưa tự động trừ số tiền mặt hoàn trả này vào quỹ tiền mặt của ca làm việc (`shift_id`) hiện tại. Khi gọi API `GET /api/v1/shifts/:shiftId/statistics` hoặc thực hiện đóng ca, số tiền mặt dự kiến cuối ca (`expectedEndingCash`) vẫn giữ nguyên như thể chưa có giao dịch hoàn tiền mặt nào xảy ra, dẫn đến chênh lệch giữa số tiền thực tế trong két và số tiền ghi nhận trên hệ thống.

- **Kỳ vọng từ Backend (Expected Behavior):**
  - Đối với các đơn đổi trả thành công có phương thức thanh toán hoàn trả bằng tiền mặt (cash refund), Backend phải tự động trừ số tiền hoàn trả (`refundAmount`) trực tiếp vào quỹ tiền mặt của ca làm việc đó (`expectedEndingCash`).

---

## 5. Lỗi API lấy danh sách nhân viên khi không truyền shiftId hoặc shiftId bằng undefined (Get Employees without shiftId Issue)

- **API:** `GET /v1/pos/employees`

- **Hành vi gặp lỗi (Real Behavior):**
  - Khi FE gọi API lấy danh sách toàn bộ nhân viên (không truyền tham số `shiftId` hoặc khi tham số này nhận giá trị `undefined`), Backend trả về danh sách rỗng (`[]`)
  - Hiện tại, điều này làm lỗi phần lọc "Tất cả nhân viên" trên giao diện **Đơn hàng** và **Báo cáo**.

- **Kỳ vọng từ Backend (Expected Behavior) & Định nghĩa Chi tiết API:**

  ### Request Parameters (Query)

  | Tham số   | Kiểu dữ liệu  | Bắt buộc | Mô tả                                                                                                                                                             |
  | :-------- | :------------ | :------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `shiftId` | string (UUID) |  Không   | Lọc nhân viên có phiên làm việc (ca) tương ứng. Nếu không truyền hoặc truyền `undefined`/`null`/`""` -> Mặc định trả về tất cả nhân viên.                         |
  | `status`  | string        |  Không   | Lọc theo trạng thái hoạt động: `active` hoặc `inactive` (hoặc dạng hoa `ACTIVE`/`INACTIVE`).                                                                      |
  | `isPos`   | boolean       |  Không   | `true` để chỉ lấy nhân viên có quyền truy cập và thực hiện bán hàng tại POS (ví dụ: Cashier, Store Manager). Tránh trả về các tài khoản Admin/HQ không liên quan. |

  ### Mẫu Request hợp lệ từ Client:

  `GET /v1/pos/employees?status=active&isPos=true`
