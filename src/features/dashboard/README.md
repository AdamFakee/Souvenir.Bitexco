# Mô-đun Báo cáo Doanh thu (Dashboard Overview)

Mô-đun hiển thị tổng quan hoạt động kinh doanh trong ca làm việc, cơ cấu doanh thu theo nhân viên / toàn bộ ca, biểu đồ phương thức thanh toán, sản phẩm bán chạy và thời gian vào ca.

---

> ⚠️ **Đoạn Cảnh báo & Phân biệt:**
>
> - Mô-đun **Dashboard** hiển thị số liệu thống kê realtime của ca hiện tại, **KHÔNG thực hiện nghiệp vụ thanh toán hay đóng ca**.
> - **Thời gian vào ca (`shiftStart`)**: Server trả về giờ UTC (ví dụ `"07:48"` hoặc chuỗi ISO). Client **bắt buộc dùng hàm `formatShiftStartDisplay()`** để bù múi giờ địa phương (`+7 tiếng` $\rightarrow$ `"14:48"`), tuyệt đối không render trực tiếp chuỗi thô của server.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- Spec Ca & Báo cáo: [docs/specs/0003-cash-session-shift.md](../../../docs/specs/0003-cash-session-shift.md)
- Hàm định dạng ngày giờ: `src/shared/utils/date-format.ts`
- Route Màn hình: `src/app/(tab)/dashboard.tsx`

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                                    | Trách nhiệm                                                           | Chạm Vào/Ra (I/O) |
| :------------------------------------- | :-------------------------------------------------------------------- | :---------------- |
| `components/info-bar.tsx`              | Thanh thông tin nhân viên, avatar và thời gian vào ca đã format GMT+7 | ❌ Logic thuần UI |
| `components/stats-cards.tsx`           | Các thẻ thống kê doanh thu, đơn hàng, sản phẩm đã bán                 | ❌ Logic thuần UI |
| `components/payment-methods-panel.tsx` | Bảng phân rã doanh thu theo từng phương thức (Tiền mặt, QR, Thẻ, Nợ)  | ❌ Logic thuần UI |
| `components/product-revenue-panel.tsx` | Bảng xếp hạng doanh thu theo từng mã sản phẩm lưu niệm                | ❌ Logic thuần UI |
| `components/dashboard-skeleton.tsx`    | Shimmer skeleton loading khi đang tải dữ liệu                         | ❌ Logic thuần UI |
| `api/remote/get-dashboard-overview.ts` | Gọi API `GET /v1/pos/dashboard/overview`                              | 🌐 REST API       |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Chuẩn hóa hiển thị thời gian vào ca (`shiftStart` GMT+7):**
   - **Quyết định**: Sử dụng `formatShiftStartDisplay(overview.shiftStart)`.
   - **Lý giải**: Backend trả về `"07:48"` theo giờ UTC (hoặc ISO UTC timestamp). Múi giờ Việt Nam là UTC+7 nên thời điểm thực tế là `14:48`. Hàm format tự động cộng 7 tiếng và định dạng sạch `HH:mm`.
2. **Lọc theo từng nhân viên hoặc toàn ca:**
   - **Quyết định**: Cho phép chọn nhân viên cụ thể từ `StaffSelect` hoặc chọn "Tất cả nhân viên" để xem tổng thể ca.
   - **Lý giải**: Hỗ trợ việc kiểm tra hiệu suất bán hàng của từng cá nhân thu ngân trong ca làm việc chung.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

```bash
# Kiểm tra TypeScript strict mode
npm run check-type

# Kiểm tra Linter
npm run lint
```
