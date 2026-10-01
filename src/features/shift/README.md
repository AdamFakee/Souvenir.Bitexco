# Mô-đun Quản lý Ca làm việc (Shift Management)

Mô-đun quản lý vòng đời ca làm việc của thu ngân (`CashSession`), mở ca kiểm đếm tiền mặt đầu ca, chốt ca tự động khớp 100% doanh thu và in phiếu Báo cáo Z-Report.

---

> ⚠️ **Đoạn Cảnh báo & Phân biệt:**
>
> - Mô-đun **Shift** quản lý phiên thu ngân trên từng thiết bị POS (`posDeviceId`), **KHÔNG quản lý tài khoản nhân viên hay phân quyền** (thuộc `src/features/auth`).
> - Số tiền chốt ca được tính toán **tự động và cố định** (`actualEndingCash = expectedEndingCash`), không mở ô nhập tay cho cashier sửa tiền thực tế hay chọn lý do chênh lệch.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- Spec Kiến trúc: [docs/specs/0003-cash-session-shift.md](../../../docs/specs/0003-cash-session-shift.md)
- API Contract: [docs/api/shift.md](../../../docs/api/shift.md)
- Route Mở ca: `src/app/(auth)/open-shift.tsx`

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                                           | Trách nhiệm                                                                      | Chạm Vào/Ra (I/O) |
| :-------------------------------------------- | :------------------------------------------------------------------------------- | :---------------- |
| `machines/close-shift.machine.ts`             | Máy trạng thái XState điều phối kiểm tra mạng, outbox, 3 bước OCC và in Z-Report | ⚠️ State Machine  |
| `components/close-shift-modal.tsx`            | Modal UI xác nhận kết ca, hiển thị số tiền bàn giao theo design tokens           | ❌ Logic thuần UI |
| `components/close-shift-receipt-template.tsx` | Template hóa đơn in Báo cáo Z-Report                                             | ❌ Template in    |
| `api/remote/open-shift.ts`                    | Gọi API `POST /v1/cash-sessions` để mở ca                                        | 🌐 REST API       |
| `api/remote/close-shift.ts`                   | Gọi API `POST /v1/cash-sessions/{id}/transitions` thực hiện OCC                  | 🌐 REST API       |
| `api/remote/get-z-report.ts`                  | Gọi API `GET /v1/cash-sessions/{id}/z-report` lấy báo cáo kết ca                 | 🌐 REST API       |
| `api/remote/get-shift-statistics.ts`          | Lấy số liệu thống kê ca và số dư tiền mặt dự kiến                                | 🌐 REST API       |
| `api/remote/get-open-sessions.ts`             | Lấy danh sách ca đang mở của thiết bị POS                                        | 🌐 REST API       |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Tự động chốt tiền kết ca khớp 100% doanh thu:**
   - **Quyết định**: Gán `actualEndingCash = expectedEndingCash`, loại bỏ hoàn toàn ô nhập tiền kiểm đếm và danh sách lý do chênh lệch.
   - **Lý giải**: Nghiệp vụ quầy lưu niệm Bitexco yêu cầu số liệu tài chính trên hệ thống phải khớp chuẩn với doanh thu. Nếu thiếu hụt tiền lẻ ngoài thực tế, nhân viên tự bù bên ngoài.
2. **Design Tokens & Chuẩn màu sắc Modal:**
   - **Quyết định**: Sử dụng hệ thống token chuẩn (`bg-surface-50`, `bg-white`, `border-surface-200`, `text-surface-on`, `text-primary`), loại bỏ màu xanh chói hardcoded.
   - **Lý giải**: Đảm bảo tính nhất quán trên toàn bộ ứng dụng và bảo vệ thị giác nhân viên vận hành nhiều giờ.
3. **Bắt buộc Outbox sạch và có mạng trước khi đóng ca:**
   - **Quyết định**: Chặn nút đóng ca nếu `unsyncedCount > 0` hoặc thiết bị `offline`.
   - **Lý giải**: Đảm bảo toàn bộ đơn hàng offline đã được đẩy lên server để tính toán doanh thu và thuế Z-Report chính xác tuyệt đối.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

```bash
# Kiểm tra TypeScript strict mode
npm run check-type

# Kiểm tra Linter
npm run lint
```
