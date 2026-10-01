# AGENTS.md - Quy tắc và Hướng dẫn cho AI Agent

Tệp này chứa các chỉ dẫn quan trọng mà các AI Agent (Antigravity, Gemini, Claude, Cursor, Codex, v.v.) sẽ **đọc đầu tiên** khi làm việc trong dự án **Mobile POS Bán hàng Lưu niệm — Bitexco SkyStore (`Souvenir.Bitexco`)**.

---

## 📖 Tài liệu Kiến trúc & Đọc Docs trước khi Code (Mandatory Docs Reading)

- **Quy tắc đọc Docs bắt buộc**: Trước khi làm bất kỳ tính năng mới hoặc chỉnh sửa/refactor feature cũ, Agent **BẮT BUỘC phải đọc thư mục `docs/` trước tiên**, đặc biệt là:
  - [ARCHITECTURE_PROPOSAL_PRODUCTION.md](./docs/ARCHITECTURE_PROPOSAL_PRODUCTION.md) — Kiến trúc 4 lớp, Deep Engines, HAL.
  - các tài liệu đặc tả trong `docs/specs/` (ví dụ `0001-auth-device-activation.md`, `0010-rfid-locate-geiger.md`).
- **Kích hoạt Skill `grill-me` để Thảo luận (Interactive Interview)**: Với các tính năng mới, nâng cấp hay sửa đổi có mâu thuẫn/quyết định kiến trúc chưa rõ ràng, Agent **tùy từng trường hợp phải tự động kích hoạt skill `grill-me` (`grilling`)** để phỏng vấn và thống nhất cây thiết kế (Design Tree) với người dùng trước khi tiến hành code.

---

## 📚 Chuẩn Mực Tài Liệu 3 Tầng (3-Tier Documentation Framework)

Mọi tài liệu trong dự án được tổ chức chặt chẽ theo 3 nhóm phân cấp rõ ràng:

```
[Nhóm 1: Module README] (Cục bộ tại thư mục mã nguồn: src/features/<feature>/README.md, src/core/<module>/README.md)
       │
       ▼
[Nhóm 2: Kế hoạch & Runbook] (Triển khai & nghiệm thu trên máy thật: docs/specs/ hoặc docs/plans/)
       │
       ▼
[Nhóm 3: Đặc tả Kiến trúc & ADR] (Toàn cục: docs/ARCHITECTURE_PROPOSAL_PRODUCTION.md, docs/specs/*.md, docs/usecase-v3.md)
```

### 🏷️ Nhóm 1: README của từng Mô-đun (Module README)

- **Vị trí**: Đặt trực tiếp tại thư mục chứa code (VD: `src/features/locate/README.md`, `src/core/hardware/README.md`).
- **Mục đích**: Hướng dẫn nhà phát triển và AI Agent nắm bắt nhanh chức năng, danh mục tệp, các quyết định thiết kế cốt lõi và cách chạy kiểm thử mà không cần đọc tràn lan.
- **Bố cục tiêu chuẩn bắt buộc**:
  1. `# <Tên_Mô_Đun>`: Tên mô-đun kèm 1 câu mô tả ngắn gọn chức năng lõi.
  2. `⚠️ Đoạn Cảnh báo & Phân biệt`: Làm rõ điểm khác biệt của mô-đun này với các mô-đun khác để tránh hiểu nhầm khi tích hợp (VD: _Locate chỉ khóa 1 EPC để đo RSSI, KHÔNG quét hàng loạt như Inventory_).
  3. `Danh sách Tham chiếu (Reference Links)`: Đường dẫn tương đối tới các file spec, API docs, hoặc route liên quan.
  4. `## 1. Đang có gì (Bảng danh mục tệp)`: Bảng Markdown 3 cột (**Tệp | Trách nhiệm | Chạm Vào/Ra (I/O)**). Phân biệt rõ ràng:
     - ❌ **Logic thuần**: Chạy unit test độc lập 100%, zero I/O (`utils/*.ts`, `calculator.ts`).
     - ⚠️/🌐 **Chạm Vào/Ra (I/O)**: Gọi phần cứng (`use-locate-session.ts`, native adapters), gọi mạng REST API (`api/*.ts`), hoặc đọc ghi SQLite.
  5. `## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)`: Liệt kê các quyết định kiến trúc quan trọng (dải đo chuẩn hóa, thuật toán lọc EMA, chu kỳ decay, tần số âm thanh...) kèm lý giải kỹ thuật đằng sau (tại sao chọn con số đó, rủi ro nếu thay đổi).
  6. `## 3. Hướng dẫn kiểm thử & Chạy lệnh`: Các lệnh thực thi kiểm tra (`npx jest ...`, `npx tsc --noEmit`, `npm run lint`).

