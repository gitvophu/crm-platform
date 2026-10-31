# Roadmap

Monolith trước, tách service sau. Chỉ tách khi có lý do rõ ràng, ghi lại trong ADR (xem tiêu chí ở `adr/0001-modular-monolith.md`).

Chỉ viết `spec.md` + `plan.md` chi tiết cho **phase kế tiếp**. Các phase xa hơn chỉ giữ ở mức một dòng.

| Phase                  | Nội dung                                                                                   | Stack                                    | Trạng thái  |
| ---------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------- | ----------- |
| **0. Foundation**      | Monorepo, Docker Compose, CI, convention                                                   | pnpm + Turborepo, Docker, GitHub Actions | ✅ Xong     |
| **1. Core CRM**        | Auth đơn giản, Contacts, Companies, Deals, Activities, permission theo dòng, custom fields | NestJS, PostgreSQL, React                | ⏳ Đang làm |
| **1.5 Identity**       | Chuyển từ JWT tự viết sang OIDC, RBAC + ABAC                                               | Keycloak, OPA/Cedar                      | ⬜          |
| **2. Event-driven**    | #3 Event Backbone (Outbox, idempotent consumer) → #4 Notification → #7 Search              | **Redpanda, Symfony/PHP**, Meilisearch   | ⬜          |
| **3. Scale & Data**    | #6 Tracking Ingest (email open/click, web event) → #8 Analytics → #9 Import/Export         | **Go**, ClickHouse                       | ⬜          |
| **4. Automation & AI** | #5 Workflow Automation → #10 AI Service                                                    | Temporal, Python                         | ⬜          |
| **5. Mở rộng**         | #11 Omnichannel → #12 Integration Hub → #13 Portal → #14 DevOps                            | Tùy hứng thú                             | ⬜          |

## Lịch Phase 0 + 1

Lịch ban đầu là 8 tuần (Phase 0 một tuần). Phase 0 thực tế mất 2 tuần (2026-10-18 → 2026-10-31), nên Phase 1 giữ đủ scope và không đặt deadline cứng (spec Phase 1, Q4). Cột "Ước lượng" chỉ để tham khảo, thời gian thật ghi trong `phases/phase-1/plan.md`.

| Việc                                                    | Ước lượng               |
| ------------------------------------------------------- | ----------------------- |
| Phase 0                                                 | 1 tuần (thực tế 2 tuần) |
| 1.1 Khung web                                           | vài ngày                |
| 1.2 Auth + User/Team                                    | 1 tuần                  |
| 1.3 Contacts (module mẫu, làm kỹ, phân quyền theo dòng) | 1 tuần                  |
| 1.4 Companies                                           | 1 tuần                  |
| 1.5 Deals + Pipeline Kanban                             | 1 tuần                  |
| 1.6 Activities + Timeline                               | 1 tuần                  |
| 1.7 Custom fields                                       | 1 tuần                  |
| 1.8 Seed data + retro                                   | vài ngày                |
