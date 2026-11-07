# Fixture cho lint ranh giới module

`src/` mô phỏng `apps/api/src/` với 2 module `alpha`, `beta`. `apps/web/src/` mô phỏng web với 2
tính năng `features/alpha`, `features/beta` và một trang `page.ts` (slice 1.3, Q13).
`packages/shared/` là stub. Web và shared được phân loại nhờ khớp theo hậu tố đường dẫn.

Mỗi dòng import sai có comment `// ✗ <loại>`: `public-api` (import ruột module hoặc tính năng khác), `prisma`
(dùng Prisma ngoài repository), `cross-app` (app import nhau), `cycle` (import vòng giữa module hoặc tính năng).
`apps/api/test/boundaries.test.ts` kiểm tra ESLint báo đúng loại ở đúng các dòng đó, không báo
dòng nào khác.

Fixture bị bỏ qua khi `make lint` (xem `globalIgnores` trong `eslint.config.mjs`). Alias `@/` trỏ tới
`apps/api/src` thật, nên import giữa các file fixture dùng đường dẫn tương đối.