---

### 📋 Nhóm 2: Tài liệu Kế hoạch Triển khai & Kỹ thuật (Execution Plan & Hardware Runbook)

- **Vị trí**: `docs/specs/*-runbook.md` hoặc `docs/plans/*.md`.
- **Mục đích**: Hướng dẫn quy trình từng bước (Step-by-step) để cài đặt, đo đạc và nghiệm thu trên phần cứng thật (Chainway C5 / C72 / Android POS).
- **Bố cục tiêu chuẩn bắt buộc**:
  1. `Phần Đầu trang (Header Metadata)`:
     - `- **Thời gian tạo (Created)**: YYYY-MM-DD HH:mm:ss (GMT+7)`
     - `- **Cập nhật lần cuối (Last Updated)**: YYYY-MM-DD HH:mm:ss (GMT+7)`
     - `- **Trạng thái**: ĐÃ HOÀN THÀNH / ĐANG THỰC HIỆN`
     - `- **Thiết bị mục tiêu**: Chainway C5 (Android)`
  2. `## 1. Mục tiêu`: Đặt vấn đề và 3-4 mục tiêu chính cần đạt trong đợt triển khai.
  3. `## 2. Hiện trạng mã nguồn & Đã xử lý`: Tóm tắt trạng thái code TypeScript, native module, và các lỗi đã xử lý.
  4. `## 3. Hướng dẫn thực thi từng bước (Step-by-Step)`: Chia làm các tiểu mục (`### 3.1 Bước 1`, `### 3.2 Bước 2`...). Mỗi bước cung cấp:
     - Lệnh chạy hoặc thao tác vật lý trên đầu đọc cầm tay.
     - **Tiêu chí đạt (Acceptance Criteria)**: Kết quả cụ thể để xác nhận bước đó thành công.
  5. `## 4. Danh mục Kiểm tra nhanh (Checklist)`: Danh sách ô tích (`- [x]` hoặc `- [ ]`) giúp người vận hành/QA rà soát đầy đủ trước khi bàn giao.

---

### 🏛️ Nhóm 3: Tài liệu Đặc tả Kiến trúc Hệ thống & Design Rationale (Architecture Spec & ADR)

- **Vị trí**: `docs/specs/*.md`, `docs/ARCHITECTURE_PROPOSAL_PRODUCTION.md`, `docs/usecase-v3.md`, `docs/WAREHOUSE-API-DOCS.MD`.
- **Mục đích**: Quy định luồng dữ liệu, ranh giới trách nhiệm giữa các phân lớp, lược đồ cơ sở dữ liệu WatermelonDB / API Contracts, và lý giải tường tận lý do thiết kế.
- **Bố cục tiêu chuẩn bắt buộc**:
  1. `Phần Ranh giới Trách nhiệm (Scope & Boundaries)`: Tuyên bố rõ mô-đun **LÀM GÌ** và **KHÔNG LÀM GÌ** để giữ kiến trúc 4 lớp sạch sẽ (VD: _Hardware Adapter chỉ bắn sự kiện thô, KHÔNG quản lý state UI_).
  2. `## 1. Đường ống & Luồng dữ liệu (Sơ đồ Mermaid Pipeline / Sequence / FSM)`: Sơ đồ trực quan biểu diễn luồng dữ liệu hoặc chuyển trạng thái.
  3. `## 2. Bảng Cấu trúc Dữ liệu & API Payloads`: Chi tiết Schema, TypeScript Types, trường dữ liệu và ý nghĩa.
  4. `## 3. Giải trình Lý do Thiết kế (Design Rationale / HOW & WHY)`: Trả lời các câu hỏi kỹ thuật hóc búa:
     - _"Vì sao dùng phương án A thay vì B?"_
     - _"Cái giá phải trả (Trade-offs) là gì?"_
     - _"Rủi ro nếu vi phạm hoặc tự ý thay đổi là gì?"_

