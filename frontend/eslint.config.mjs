import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Tắt cảnh báo / lỗi dùng 'any'
      "@typescript-eslint/no-explicit-any": "off",
      // Tắt lỗi các biến khai báo nhưng chưa sử dụng
      "@typescript-eslint/no-unused-vars": "off",
      // Tắt lỗi ký tự đặc biệt trong JSX (dấu ngoặc kép, nháy đơn)
      "react/no-unescaped-entities": "off",
      // Tắt cảnh báo hook thiếu dependency
      "react-hooks/exhaustive-deps": "off",
      // Chuyển cảnh báo thẻ <img> thành warning thay vì error (hoặc off hẳn nếu muốn)
      "@next/next/no-img-element": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;