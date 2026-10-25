# CRM Platform

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

Mọi lệnh dev chạy trong container (xem [ADR-0002](docs/adr/0002-dev-env-docker.md)). Máy chỉ cần **Docker** (có Compose v2) và **make**, không cần cài Node hay pnpm.

```bash
cp .env.example .env   # cấu hình local (DB, cổng), không phải secret
make install           # lần đầu tự build image dev (Node theo .nvmrc, pnpm theo packageManager)
make up                # postgres + api
make migrate           # áp migration lên DB dev
curl localhost:3000/health
make lint typecheck test build
make help              # xem tất cả lệnh
```

| Lệnh                    | Việc                                                                   |
| ----------------------- | ---------------------------------------------------------------------- |
| `make pnpm ARGS="..."`  | Chạy lệnh pnpm bất kỳ, ví dụ `add -D x`                                |
| `make sh`               | Mở shell trong container                                               |
| `make image`            | Build lại image dev (sau khi đổi version)                              |
| `make format`           | Prettier format toàn repo                                              |
| `make down`             | Dừng postgres + api                                                    |
| `make migration NAME=x` | Tạo migration mới từ thay đổi trong `apps/api/prisma/schema/`, chưa áp |

- Repo được mount vào `/workspace`. `node_modules` nằm trong repo nên IDE trên host đọc được.
- Container chạy bằng UID/GID của bạn, file sinh ra không thuộc root.
- pnpm store và cache nằm ở volume `crm-platform_dev-home`. Xoá volume này là cài lại từ đầu.
- Postgres mở cổng 5432 ra host (user/pass trong `.env`) để dùng tool DB của IDE. `make test` tự bật postgres và chạy trên DB riêng `crm_test`.

### IDE

- **VS Code:** không cần cấu hình. Extension ESLint/Prettier và TypeScript dùng Node có sẵn của VS Code, đọc `node_modules` trong repo.
- **WebStorm / PhpStorm:** cần Node interpreter để chạy ESLint và TypeScript service.
  1. _Settings → Languages & Frameworks → Node.js → Node interpreter → Add… → Add Remote…_
  2. Chọn **Docker Compose**, configuration file `compose.yaml`, service `dev`
  3. _Package manager_: `pnpm` (shim Corepack ở `/usr/local/bin/pnpm` trong container)
  4. _Languages & Frameworks → TypeScript_: TypeScript trỏ tới `node_modules/typescript` của project
  5. _Code Quality Tools → ESLint_: chọn _Automatic ESLint configuration_
