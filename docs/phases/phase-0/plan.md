# Phase 0: Foundation · Plan

Mỗi slice có tài liệu Spec · Q&A · Plan riêng trong `slices/`, phải được duyệt trước khi code (xem `docs/02-workflow.md`).

| Slice | Nội dung                                                | Tài liệu                      | Branch                       | Điểm cần review                              | Trạng thái |
| ----- | ------------------------------------------------------- | ----------------------------- | ---------------------------- | -------------------------------------------- | ---------- |
| 0.1   | Monorepo skeleton + lint/format/typecheck + test runner | [0.1](slices/0.1-monorepo.md) | `phase-0/slice-0-1-monorepo` | Cấu trúc thư mục, config dùng chung          | 🎉         |
| 0.2   | API NestJS + PostgreSQL + migration + `/health`         |                               | `phase-0/slice-0-2-api-db`   | ADR-0002 chọn ORM                            | ⬜         |
| 0.3   | Web React gọi `/health`                                 |                               | `phase-0/slice-0-3-web`      | Cách gọi API, dùng type từ `packages/shared` | ⬜         |
| 0.4   | Docker Compose cho cả 3 service                         |                               | `phase-0/slice-0-4-compose`  | Hot reload, env, healthcheck                 | ⬜         |
| 0.5   | CI + kiểm tra ranh giới module                          |                               | `phase-0/slice-0-5-ci`       | Thời gian CI, cache                          | ⬜         |
| 0.6   | Logging + request-id + hoàn thiện CLAUDE.md             |                               | `phase-0/slice-0-6-logging`  | Format log                                   | ⬜         |

Trạng thái: ⬜ Chưa bắt đầu · 📝 Đang viết tài liệu · 👀 Chờ review · ✅ Đã duyệt · 🚧 Đang làm · 🎉 Xong

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

### 0.2 API + DB

- **Kết quả:** `GET /health` trả `{ status, db }`
- **Việc cần làm:**
  - [ ] So sánh ORM, viết ADR-0002
  - [ ] Config qua env, có validate
  - [ ] Migration đầu tiên (tạo schema rỗng cho module mẫu)
- **Test:** integration test `/health` với DB thật (Testcontainers hoặc DB trong compose)
- **Demo:** `curl localhost:3000/health`

### 0.3 Web

- **Kết quả:** trang chủ hiển thị trạng thái API
- **Việc cần làm:**
  - [ ] Vite + React + TanStack Query
  - [ ] Type response lấy từ `packages/shared`
- **Test:** 1 component test
- **Demo:** mở trình duyệt thấy "API: ok, DB: ok"

### 0.4 Docker Compose

- **Kết quả:** `docker compose up` chạy cả 3 service
- **Việc cần làm:**
  - [ ] Dockerfile dev cho api, web
  - [ ] Healthcheck postgres, api chờ DB sẵn sàng
  - [ ] `.env.example`
- **Test:** chạy từ repo clone sạch
- **Demo:** sửa code → hot reload hoạt động

### 0.5 CI

- **Kết quả:** PR tự chạy lint/typecheck/test/build
- **Việc cần làm:**
  - [ ] GitHub Actions + cache pnpm/turbo (test runner đã có từ 0.1)
  - [ ] dependency-cruiser hoặc eslint-plugin-boundaries
- **Test:** cố tình import chéo module → CI đỏ
- **Demo:** link run CI xanh

### 0.6 Logging + CLAUDE.md

- **Kết quả:** log JSON có request-id, CLAUDE.md phản ánh convention thật
- **Việc cần làm:**
  - [ ] Logger (pino), middleware request-id
  - [ ] Cập nhật CLAUDE.md
  - [ ] Viết `review.md` của Phase 0
- **Demo:** gọi API, thấy request-id trong log và response header
