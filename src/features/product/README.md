# Mô-đun Quản lý Danh mục & Sản phẩm (Product Catalog & Sync)

Mô-đun quản lý danh mục hàng hóa lưu niệm, đồng bộ dữ liệu Delta Sync, lập chỉ mục tìm kiếm và tra cứu mã vạch tức thì trên thiết bị POS SkyStore.

---

> ⚠️ **Đoạn Cảnh báo & Phân biệt:**
>
> - Mô-đun **Product** chỉ quản lý dữ liệu sản phẩm, giá bán, tồn kho và danh mục, **KHÔNG xử lý đơn hàng hay thanh toán**.
> - Tìm kiếm sản phẩm ưu tiên query trên SQLite cục bộ (WatermelonDB) để đạt tốc độ phản hồi < 10ms.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- Spec Danh mục & Đồng bộ: [docs/specs/0007-product-catalog-sync.md](../../../docs/specs/0007-product-catalog-sync.md)

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                                   | Trách nhiệm                                             | Chạm Vào/Ra (I/O)                           |
| :------------------------------------ | :------------------------------------------------------ | :------------------------------------------ |
| `api/remote/fetch-product-changes.ts` | Tải dữ liệu biến động danh mục Delta Sync từ server     | 🌐 REST API (`GET /v1/pos/products/sync`)   |
| `api/remote/lookup-product.ts`        | Tra cứu sản phẩm theo barcode / SKU trực tiếp từ server | 🌐 REST API (`GET /v1/pos/products/lookup`) |
| `api/remote/search-products.ts`       | Tìm kiếm sản phẩm từ server khi cần tra cứu mở rộng     | 🌐 REST API (`GET /v1/pos/products/search`) |
| `api/remote/list-category-by-sku.ts`  | Lấy danh mục sản phẩm theo SKU                          | 🌐 REST API                                 |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Delta Sync theo Timestamp:**
   - **Quyết định**: Chỉ tải các sản phẩm có `updatedAt > since`.
   - **Lý giải**: Tiết kiệm băng thông, tăng tốc độ nạp dữ liệu khi mở app và giảm tải cho máy chủ WMS.
2. **Offline-first Product Indexing:**
   - **Quyết định**: Lưu trữ toàn bộ bảng sản phẩm trong WatermelonDB với index trên cột `barcode` và `sku`.
   - **Lý giải**: Cho phép nhân viên quét mã vạch và tìm kiếm sản phẩm liên tục ngay cả khi mất kết nối mạng.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

```bash
# Kiểm tra TypeScript strict mode
npm run check-type

# Kiểm tra Linter
npm run lint
```
