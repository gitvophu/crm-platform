# Roadmap

Monolith trước, tách service sau. Chỉ tách khi có lý do rõ ràng, ghi lại trong ADR (xem tiêu chí ở `adr/0001-modular-monolith.md`).

Chỉ viết `spec.md` + `plan.md` chi tiết cho **phase kế tiếp**. Các phase xa hơn chỉ giữ ở mức một dòng.

| Phase | Nội dung | Stack | Trạng thái |
|---|---|---|---|
| **0. Foundation** | Monorepo, Docker Compose, CI, convention | pnpm + Turborepo, Docker, GitHub Actions | ⏳ Đang làm |
| **1. Core CRM** | Auth đơn giản, Contacts, Companies, Deals, Activities, permission theo dòng, custom fields | NestJS, PostgreSQL, React | ⬜ |
| **1.5 Identity** | Chuyển từ JWT tự viết sang OIDC, RBAC + ABAC | Keycloak, OPA/Cedar | ⬜ |
| **2. Event-driven** | #3 Event Backbone (Outbox, idempotent consumer) → #4 Notification → #7 Search | **Redpanda, Symfony/PHP**, Meilisearch | ⬜ |
| **3. Scale & Data** | #6 Tracking Ingest (email open/click, web event) → #8 Analytics → #9 Import/Export | **Go**, ClickHouse | ⬜ |
| **4. Automation & AI** | #5 Workflow Automation → #10 AI Service | Temporal, Python | ⬜ |
| **5. Mở rộng** | #11 Omnichannel → #12 Integration Hub → #13 Portal → #14 DevOps | Tùy hứng thú | ⬜ |

## Lịch Phase 0 + 1 (8 tuần)

| Tuần | Việc |
|---|---|
| 1 | Phase 0 |
| 2 | 1.1 Auth + User/Team |
| 3 | 1.2 Contacts (module mẫu, làm kỹ) |
| 4 | 1.3 Companies |
| 5 | 1.4 Deals + Pipeline Kanban |
| 6 | 1.5 Activities + Timeline |
| 7 | 1.6 Permission theo dòng + 1.7 Custom fields |
| 8 | 1.8 Seed data + deploy demo + retro |
