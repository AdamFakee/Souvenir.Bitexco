# Coding Standards & Best Practices

Tài liệu này quy định chuẩn viết code (Coding Conventions) để đảm bảo code dễ đọc, dễ bảo trì và đồng bộ trong toàn bộ Team.

## 1. Quy tắc Đặt tên (Naming Conventions)

### 1.1. Biến & Hằng số (Variables & Constants)

- **Biến (Variables):** Sử dụng `camelCase`. Tên phải là **Danh từ**.
  - ✅ `user`, `totalAmount`, `workerList`.
  - ❌ `User`, `TotalAmount`, `list`.
- **Mảng (Arrays):** Dùng danh từ số nhiều hoặc suffix `List`.
  - ✅ `users`, `products`, `workerList`.
  - ❌ `user`, `product` (gây nhầm lẫn với 1 phần tử).
- **Boolean:** Luôn bắt đầu bằng `is`, `has`, `should`, `can`.
  - ✅ `isLoading`, `hasError`, `canEdit`, `isVisible`.
  - ❌ `loading`, `error`, `edit`, `visible` (không rõ là trạng thái hay hành động).
- **Hằng số (Constants):**
  - Global (không đổi): `UPPER_SNAKE_CASE`. Ví dụ: `MAX_RETRY_COUNT`, `API_BASE_URL`.
  - Local (trong hàm): `camelCase`.

### 1.2. Hàm (Functions)

- Sử dụng `camelCase`. Tên phải bắt đầu bằng **Động từ**.
  - ✅ `getUserById`, `handleClick`, `formatDate`.
  - ❌ `UserById` (giống Component), `handlingClick` (dùng hiện tại phân từ).
- **Event Handlers:** Bắt đầu bằng `handle` (logic xử lý) hoặc `on` (props truyền xuống).
  - ✅ `handleLogin`, `onSubmitPress`.
  - Props: `onPress`, `onValueChange`.

### 1.3. Components & Files

- **Component:** `PascalCase`.
  - ✅ `UserProfile`, `PrimaryButton`.
- **File Name**: `kebab-case` (chữ thường, gạch ngang).
  - ✅ `user-profile.tsx`, `api-client.ts`.
  - ❌ `UserProfile.tsx`, `ApiClient.ts`.
  - _Lý do:_ Tránh lỗi case-sensitive trên các OS khác nhau (Mac/Windows/Linux).

### 1.4. API Functions (Trong thư mục `api/`)

- Dùng công thức: **[Verb] + [Resource]**.
  - ✅ `getProducts`, `getProductById`.
  - ✅ `createOrder`, `updateUserProfile`.
  - ✅ `loginWithGoogle`, `verifyToken`.
- Tránh dùng từ ngữ kỹ thuật không cần thiết (fetch, retrieve) nếu không có ý nghĩa đặc biệt. Dùng `get` cho thống nhất.

## 2. Tổ chức Code trong Hàm (Function Organization)

### 2.1. Guard Clauses (Early Return)

Thay vì lồng nhiều `if/else`, hãy kiểm tra điều kiện lỗi trước và `return` sớm. Code sẽ phẳng (linear) và dễ đọc ("Happy Path" luôn nằm ở cấp độ thấp nhất).

**❌ Không nên:**

```typescript
const processUser = (user) => {
  if (user) {
    if (user.isActive) {
      // Logic chính nằm sâu bên trong
      saveUser(user)
    } else {
      return
    }
  } else {
    throw new Error('No user')
  }
}
```

**✅ Nên dùng:**

```typescript
const processUser = (user) => {
  if (!user) throw new Error('No user')
  if (!user.isActive) return

  // Logic chính nằm ở ngoài cùng
  saveUser(user)
}
```

### 2.2. Thứ tự Khai báo Biến (Variable Declaration Order)

Để code ngăn nắp, hãy gom nhóm các biến theo thứ tự sau:

1.  **Destructuring Props/Params:** Lấy dữ liệu từ input đầu tiên.
2.  **External Hooks (Libraries):** `useRouter`, `useNavigation`, `useForm`.
3.  **State & Refs (React):** `useState`, `useRef`.
4.  **Custom Hooks (Data fetching):** `useQuery`, `useMutation`.
5.  **Derived State (Calculated Loop-free):** Biến tính toán từ state (`const isValid = ...`).
6.  **Effects:** `useEffect` (Hạn chế dùng).
7.  **Event Handlers:** Các hàm xử lý sự kiện.

````tsx
export function ExampleComponent({ id, initialData }: Props) {
  // 1. Destructuring & Lib Hooks
  const router = useRouter();
  const { control, handleSubmit } = useForm();

  // 2. Local State & Refs
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);

  // 3. Data Hooks
  const { data: user } = useUser(id);

  // 4. Derived State (Tính toán ngay, KHÔNG dùng useEffect để set state phụ)
  const isAdmin = user?.role === 'admin';
  const canSubmit = !isOpen && isAdmin;

  // 5. Effects
  useEffect(() => { ... }, [id]);

  // 6. Handlers
  const onSubmit = (data) => { ... };

  // 7. Render
  return <View>...</View>;
}

### 2.3. Vị trí Đặt Hằng số (Constants Placement)

*   **Static Constants (Không phụ thuộc props/state):** Đặt **bên ngoài** Component. Giúp tránh việc khởi tạo lại biến mỗi lần render.
    ```tsx
    const MAX_ITEMS = 5; // ✅ Init 1 lần duy nhất
    const DEFAULT_STYLE = { color: 'red' };

    export function MyComponent() { ... }
    ```
*   **Local Constants (Phụ thuộc Logic):** Đặt **bên trong** Component (như mục 2.2 - Derived State).
    ```tsx
    export function MyComponent({ role }) {
       const timeoutSeconds = role === 'admin' ? 10 : 5; // ✅ Phụ thuộc props
    }
    ```
````

## 3. Phân biệt `src/lib` và `src/utils`

- **`src/lib` (Library Wrappers):** Cấu hình, khởi tạo thư viện bên thứ 3. Code ở đây phụ thuộc vào package đã cài.
  - Ví dụ: `axios-client.ts` (cấu hình Axios), `firebase.ts` (init Firebase).
- **`src/utils` (Utilities):** Các hàm thuật toán thuần túy, Helper tự viết. Code ở đây thường độc lập, ít phụ thuộc.
  - Ví dụ: `format-money.ts`, `validate-email.ts`, `date-helpers.ts`.

## 4. Best Practices khác

- **Không Magic Numbers/Strings:** Tránh hardcode số hoặc chuỗi vô nghĩa. Hãy đặt vào constant hoặc Enum.
  - ❌ `if (status === 1) ...`
  - ✅ `if (status === UserStatus.ACTIVE) ...`
- **Strict Typing:** Không dùng `any`. Nếu chưa rõ type, hãy dùng `unknown` hoặc define type tạm thời.
- **Comment:**
  - Không comment code mô tả "Làm gì" (Code phải tự giải thích).
  - Chỉ comment "Tại sao" (Giải thích nghiệp vụ phức tạp hoặc workaround).
