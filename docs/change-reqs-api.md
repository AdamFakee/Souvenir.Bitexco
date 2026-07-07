## 6. `GET /v1/pos/orders` — Các tham số lọc nâng cao & Response chi tiết cho POS

### Mô tả

Để hỗ trợ hiển thị danh sách đơn hàng cho CTV và Đại lý trên POS, API lấy danh sách đơn hàng cần bổ sung các tham số bộ lọc nâng cao và trả về thông tin chi tiết đối tác/CTV đi kèm trong mỗi đơn hàng.

### Request Query Parameters - Chưa implement các params này

Bổ sung các tham số lọc sau:

| Tham số          | Kiểu          | Bắt buộc | Mô tả                                                                                       |
| :--------------- | :------------ | :------: | :------------------------------------------------------------------------------------------ |
| `staff_id`       | string (UUID) |  Không   | Lọc theo ID nhân viên tạo đơn                                                               |
| `affiliate_id`   | string (UUID) |  Không   | Lọc theo ID Hướng dẫn viên / CTV                                                            |
| `partner_id`     | string (UUID) |  Không   | Lọc theo ID Đại lý                                                                          |
| `agent_type`     | string        |  Không   | Loại đối tượng: `"collaborator"` hoặc `"agent"`. Dùng khi lọc tất cả CTV hoặc tất cả Đại lý |
| `payment_method` | string        |  Không   | Lọc theo phương thức thanh toán (`"cash"` / `"qr_bidv"` / `"card_bidv"` / `"cong_no"`)      |

**Quy tắc lọc:**

- **Lọc theo một CTV cụ thể**: Client gửi `affiliate_id`.
- **Lọc theo một Đại lý cụ thể**: Client gửi `partner_id`.
- **Lọc tất cả đơn hàng thuộc CTV**: Client không gửi `affiliate_id`, gửi `agent_type=collaborator`.
- **Lọc tất cả đơn hàng thuộc Đại lý**: Client không gửi `partner_id`, gửi `agent_type=agent`.

### Response Body

Bổ sung các trường thông tin đối tượng đi kèm trong mỗi phần tử đơn hàng:

```json
{
  "agentType": "collaborator", // hoặc "agent", "retail"
  "affiliateId": "019eb2e7-...", // hoặc null
  "partnerId": null, // hoặc null
  "affiliate": {
    "id": "019eb2e7-...",
    "code": "CTV-101",
    "name": "Nguyễn Thị Mai",
    "phone": "0901234101"
  },
  "partner": null
}
```

Mỗi đối tượng Đại lý trong danh sách nếu có `partner` sẽ có dạng:

```json
"partner": {
  "id": "019eb2e7-...",
  "code": "DL-101",
  "nameVi": "Đại lý Bitexco",
  "nameEn": "Bitexco Agent",
  "companyName": "Công ty TNHH Bitexco",
  "taxId": "0102030405",
  "address": "Bitexco Tower, Quận 1, TP. HCM",
  "representative": "Nguyễn Văn A",
  "phone": "0987654321",
  "email": "agent@bitexco.com"
}
```

---

## 9. `GET /v1/pos/reconciliation` — Báo lỗi & Yêu cầu chỉnh sửa từ POS (TODO BACKEND)

> **[TODO - BACKEND]**: API đối soát hiện tại đang bị 2 lỗi nghiêm trọng khiến POS không thể lấy dữ liệu chính xác:
> data trả về không chính xác
