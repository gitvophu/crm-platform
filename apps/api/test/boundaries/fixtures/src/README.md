# Fixture cho lint ranh giới module

Mô phỏng `apps/api/src/` với 2 module `alpha`, `beta`. Mỗi dòng import sai có comment `// ✗ <rule>`,
`apps/api/test/boundaries.test.ts` kiểm tra ESLint báo đúng các dòng đó và không báo dòng nào khác.

Fixture bị bỏ qua khi `make lint` (xem `globalIgnores` trong `eslint.config.mjs`). Alias `@/` trỏ tới
`apps/api/src` thật, nên import giữa các file fixture dùng đường dẫn tương đối.
