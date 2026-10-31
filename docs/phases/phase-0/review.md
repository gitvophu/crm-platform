# Phase 0: Foundation · Review & Retro

- **Ngày bắt đầu / kết thúc:** 2026-10-18 / 2026-10-31
- **Tag:** `phase-0`
- **Slice:** 0.1 → 0.7, PR #2 → #8 (xem [plan.md](plan.md))

## Đối chiếu Definition of Done

| Tiêu chí (từ spec.md)                                     | Đạt? | Ghi chú                                                                                                                                                                               |
| --------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose up` từ repo sạch → web hiển thị `/health` | ✅   | Cần `cp .env.example .env` trước (slice 0.5, Q2). Service `setup` tự cài dependency, build shared, migrate. Đo lại ở slice 0.7 với clone sạch, không có image                         |
| Không cài Node: `make lint typecheck test build` pass     | ✅   | Mọi lệnh chạy trong container `dev` (ADR-0002)                                                                                                                                        |
| CI xanh trên PR                                           | ✅   | GitHub Actions từ slice 0.6, branch `main` đã bật bảo vệ                                                                                                                              |
| Lint bắt được import chéo module                          | ✅   | `eslint-plugin-boundaries` + `import-x/no-cycle`, test fixture `apps/api/test/boundaries.test.ts`. PR #7 thử cố ý cho module dùng `PrismaService` ngoài repository: CI đỏ ở bước lint |
| ADR chọn ORM                                              | ✅   | ADR-0003: Prisma 7                                                                                                                                                                    |
| CLAUDE.md đã điền convention                              | ✅   | Còn format lỗi API, chốt ở slice 1.2 khi có lỗi thật (slice 0.7, Q5)                                                                                                                  |

## Số liệu đo được

Đo ngày 2026-10-31 trên máy dev Linux (Docker Engine, Compose v5.6), mạng gia đình. Clone sạch dùng project compose riêng (`-p`) nên volume luôn mới.

| Chỉ số                                       | Kết quả                                 | Điều kiện                                                                                                                                                                                   |
| -------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thời gian CI                                 | 49–63s mỗi run (mục tiêu < 5 phút)      | 5 run thành công gần nhất. Lần đầu trên `main` (chưa có cache turbo): lint 9s + typecheck/test/build 10s. Re-run có cache: cả bước turbo 4s. Khởi động service container Postgres chiếm 10s |
| `docker compose up` lần đầu                  | 45,6s                                   | Clone sạch, đã xoá image dev, `node:26-trixie-slim`, `postgres:18-trixie`. Gồm tải 2 base image, build image dev, cài 720 package, build shared, migrate, chờ api/web healthy               |
| `docker compose up` khi đã có image và store | 5,7s                                    | Cùng bản clone, sau `down` (giữ volume)                                                                                                                                                     |
| `make install` lần đầu (store rỗng)          | 6,8s (pnpm 6,1–9,3s tuỳ mạng, 2 lần đo) | 720 package, volume `dev-home` mới. Gồm khoảng 0,4s khởi động container                                                                                                                     |
| `make install` khi store đã có               | 0,73s (pnpm 0,35s)                      | Đã xoá `node_modules`, giữ volume `dev-home`                                                                                                                                                |
| `make install` khi không có gì đổi           | 0,38s (pnpm 22ms)                       | Đây cũng là phần cài của service `setup` ở mỗi lần `up`                                                                                                                                     |

## ADR đã viết

- ADR-0001: Modular monolith
- ADR-0002: Môi trường dev chạy trong Docker Compose
- ADR-0003: ORM và migration: Prisma 7

## Retro

- **Làm tốt:**
  - Slice doc + Q&A trước khi code: mọi quyết định đều có phương án, lý do, ghi trong file thay vì trong chat. 7 slice có tổng cộng 67 câu Q&A.
  - Verify bằng cách chạy thật tìm ra lỗi mà test không thấy: api mất 10s mới dừng (SIGTERM tới `sh` chứ không tới node), DB treo làm `/health` treo theo, Nest CLI không kill được process cũ khi reload (`EADDRINUSE`, image thiếu `ps`), api và web cùng build shared.
  - Code review bằng subagent sau mỗi slice: lần nào cũng có lỗi thật phải sửa (race, cache CI phình, rule lint bị policy khác che).
  - Rule lint ranh giới có test fixture và được thử "làm hỏng rule thì test đỏ", không chỉ tin vào config.
- **Chưa tốt:**
  - Lịch sử git ở slice 0.2, 0.3 bị rối (commit `-a` gộp nhầm, phải dựng lại commit và force push). Từ đó luôn xem `git status`/`git log` trước khi commit.
  - Chèn slice 0.2 giữa chừng làm đánh số lại các slice sau, tài liệu cũ lệch số.
  - Bảng Plan trong slice doc vài lần lệch với code sau khi đổi cách làm, phải sửa lại sau review.
  - Số liệu đo ở các slice trước không cùng điều kiện (ví dụ 17s ở slice 0.5 là khi base image đã có), đến slice 0.7 mới đo lại có điều kiện rõ.
  - Chưa thử trên WSL (rủi ro ghi ở spec): mới chạy trên Linux.
- **Thay đổi cho phase sau:**
  - Ghi điều kiện đo ngay trong spec của phase, đo khi làm slice chứ không dồn về cuối.
  - Khi đổi cách làm so với plan, sửa bảng Plan trong slice doc ngay lúc đó.
  - Slice đầu tiên có lỗi nghiệp vụ (Contacts, 1.2) chốt format lỗi API và cập nhật CLAUDE.md.

## Câu chuyện cho CV (1–2 câu)

> Dựng nền tảng cho một CRM modular monolith (NestJS + React, pnpm/Turborepo) chạy hoàn toàn trong Docker: máy chỉ cần Docker và make, từ clone sạch `docker compose up` lên cả stack trong 46s (6s khi đã có cache), CI khoảng 1 phút, ranh giới module được ESLint ép và có test chứng minh rule còn hoạt động.
