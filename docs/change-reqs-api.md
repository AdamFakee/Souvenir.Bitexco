## 10. `GET /v1/pos/orders` — Bổ sung thông tin phương thức thanh toán cho đơn hàng Công nợ (Đại lý) (TODO BACKEND)

> **[Vấn đề]**: Khi Đại lý mua hàng theo hình thức Công nợ, đơn hàng được hoàn thành nhưng chưa trả tiền ngay:
>
> - Số tiền đã thanh toán: `paidTotal: 0`
> - **Mảng thanh toán trống**: `paymentsSnapshot: []`
>
> Do mảng `paymentsSnapshot` rỗng và không có trường nào khai báo phương thức thanh toán, POS Frontend **bị thiếu thông tin** để hiển thị và lọc theo phương thức thanh toán `cong_no` (Công nợ).
>
> **[Yêu cầu bổ sung dữ liệu]**: API cần trả về thêm thông tin để Frontend nhận biết được đây là đơn Công nợ:

---
