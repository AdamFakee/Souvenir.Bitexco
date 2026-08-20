## Note 22: Yêu cầu ưu tiên thứ tự kết quả tìm kiếm sản phẩm (`GET /v1/pos/search`)

- **Vấn đề:**
  1. **Thứ tự ưu tiên:** Khi tìm kiếm từ khóa (ví dụ: `buil`), API hiện tại chưa ưu tiên các sản phẩm bắt đầu bằng từ khóa đó lên đầu (ví dụ trả về `T-Shirt Old Building L` trước `Building Model`).
  2. **Trùng lặp dữ liệu phân trang (Duplicate items across pages):** Khi cuộn/tải dữ liệu tìm kiếm theo phân trang, đôi khi xuất hiện các item bị trùng lặp (item đã xuất hiện ở các trang/lần load trước vẫn tiếp tục xuất hiện ở các trang sau).

- **Yêu cầu Backend:**
  1. **Điều chỉnh thứ tự sắp xếp kết quả trả về trong API `/v1/pos/search`:**
     - **Ưu tiên 1 (Cao nhất):** Sản phẩm có Tên, SKU hoặc Barcode **bắt đầu bằng từ khóa tìm kiếm** (Ví dụ tìm `buil` -> `Building Model` nằm ở vị trí đầu tiên).
     - **Ưu tiên 2:** Sản phẩm có một **từ trong tên bắt đầu bằng từ khóa** (Ví dụ: `T-Shirt Old Building L`).
     - **Ưu tiên 3:** Sản phẩm chứa từ khóa ở các vị trí khác (Substring match).
  2. **Xử lý trùng lặp phân trang (Deterministic Sorting):** Đảm bảo thứ tự sắp xếp cố định và nhất quán giữa các trang (thêm tie-breaker order theo ID hoặc trường thông tin duy nhất, ví dụ: `ORDER BY match_priority DESC, id ASC`) để tránh hiện tượng item đã lấp ra ở trang trước bị lặp lại ở các trang sau.
