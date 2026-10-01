# Mô-đun Bán hàng Quầy POS (POS Sales & Cart)

Mô-đun giao diện chính bán hàng tại quầy SkyStore: Quét barcode sản phẩm, tìm kiếm sản phẩm, quản lý phiên giỏ hàng, áp mã giảm giá và kích hoạt bảng thanh toán.

---

> ⚠️ **Đoạn Cảnh báo & Phân biệt:**
>
> - Mô-đun **POS** chỉ quản lý giỏ hàng tại quầy và điều hướng sang luồng thanh toán (`src/features/payment`), **KHÔNG trực tiếp gọi API thanh toán ngân hàng**.
> - Bắt buộc phải có ca làm việc (`cashSessionId !== null`) mới cho phép bán hàng.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- Spec Bán hàng: [docs/specs/0001-pos-checkout-sales.md](../../../docs/specs/0001-pos-checkout-sales.md)
- Route Màn hình Bán hàng: `src/app/(tab)/pos.tsx`

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                                 | Trách nhiệm                                                                      | Chạm Vào/Ra (I/O)  |
| :---------------------------------- | :------------------------------------------------------------------------------- | :----------------- |
| `components/order-list-session.tsx` | Hiển thị danh sách món trong giỏ hàng, nút tăng giảm số lượng, xóa món           | ❌ Logic thuần UI  |
| `components/checkout-panel.tsx`     | Bảng tổng kết tiền tạm tính, VAT, voucher và các nút chọn phương thức thanh toán | ❌ Logic thuần UI  |
| `hooks/use-scan-lookup.ts`          | Hook nhận diện sự kiện quét barcode phần cứng và tự động add vào giỏ             | ⚠️ Hardware Event  |
| `store/use-pos-store.ts`            | Zustand store quản lý state giỏ hàng, danh sách món, voucher                     | ❌ In-memory Store |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Quét Barcode liên tục không gây lag UI:**
   - **Quyết định**: Sử dụng debounce và tối ưu hóa React state batching khi quét liên tiếp nhiều mã barcode.
   - **Lý giải**: Tăng tốc độ phục vụ khách hàng vào các khung giờ cao điểm tham quan Bitexco Tower.
2. **Đồng bộ realtime với Customer Vice Screen:**
   - **Quyết định**: Mỗi thay đổi giỏ hàng đều gửi lệnh cập nhật lên màn hình phụ hướng về khách hàng.
   - **Lý giải**: Minh bạch đơn hàng và giúp khách hàng chuẩn bị trước phương thức thanh toán.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

```bash
# Kiểm tra TypeScript strict mode
npm run check-type

# Kiểm tra Linter
npm run lint
```