---

## 📌 Tổng quan & Công nghệ (Tech Stack)

- **Tên dự án**: Mobile POS Bán hàng Lưu niệm — Bitexco SkyStore (`Souvenir.Bitexco`)
- **Thiết bị mục tiêu**: Máy POS cảm ứng Android **iMin D4 / iMin POS** (Tích hợp máy in nhiệt 80mm, Màn hình phụ Vice Screen, Két đựng tiền tự động, Đầu đọc Barcode)
- **Công nghệ chính**:
  - **Framework**: React Native + Expo (SDK 54) + Expo Router v6
  - **State Machine**: XState v5 (Pure Actors cho Auth, Cart, Đóng ca, Đổi hàng)
  - **Database**: WatermelonDB (SQLite local storage, offline-first outbox pattern)
  - **State & Data Fetching**: TanStack React Query v5 + Zustand + Valibot
  - **Styling**: NativeWind v4 (Tailwind CSS)
  - **Native Modules / Hardware**: Hardware Abstraction Layer (`src/core/hardware/`)

---

## 🏗️ Kiến trúc 4 Lớp (4-Layer System Architecture)

Mọi code mới hoặc refactor cần đặt đúng vào phân lớp tương ứng:

```
[Layer 1: src/app/] (Routing & Context Shells - KHÔNG chứa business logic)
       │
       ▼
[Layer 3: src/features/] (UI Components & Feature Screens)
       │
       ▼
[Layer 2: src/core/] (Business Logic Engines, XState Machines, Hardware Ports & Adapters)
       │
       ▼
[Layer 4: src/shared/] (Design System UI, Axios Client, WatermelonDB Models, Utils)
```

### Quy tắc Phụ thuộc (Boundary Rules):

1. `src/core/` **TUYỆT ĐỐI CẤM** import từ `src/features/` hoặc `src/app/`.
2. `src/shared/` **TUYỆT ĐỐI CẤM** import từ `src/core/`, `src/features/`, hoặc `src/app/`.
3. Callers bên ngoài module **chỉ được phép import qua Barrel File (`index.ts`)** của module đó.

---

## ⚡ Quy tắc bắt buộc cho AI Agent (Strict Guidelines)

### 1. Navigation & Route Parameter Rules (Quy tắc Điều hướng & Tham số Route)

- **KHÔNG gọi `useRouter()` hoặc `useLocalSearchParams()` trực tiếp trong màn hình**:
  - Bắt buộc dùng Custom Hooks chuẩn từ `@/shared/hooks`: **`useAppNavigation()`** và **`useAppParams('ROUTE_NAME')`**.
- **Tự động Parse JSON Params**:
  - `useAppParams()` tự động nhận diện và `JSON.parse` các tham số Object / Array dạng chuỗi. **CẤM viết try/catch hay JSON.parse thủ công trong màn hình UI**.
  - `hrefToRoute` trong `routes.const.ts` tự động `JSON.stringify` các tham số Object / Array khi dựng Query String.
- **Đặt tên file Route tĩnh sạch sẽ**:
  - CẤM dùng thư mục/tệp tên động nhằng nhịt như `[locationId].tsx` khi dữ liệu đã được truyền qua Route Params.
  - Sử dụng tên màn hình tĩnh rõ ràng như `src/app/modules/inventory/session.tsx` (route: `/modules/inventory/session`).
