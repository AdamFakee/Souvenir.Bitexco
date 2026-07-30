## 7. Lỗi Backend không cập nhật `updatedAt` của sản phẩm khi cập nhật tồn kho lúc checkout (Product `updatedAt` not updated on inventory/stock update during checkout)

- **Hành vi gặp lỗi (Real Behavior):**
  - Khi checkout thành công, backend thực hiện trừ/cập nhật số lượng tồn kho của sản phẩm (hoặc variant).
  - Tuy nhiên, backend không cập nhật trường `updatedAt` (hoặc `updated_at`) của sản phẩm/variant đó.
  - Điều này dẫn đến việc khi client (thiết bị POS) gọi API đồng bộ sản phẩm (`GET /v1/pos/products/sync` với tham số `lastSyncedAt`), backend không trả về các sản phẩm đã thay đổi tồn kho này (do `updatedAt` không lớn hơn `lastSyncedAt`), khiến cho client không đồng bộ được số lượng tồn kho mới nhất về thiết bị.

- **Kỳ vọng từ Backend (Expected Behavior):**
  - Khi cập nhật số lượng tồn kho của bất kỳ sản phẩm hoặc variant nào trong quá trình checkout (hoặc các luồng thay đổi kho khác), backend cần cập nhật trường `updatedAt` (hoặc `updated_at`) tương ứng của sản phẩm/variant đó về thời gian hiện tại để đảm bảo luồng sync sản phẩm về thiết bị hoạt động chính xác.

---

---

## 8. Lỗi quản lý ca làm việc (Shift/Session) tách rời khỏi thiết bị

- **Hành vi gặp lỗi (Real Behavior):**
  - Hiện tại, ca làm việc (`shift` / `cashSession`) đang bị tách rời khỏi thiết bị POS cụ thể (không ràng buộc chặt chẽ với deviceId).

- **Kỳ vọng từ Backend (Expected Behavior):**
  - **Ràng buộc thiết bị:** Ca làm việc (`shift` / `cashSession`) khi được tạo hoặc truy vấn cần phải đi kèm và ràng buộc chặt chẽ với thiết bị POS (`deviceId`). Tránh việc một tài khoản có thể mở ca chéo thiết bị hoặc không xác định được ca đó thuộc thiết bị nào.
