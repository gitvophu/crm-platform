# CRM Platform

[![CI](https://github.com/gitvophu/crm-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/gitvophu/crm-platform/actions/workflows/ci.yml)

CRM cho _Nova Agency_ (agency digital marketing giả định), dùng làm sân chơi thực hành nhiều tech stack: modular monolith cho phần lõi, các service vệ tinh tách ra khi có lý do đo được.

## Tài liệu

| File                                                 | Nội dung                                 |
| ---------------------------------------------------- | ---------------------------------------- |
| [docs/00-vision.md](docs/00-vision.md)               | Bối cảnh, stack, mục tiêu, ngoài phạm vi |
| [docs/01-roadmap.md](docs/01-roadmap.md)             | Các phase và lịch                        |
| [docs/02-workflow.md](docs/02-workflow.md)           | Vòng lặp làm việc mỗi phase              |
| [docs/review-checklist.md](docs/review-checklist.md) | Checklist review PR/phase                |
| [docs/adr/](docs/adr/)                               | Architecture Decision Records            |
| [docs/phases/](docs/phases/)                         | Spec, plan, review từng phase            |

## Chạy local

Mọi lệnh dev chạy trong container (xem [ADR-0002](docs/adr/0002-dev-env-docker.md)). Máy chỉ cần **Docker** (Engine 25+, Compose v2; đã thử Compose v5.6) và **make**, không cần cài Node hay pnpm.

```bash
cp .env.example .env   # cấu hình local (DB, cổng), không phải secret
make up                # = docker compose up -d --wait: build image dev nếu chưa có, cài dependency,
                       #   build shared, migrate, rồi chạy postgres + api + web
# mở http://localhost:5173 → "API: ok, DB: ok"
curl localhost:3000/health
make lint typecheck test build
make help              # xem tất cả lệnh
```

| Lệnh                    | Việc                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `make pnpm ARGS="..."`  | Chạy lệnh pnpm bất kỳ, ví dụ `add -D x`                                                    |
| `make sh`               | Mở shell trong container                                                                   |
| `make image`            | Build lại image dev (sau khi đổi version)                                                  |
| `make format`           | Prettier format toàn repo                                                                  |
| `make down`             | Dừng postgres + api + web                                                                  |
| `make restart`          | Chạy lại `setup` rồi tạo lại api + web (sau khi sửa shared, hoặc pull khi stack đang chạy) |
| `make install`          | `pnpm install` (tự chạy mỗi lần `make up`)                                                 |
| `make migrate`          | Chạy lại `setup` để áp migration mới (tự chạy mỗi lần `make up`)                           |
| `make migration NAME=x` | Tạo migration mới từ thay đổi trong `apps/api/prisma/schema/`, chưa áp                     |

- Repo được mount vào `/workspace`. `node_modules` nằm trong repo nên IDE trên host đọc được.
- Container chạy bằng UID/GID của bạn, file sinh ra không thuộc root.
- pnpm store và cache nằm ở volume `crm-platform_dev-home`. Xoá volume này là cài lại từ đầu.
- Mỗi lần `up`, service `setup` chạy `pnpm install --frozen-lockfile`, build `packages/shared`, generate Prisma client, `prisma migrate deploy` rồi thoát. api và web chờ nó xong mới chạy. Sau khi pull: stack đang tắt thì `make up`, đang chạy thì `make restart` (`up` không tạo lại api, web đang chạy nên chúng vẫn giữ code cũ).
- Hot reload: sửa `apps/api/src` thì api tự build lại và restart (`nest start --watch`), sửa `apps/web/src` thì trình duyệt cập nhật (Vite HMR). Sửa `packages/shared` thì chạy `make restart`.
- Gọi `docker compose` trực tiếp (không qua `make`) thì container chạy bằng UID/GID `1000`. Máy có UID khác thì dùng `make`, hoặc `export UID GID` trước (trong bash, `UID` là biến shell chưa export).
- `make up` chỉ trả về khi api trả `GET /health` 200 (cả DB ok) và web trả 200. `docker compose ps` hiện api `unhealthy` khi DB lỗi.
- Web gọi API qua proxy cùng origin: `localhost:5173/api/*` → `api:3000/*`. Chạy web ngoài compose thì đặt `API_PROXY_TARGET` (mặc định `http://api:3000`).
- Postgres mở cổng 5432 ra host (user/pass trong `.env`) để dùng tool DB của IDE. `make test` tự bật postgres và chạy trên DB riêng `crm_test`.

### IDE

- **VS Code:** không cần cấu hình. Extension ESLint/Prettier và TypeScript dùng Node có sẵn của VS Code, đọc `node_modules` trong repo.
- **WebStorm / PhpStorm:** cần Node interpreter để chạy ESLint và TypeScript service.
  1. _Settings → Languages & Frameworks → Node.js → Node interpreter → Add… → Add Remote…_
  2. Chọn **Docker Compose**, configuration file `compose.yaml`, service `dev`
  3. _Package manager_: `pnpm` (shim Corepack ở `/usr/local/bin/pnpm` trong container)
  4. _Languages & Frameworks → TypeScript_: TypeScript trỏ tới `node_modules/typescript` của project
  5. _Code Quality Tools → ESLint_: chọn _Automatic ESLint configuration_

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) chạy với mọi PR vào `main` và mọi push lên `main`: `prettier --check`, rồi `turbo run lint typecheck test build`. CI chạy native trên runner (Node theo `.nvmrc`, pnpm theo `packageManager`), Postgres là service container, có cache pnpm store và `.turbo`.

Bắt PR phải xanh mới được merge (làm một lần, trong GitHub): _Settings → Rules → Rulesets → New branch ruleset_, target `main`, bật _Require a pull request before merging_ và _Require status checks to pass_, thêm check `check` (tên job trong workflow).

## Import và ranh giới module

- `@/x` trỏ tới `src/x` của app đang đứng (api và web). Khác thư mục dùng `@/`, cùng thư mục dùng `./`, lint chặn `../`.
- ESLint (`eslint-plugin-boundaries`, `import-x/no-cycle`) kiểm tra ranh giới của ADR-0001 và ADR-0003:
  - module khác chỉ được import qua `src/modules/<tên>/index.ts`
  - trong module, chỉ `*.repository.ts` dùng `PrismaService` và Prisma client
  - `apps/api` và `apps/web` không import nhau, code dùng chung đi qua `@crm/shared`
  - không import vòng giữa các module
- Test `apps/api/test/boundaries.test.ts` chạy ESLint trên fixture để chắc chắn các rule trên còn hoạt động.
