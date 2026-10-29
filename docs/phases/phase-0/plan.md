# Phase 0: Foundation · Plan

Mỗi slice có tài liệu Spec · Q&A · Plan riêng trong `slices/`, phải được duyệt trước khi code (xem `docs/02-workflow.md`).

| Slice | Nội dung                                                | Tài liệu                        | Branch                         | Điểm cần review                                | Trạng thái |
| ----- | ------------------------------------------------------- | ------------------------------- | ------------------------------ | ---------------------------------------------- | ---------- |
| 0.1   | Monorepo skeleton + lint/format/typecheck + test runner | [0.1](slices/0.1-monorepo.md)   | `phase-0/slice-0-1-monorepo`   | Cấu trúc thư mục, config dùng chung            | 🎉         |
| 0.2   | Dev toolchain qua Docker Compose + Makefile             | [0.2](slices/0.2-dev-docker.md) | `phase-0/slice-0-2-dev-docker` | ADR-0002, quyền file, tốc độ cài               | 🎉         |
| 0.3   | API NestJS + PostgreSQL + migration + `/health`         | [0.3](slices/0.3-api-db.md)     | `phase-0/slice-0-3-api-db`     | ADR-0003 chọn ORM, ranh giới module với Prisma | 🎉         |
| 0.4   | Web React gọi `/health`                                 | [0.4](slices/0.4-web.md)        | `phase-0/slice-0-4-web`        | Cách gọi API, dùng type từ `packages/shared`   | 🎉         |
| 0.5   | Compose hoàn chỉnh: hot reload + healthcheck            | [0.5](slices/0.5-compose.md)    | `phase-0/slice-0-5-compose`    | Hot reload, env, healthcheck                   | 🎉         |
| 0.6   | CI + kiểm tra ranh giới module                          | [0.6](slices/0.6-ci.md)         | `phase-0/slice-0-6-ci`         | Thời gian CI, cache                            | 🚧         |
| 0.7   | Logging + request-id + hoàn thiện CLAUDE.md             |                                 | `phase-0/slice-0-7-logging`    | Format log                                     | ⬜         |

Trạng thái: ⬜ Chưa bắt đầu · 📝 Đang viết tài liệu · 👀 Chờ review · ✅ Đã duyệt · 🚧 Đang làm · 🎉 Xong

> 2026-10-21: chèn slice 0.2 (dev toolchain qua Docker, xem ADR-0002), các slice sau tăng số thêm 1. Tài liệu slice 0.1 vẫn dùng số cũ.

## Chi tiết từng slice

### 0.1 Monorepo skeleton

- **Kết quả:** `pnpm install` ở root, có `apps/api`, `apps/web`, `packages/shared` rỗng nhưng build được
- **Việc cần làm:**
  - [ ] pnpm workspace + Turborepo pipeline (lint, typecheck, test, build)
  - [ ] TypeScript config gốc, ESLint + Prettier dùng chung
  - [ ] Vitest cho cả repo (dời từ 0.5 lên, xem Q3 trong tài liệu slice)
  - [ ] `.editorconfig`, `.nvmrc`
- **Test:** `pnpm build` pass, 1 test mẫu trong `packages/shared`
- **Demo:** `pnpm turbo run build` chạy cho cả 3 package

### 0.2 Dev toolchain qua Docker Compose

- **Kết quả:** máy chỉ có Docker + `make` chạy được mọi lệnh dev
- **Việc cần làm:**
  - [ ] ADR-0002
  - [ ] `compose.yaml` với service `dev`, Dockerfile, `Makefile`
  - [ ] Hướng dẫn setup trong `README.md`, cập nhật lệnh trong `CLAUDE.md`
- **Test:** clone sạch → `make install lint typecheck test build` pass, không có file thuộc root
- **Demo:** `make install && make test` trên máy không có Node

### 0.3 API + DB

- **Kết quả:** `GET /health` trả `{ status, db }`
- **Việc cần làm:**
  - [ ] So sánh ORM, viết ADR-0003 (chọn Prisma 7)
  - [ ] Config qua env, validate bằng zod, `.env.example`
  - [ ] Migration đầu tiên (tạo schema rỗng cho module mẫu)
  - [ ] Service postgres và service api tối thiểu trong compose
- **Test:** integration test `/health` với DB `crm_test` trong compose
- **Demo:** `curl localhost:3000/health`

### 0.4 Web

- **Kết quả:** trang chủ hiển thị trạng thái API
- **Việc cần làm:**
  - [ ] Vite + React + TanStack Query
  - [ ] Type response lấy từ `packages/shared`
- **Test:** 1 component test
- **Demo:** mở trình duyệt thấy "API: ok, DB: ok"

### 0.5 Docker Compose cho các service runtime

- **Kết quả:** `docker compose up` chạy postgres, api, web
- **Việc cần làm:**
  - [ ] Hot reload cho api, healthcheck cho api và web (postgres, api, web tối thiểu và `.env.example` đã có từ slice 0.3, 0.4)
  - [ ] Sửa `packages/shared` khi stack đang chạy: `make restart` (tự watch ghi backlog)
  - [ ] `docker compose up` từ clone sạch tự cài dependency và migrate (hiện cần `make install` + `make migrate` trước)
- **Test:** chạy từ repo clone sạch
- **Demo:** sửa code → hot reload hoạt động

### 0.6 CI

- **Kết quả:** PR tự chạy lint/typecheck/test/build
- **Việc cần làm:**
  - [ ] GitHub Actions + cache pnpm/turbo (test runner đã có từ 0.1)
  - [ ] dependency-cruiser hoặc eslint-plugin-boundaries
  - [ ] Quyết định path alias cho `apps/api` (`#src/*` hoặc tsconfig `paths`, xem backlog 2026-10-24). Lint ranh giới phải nhận diện đúng import qua alias
- **Test:** cố tình import chéo module → CI đỏ
- **Demo:** link run CI xanh

### 0.7 Logging + CLAUDE.md

- **Kết quả:** log JSON có request-id, CLAUDE.md phản ánh convention thật
- **Việc cần làm:**
  - [ ] Logger (pino), middleware request-id
  - [ ] Cập nhật CLAUDE.md
  - [ ] Viết `review.md` của Phase 0
- **Demo:** gọi API, thấy request-id trong log và response header
