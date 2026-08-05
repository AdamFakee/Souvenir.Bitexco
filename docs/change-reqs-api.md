## Note 19: Báo cáo - Tên sản phẩm trong danh sách phải là tiếng Anh

> **[Yêu cầu mới]**: Trong các báo cáo (cụ thể là `GET /v1/pos/dashboard/product-revenue` ), đối với danh sách sản phẩm, tên sản phẩm phải được xuất hoặc hiển thị bằng tiếng Anh.

## Note 20: API Danh sách đơn hàng - Đánh dấu và cập nhật trạng thái đơn đổi hàng

> **[Yêu cầu mới]**: Đối với API lấy danh sách đơn hàng (`GET /v1/pos/orders`), Backend cần bổ sung/chỉnh sửa:
>
> - Đổi trạng thái (`status`) của các đơn đổi hàng thành `EXCHANGE`.
> - Hỗ trợ lọc danh sách các đơn đổi hàng thông qua tham số truy vấn (query param) `?status=EXCHANGE`.
> - Trong response trả về, thêm một trường dữ liệu (ví dụ: `isExchange: true`) để đánh dấu xác định rõ đơn đó là đơn đổi hàng.
> - Chỉ trả về các đơn là đơn đổi hàng (exchange), đơn hoàn thành ( completed ), đơn hoàn hàng ( refund, partial refund )
> - Không trả về các đơn có trạng thái khác
> - Đối với params state = completed hay tương tự thì chỉ trả những đơn đã hoàn thành, đơn thành công ( k trả đơn đổi hàng ,đỏi hủy hàng, trả hàng)

## Note 21: API Đối soát hoa hồng - Tính toán doanh thu và đơn hàng

> **[Yêu cầu mới]**: Đối với API Đối soát hoa hồng (`GET /v1/pos/reconciliation`), Backend cần điều chỉnh lại logic tính toán (tổng đơn hàng, tổng doanh thu, hoa hồng):
>
> - Chỉ tính doanh thu/hoa hồng cho các đơn hàng đã hoàn thành (`COMPLETED`) hoặc đơn đổi hàng (`EXCHANGE`).
> - KHÔNG tính các đơn hàng đã hủy (`CANCELLED`).
> - Đối với đơn đổi hàng (exchange), không được tính lặp lại (ví dụ: không tính doanh thu/số lượng của cả đơn gốc và đơn đổi vào báo cáo, tránh trùng lặp 2 lần).
>
> **Các tham số (params) truyền lên API**:
>
> - `partnerId`: ID đối tác (tuỳ chọn)
> - `affiliateId`: ID cộng tác viên (tuỳ chọn)
> - `dateFrom`: Ngày bắt đầu (ISO format)
> - `dateTo`: Ngày kết thúc (ISO format)

## Note 22: API Tìm kiếm sản phẩm - Bỏ tìm kiếm theo tên Tiếng Việt (nameVi)

> **[Yêu cầu mới]**: Đối với API Tìm kiếm sản phẩm (`GET /v1/pos/search`), Backend cần:
>
> - Bỏ logic tìm kiếm theo trường `nameVi` (tên Tiếng Việt).
> - Chỉ tìm kiếm theo các trường tên Tiếng Anh (`nameEn`), barcode, SKU hoặc các trường khác đã thoả thuận.

## Note 23: Thêm Cộng tác viên (Affiliate) / Đối tác cho Checkout Offline

> **[Yêu cầu mới]**: Khách hàng yêu cầu bổ sung tính năng chọn Cộng tác viên (CTV) / Đối tác khi thanh toán offline (tương tự như checkout online). Backend cần:
>
> **API Checkout (Đồng bộ đơn hàng offline từ App lên Server):**
>
> - Bổ sung thêm 2 field `partner_id` và `affiliate_id` vào payload của API đồng bộ đơn hàng offline hiện tại (`POST /v1/pos/orders/sync`).
> - Backend khi nhận được cần tự động ghi nhận đơn hàng và tính hoa hồng cho Đối tác / CTV tương tự như luồng checkout online.
>
> **Chi tiết Interface `OrderRaw` gửi lên (mảng các object này):**
>
> ```typescript
> export interface OrderRaw {
>   id: string
>   shift_id: string
>   staff_id: string
>   status: string
>   subtotal: number
>   discount: number
>   voucher_code?: string | null
>   voucher_discount: number
>   total: number
>   total_tax: number
>   note?: string | null
>   refund_reason?: string | null
>   original_order_id?: string | null
>   customer_tax_info: object | null
>   items_snapshot: []
>   payments_snapshot: []
>   is_deleted: boolean
>   created_at: number
>   updated_at: number
>
>   // [MỚI BỔ SUNG]
>   partner_id?: string | null // id đối tác
>   affiliate_id?: string | null // id ctv
> }
> ```
