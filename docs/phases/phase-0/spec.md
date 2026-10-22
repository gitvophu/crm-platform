# Phase 0: Foundation · Spec

## Mục tiêu

Có bộ khung repo để mọi phase sau gắn vào: clone về, một lệnh là chạy được, CI tự kiểm tra mọi PR.

## Trong phạm vi

- Monorepo pnpm + Turborepo: `apps/api` (NestJS), `apps/web` (React + Vite), `packages/shared` (type/DTO dùng chung)
- Môi trường dev chạy trong Docker Compose, host chỉ cần Docker + `make` (ADR-0002)
- Docker Compose: PostgreSQL + api + web
- Kết nối API ↔ PostgreSQL, có công cụ migration (chọn ORM, ghi ADR)
- Lint + format + typecheck dùng chung toàn repo
- Kiểm tra ranh giới module tự động
- Test runner cho api và web
- CI GitHub Actions: lint, typecheck, test, build
- Structured logging (JSON) + request-id
- Endpoint `GET /health` (có kiểm tra kết nối DB)

## Ngoài phạm vi

- Auth, bất kỳ module nghiệp vụ nào
- OpenTelemetry đầy đủ, IaC, Kubernetes
- Deploy lên cloud

## Tiêu chí hoàn thành (Definition of Done)

- [ ] Từ repo sạch: `docker compose up` → web hiển thị trạng thái lấy từ `GET /health`
- [ ] Trên máy không cài Node: `make lint typecheck test build` pass ở root
- [ ] CI chạy và xanh trên PR
- [ ] Tạo thử một import chéo module sai quy tắc → lint báo lỗi
- [ ] ADR chọn ORM/migration tool đã viết
- [ ] `CLAUDE.md` đã điền convention thực tế

## Số liệu cần đo

| Chỉ số                                             | Cách đo        | Mục tiêu        |
| -------------------------------------------------- | -------------- | --------------- |
| Thời gian CI                                       | GitHub Actions | < 5 phút        |
| Thời gian `docker compose up` lần đầu              | Đo tay         | Ghi lại làm mốc |
| Thời gian `make install` lần đầu / khi store đã có | Đo tay         | Ghi lại làm mốc |

## Rủi ro / câu hỏi mở

- ORM: Prisma, TypeORM, Drizzle hay MikroORM? → quyết định trong slice 0.3, ghi ADR-0003
- Chạy code trong WSL: kiểm tra file watching/hot reload trong Docker
