# Mô-đun Đối tác & Khách hàng (Partner & Affiliate)

Mô-đun quản lý thông tin đối tác lữ hành, hướng dẫn viên du lịch (Affiliate Partners), chính sách hoa hồng đoàn khách và thông tin xuất Hóa đơn điện tử VAT cho doanh nghiệp tại Bitexco SkyStore.

---

> ⚠️ **Đoạn Cảnh báo & Phân biệt:**
>
> - Mô-đun **Partner** phụ trách dữ liệu liên kết đối tác và xuất hóa đơn VAT, **KHÔNG trực tiếp phát hành hóa đơn điện tử** (việc phát hành hóa đơn do Backend E-Invoice Service xử lý sau khi nhận thông tin đơn hàng).

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- Spec Đối tác & Hóa đơn VAT: [docs/specs/0008-customer-partner-invoice.md](../../../docs/specs/0008-customer-partner-invoice.md)

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                          | Trách nhiệm                                            | Chạm Vào/Ra (I/O)                      |
| :--------------------------- | :----------------------------------------------------- | :------------------------------------- |
| `get-partners.ts`            | Lấy danh sách đối tác lữ hành từ máy chủ               | 🌐 REST API (`GET /v1/pos/partners`)   |
| `get-affiliates.ts`          | Lấy danh sách người tiếp thị liên kết / hướng dẫn viên | 🌐 REST API (`GET /v1/pos/affiliates`) |
| `fetch-partner-changes.ts`   | Đồng bộ biến động đối tác về local SQLite              | 🌐 REST API                            |
| `fetch-affiliate-changes.ts` | Đồng bộ biến động affiliate về local SQLite            | 🌐 REST API                            |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Gắn Mã đối tác vào Giỏ hàng:**
   - **Quyết định**: Thu ngân có thể chọn nhanh hướng dẫn viên hoặc công ty du lịch từ danh sách đã lưu cục bộ.
   - **Lý giải**: Hỗ trợ tính toán hoa hồng đoàn khách chính xác mà không làm chậm quy trình thanh toán tại quầy.
2. **Thu thập đầy đủ thông tin MST và Email:**
   - **Quyết định**: Form nhập thông tin xuất hóa đơn kiểm tra chặt chẽ cấu trúc MST và Email trước khi gửi checkout.
   - **Lý giải**: Tránh lỗi xuất sai hóa đơn VAT trên cổng hóa đơn điện tử của Bitexco.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

```bash
# Kiểm tra TypeScript strict mode
npm run check-type

# Kiểm tra Linter
npm run lint
```
