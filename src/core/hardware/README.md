# Mô-đun Trừu tượng hóa Phần cứng (Hardware Abstraction Layer - HAL)

Tầng lõi giao tiếp và điều khiển các thiết bị ngoại vi phần cứng của máy POS Android iMin: Máy in nhiệt 80mm tích hợp, Két đựng tiền tự động, Màn hình phụ tương tác khách hàng và Đầu đọc Barcode.

---

> ⚠️ **Đoạn Cảnh báo & Phân biệt:**
>
> - Mô-đun **Hardware** chỉ chịu trách nhiệm điều khiển thiết bị vật lý qua interface chuẩn, **TUYỆT ĐỐI KHÔNG chứa logic nghiệp vụ bán hàng hay state UI**.
> - UI Components **bắt buộc gọi qua `PrinterService` / `DeviceManager`**, cấm import trực tiếp Native Module SDK trong màn hình.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- Spec Phần cứng & HAL: [docs/specs/0005-hardware-hal-printer.md](../../../docs/specs/0005-hardware-hal-printer.md)
- Drivers: `src/core/hardware/drivers/`
- Adapters: `src/core/hardware/adapters/`

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                                 | Trách nhiệm                                               | Chạm Vào/Ra (I/O)  |
| :---------------------------------- | :-------------------------------------------------------- | :----------------- |
| `services/printer.service.ts`       | Service in ấn component React Native, in bitmap, cắt giấy | ⚠️ Hardware I/O    |
| `drivers/imin-printer.driver.ts`    | Driver kết nối iMin Printer Native Module trên Android    | ⚠️ Native Module   |
| `adapters/native-device.adapter.ts` | Adapter chạy thực tế trên máy Android iMin                | ⚠️ Native Module   |
| `adapters/mock-device.adapter.ts`   | Adapter giả lập cho môi trường Web / Simulator / Test     | ❌ Zero I/O (Mock) |
| `device-manager.ts`                 | Factory tự động chọn Adapter phù hợp theo nền tảng        | ❌ Logic thuần     |
| `store/use-connection-store.ts`     | Quản lý kết nối mạng (`NetInfo` + `/health`) & POS EDC    | 🌐 REST & NetInfo  |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **In bằng ViewShot Bitmap thay vì Text ESC/POS thuần:**
   - **Quyết định**: Render hóa đơn dạng React Native Component (`BitexcoReceiptTemplate`, `CloseShiftReceiptTemplate`), chụp ảnh bằng `react-native-view-shot` và gửi bitmap raster sang máy in.
   - **Lý giải**: Hỗ trợ 100% font tiếng Việt có dấu, logo vector SkyStore sắc nét và kiểm soát bố cục chính xác theo pixel mà không bị phụ thuộc vào bảng mã ký tự của máy in nhiệt.
2. **Két tiền tự động (Cash Drawer):**
   - **Quyết định**: Gửi lệnh mở két sau khi in hóa đơn tiền mặt hoặc khi cashier bấm nút "Mở két" trên Sidebar.
   - **Lý giải**: Đảm bảo an toàn tài chính, chỉ mở két khi có giao dịch hoặc thao tác có chủ đích của nhân viên.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

```bash
# Kiểm tra TypeScript strict mode
npm run check-type

# Kiểm tra Linter
npm run lint
```
