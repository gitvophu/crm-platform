# Fixture cho lint ranh giới module

`src/` mô phỏng `apps/api/src/` với 2 module `alpha`, `beta`. `apps/web/` và `packages/shared/` là
stub, được phân loại là web và shared vì khớp theo hậu tố đường dẫn.

Mỗi dòng import sai có comment `// ✗ <loại>`: `public-api` (import ruột module khác), `prisma`
(dùng Prisma ngoài repository), `cross-app` (app import nhau), `cycle` (import vòng giữa module).
`apps/api/test/boundaries.test.ts` kiểm tra ESLint báo đúng loại ở đúng các dòng đó, không báo
dòng nào khác.

Fixture bị bỏ qua khi `make lint` (xem `globalIgnores` trong `eslint.config.mjs`). Alias `@/` trỏ tới
`apps/api/src` thật, nên import giữa các file fixture dùng đường dẫn tương đối.
