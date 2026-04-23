module.exports = {
  semi: false, // Không dùng dấu chấm phẩy (;) cuối dòng -> Code gọn, hiện đại hơn.
  singleQuote: true, // Dùng nháy đơn ('') thay vì nháy kép ("") -> Chuẩn chung của JS/React.

  tabWidth: 2, // Một lần thụt dòng = 2 dấu cách -> Tiết kiệm diện tích chiều ngang.
  useTabs: false, // Dùng dấu cách (space) thay vì ký tự Tab -> Đảm bảo hiển thị giống nhau trên mọi editor.

  trailingComma: 'all', // Luôn thêm dấu phẩy ở cuối (cả object, array, hàm) -> Giúp Git diff sạch đẹp, tránh lỗi khi thêm dòng mới.
  printWidth: 100, // Ngắt xuống dòng nếu dài quá 100 ký tự -> Dễ đọc hơn (mặc định 80 hơi ngắn với React Native).
  arrowParens: 'always', // Luôn có ngoặc đơn cho hàm mũi tên: (x) => x -> An toàn hơn khi thêm Type hoặc tham số sau này.
  bracketSpacing: true, // Thêm khoảng trắng trong object: { foo: bar } -> Nhìn thoáng mắt hơn {foo: bar}.

  // 4. Hệ điều hành & Plugin
  endOfLine: 'lf', // Bắt buộc xuống dòng kiểu Linux/Mac (LF) -> Tránh conflict Git khi team có người dùng Windows, người dùng Mac.
  plugins: ['prettier-plugin-tailwindcss'], // Tự động sắp xếp class Tailwind (cần thiết nếu dùng NativeWind).
}