- **KHÔNG tạo biến tạm rườm rà cho Domain Object**:
  - Truy cập trực tiếp thuộc tính của Domain Object (`location?.name`, `location?.code`, `location?.departmentName`) ngay trong JSX expression thay vì khởi tạo một đống biến tạm rườm rà.

### 2. Hardware Ports & Adapters (Tách biệt phần cứng)

- **KHÔNG gọi trực tiếp Native Module hay phần cứng trong React UI Components**.
- Mọi tương tác phần cứng (RFID, Màn hình phụ, Máy in, EDC, Barcode) phải đi qua Interface Contract (`IDeviceManager`) tại `src/core/hardware/`.
- Phải có 2 bộ Adapters: `NativeDeviceAdapter` (chạy Android thực tế) và `MockDeviceAdapter` (chạy trên Web/Simulator dev).

### 3. Quy chuẩn API: 1 File = 1 Endpoint & Naming Conventions

- Mỗi API Call (Query hoặc Mutation) phải được đóng gói độc lập trong **1 file duy nhất** tại `src/features/<feature>/api/<verb-noun>.ts` (VD: `get-locations.ts` — **CẤM dùng tiền tố `use-` cho tên file**).
- **Quy chuẩn Đặt tên Symbol**:
  - Custom Hook: `useGetLocations` (CẤM dùng hậu tố `Query` hay `InfiniteQuery`).
  - Fetcher function: `getLocationsFetcher` (private).
  - Query Key: `getLocationsQueryKey` (export).
  - Query Options: `getLocationsQueryOptions` (export/private).
- **Infinite Query / Lazyloading**:
  - Với danh sách có khả năng phình to, bắt buộc dùng `useInfiniteQuery` với `page` và `limit`.
- **Chỉ export những gì cần thiết**:
  - Chỉ export `useGetLocations` và `getLocationsQueryKey`. Giữ fetcher, request params và response interface nội bộ trong file API trừ khi có nhu cầu dùng chung.

### 4. Quy tắc Phạm vi & Nâng vị trí Type & Shared Mock Data

- **Type Hoisting**:
  - `PaginationParams` (`page`, `limit`) và `PaginatedResponse<T>` (`items`, `hasMore`, `total`) phải đặt tại `src/shared/types/api.types.ts`.
  - Khi có từ **2 features trở lên** sử dụng chung một Type $\rightarrow$ **bắt buộc nâng (hoist) Type đó lên `src/shared/types/`**.
- **Shared Mock Dataset**:
  - Dữ liệu Mock dùng chung đặt tại `src/shared/mock/<domain>.mock.ts` và export qua `@/shared/mock`.
  - **CẤM re-export tệp mock data trong thư mục `data/` của feature**.

### 5. Quy tắc Thiết kế UI/UX & Feedback Standard

- **Shimmer Skeleton Loading**:
  - Trạng thái nạp dữ liệu ban đầu (`isLoading === true`) **bắt buộc dùng Base Component `<Shimmer />`** (animated pulse cards) thay vì spinner nguyên thủy hay thông báo `EmptyState`.
- **Lazy Loading Footer**:
  - Chân trang danh sách lazyloading bắt buộc dùng Base Component `<LoadMore isLoading={isFetchingNextPage} />`.
- **Toast Notifications**:
  - Thông báo lỗi/cảnh báo **bắt buộc dùng `toast.warning()` / `toast.error()`** từ `@/shared/store`. **CẤM dùng `Alert.alert` native mặc định của React Native**.
- **AppHeader Title**:
  - Tiêu đề `AppHeader` phải đặt tên tường minh, thể hiện đúng hành động nghiệp vụ (VD: `"Chọn Vị Trí Kiểm Kê"` thay vì `"Kiểm Kê Di Động"` chung chung).

### 6. Kiểm tra trước khi bàn giao

- Kiểm tra TypeScript strict mode: `npx tsc --noEmit` (**0 Errors**)
- Kiểm tra Linter: `npm run lint` (**0 Errors**)
