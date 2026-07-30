## Note 12: Bổ sung trường công nợ còn lại (remaining credit/debt) trong thông tin Đối tác (API `/v1/pos/partners`)

> **[Yêu cầu mới]**: Khi truy vấn thông tin Đối tác qua API `GET /v1/pos/partners`, Backend cần bổ sinh thêm trường thông tin biểu thị hạn mức công nợ còn lại (công nợ còn lại) của đối tác đó.

### Chi tiết yêu cầu:

- **Mô tả:** Đối với mỗi đối tác (Partner) có quyền sử dụng công nợ (`allowCredit = true`), ngoài việc trả về hạn mức công nợ tối đa (`creditLimit`), Backend cần tính toán và bổ sung thêm trường `remainingCredit` biểu thị số tiền hạn mức công nợ còn lại đối tác được phép ghi nợ (Hạn mức tối đa - Công nợ hiện tại).
- **API cần bổ sung:** `GET /v1/pos/partners`.

---

## Note 13: Bổ sung trường tên sản phẩm tiếng Anh (English product name) trong các API trả về dữ liệu sản phẩm (Sync, Lookup, List,...)

> **[Yêu cầu mới]**: Đối với các API lấy hoặc đồng bộ dữ liệu sản phẩm về Client, Backend cần bổ sung thêm trường tên sản phẩm bằng tiếng Anh `nameEn`.

### Chi tiết yêu cầu:

- **Mô tả:** tất cả các API trả về thông tin sản phẩm cần cung cấp thêm thuộc tính tên sản phẩm bằng tiếng Anh.
- **Các API cần áp dụng:**
  - API đồng bộ sản phẩm: `GET /v1/pos/products/sync`
  - API tra cứu sản phẩm bằng barcode/SKU: `GET /v1/pos/lookup`
  - API tìm kiếm sản phẩm: `GET /v1/pos/search`
