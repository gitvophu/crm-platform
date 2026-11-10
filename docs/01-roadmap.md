# Roadmap

Chia phase theo nghiệp vụ, đi theo vòng đời khách hàng của Nova: lead → báo giá → hợp đồng → hỗ trợ (`00-vision.md`, mục "Quy trình end-to-end"). Mỗi stack vào đúng phase có nghiệp vụ cần nó.

Monolith trước, tách service sau. Chỉ tách khi có lý do rõ ràng, ghi lại trong ADR (tiêu chí ở `adr/0001-modular-monolith.md`).

Chỉ viết `spec.md` + `plan.md` chi tiết cho **phase kế tiếp**. Các phase xa hơn chỉ giữ ở mức ở bảng dưới.

| Phase                                | Nghiệp vụ (app, quy trình trong vision)                                                                                  | Stack mới                                                               | Trạng thái  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ----------- |
| **0. Foundation**                    | Monorepo, Docker Compose, CI, convention                                                                                 | pnpm + Turborepo, Docker, GitHub Actions                                | ✅ Xong     |
| **1. CRM**                           | Contacts, Sales Team, phân quyền theo Odoo, lead/opportunity, pipeline Kanban, activity, chatter. Quy trình A            | NestJS, PostgreSQL, React                                               | ⏳ Đang làm |
| **2. Sales + Subscriptions**         | Dịch vụ, gói giá, quotation template, quotation, sales order, subscription (renew, upsell, pause, close). Quy trình B, C | **Redpanda** (outbox), **service notifications** (NestJS), **Temporal** | ⬜          |
| **3. Helpdesk + Live chat + Portal** | Helpdesk team, ticket, SLA, ticket từ email; live chat trên website; portal cho khách. Quy trình D, E, F                 | **Keycloak** (OIDC), WebSocket                                          | ⬜          |
| **4. Deploy + vận hành**             | Link demo công khai, CI/CD deploy, log, metric, trace                                                                    | Chọn khi tới phase                                                      | ⬜          |
| **5. AI**                            | Tóm tắt chatter và ticket, gợi ý trả lời chat, chấm điểm lead, chatbot live chat                                         | **Python**                                                              | ⬜          |

## Stack theo phase

| Stack                                        | Phase | Nghiệp vụ đầu tiên dùng                                                   | Dùng lại ở                        |
| -------------------------------------------- | ----- | ------------------------------------------------------------------------- | --------------------------------- |
| **Redpanda** + outbox                        | 2     | Quotation gửi, ký; sales order xác nhận; subscription sắp tới hạn         | 3: ticket mới, tin nhắn chat      |
| **Service notifications** (NestJS app riêng) | 2     | Gửi email báo giá, xác nhận đơn, nhắc gia hạn; thông báo trong app        | 3: thông báo ticket, SLA, chat    |
| **Temporal**                                 | 2     | Quotation hết hạn, nhắc gia hạn subscription trước N ngày                 | 3: SLA ticket                     |
| **Keycloak**                                 | 3     | Slice đầu phase 3: chuyển đăng nhập nhân viên sang OIDC, realm cho portal | 5: service AI xác thực bằng token |
| **Python**                                   | 5     | Service AI đọc dữ liệu qua API hoặc event                                 |                                   |

Service notifications là app NestJS riêng trong monorepo (`apps/notifications`), đọc event từ Redpanda. Không dùng PHP: điểm cần học là kiến trúc event (outbox, consumer idempotent, retry, dead-letter, hợp đồng event), dùng lại convention có sẵn nhanh hơn. Thư viện Kafka cho Node (KafkaJS đã ngừng phát triển) chốt ở slice.

## Bỏ khỏi roadmap cũ

| Mục cũ                                                    | Lý do                                                                        |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Companies, Deals tách riêng                               | Theo Odoo: một bảng partner cho công ty và người, lead/opportunity cùng bảng |
| Phân quyền theo team (ADR-0005), RBAC/ABAC, OPA           | Theo Odoo: quyền theo app (own / all / admin), team không giới hạn dữ liệu   |
| Symfony/PHP                                               | Thay bằng service notifications viết bằng NestJS (xem trên)                  |
| Go, ClickHouse, tracking ingest, analytics                | Báo cáo, tracking nằm ngoài phạm vi vision                                   |
| Meilisearch                                               | Tìm kiếm bằng PostgreSQL đủ cho quy mô Nova                                  |
| Import/Export, Integration Hub, Omnichannel ngoài website | Ngoài phạm vi vision; ý tưởng giữ ở `phases/backlog.md`                      |

## Lịch

Không đặt deadline cứng (spec Phase 1, Q4). Thời gian thật của từng slice ghi trong `phases/phase-N/plan.md`.

| Phase   | Thực tế                                                    |
| ------- | ---------------------------------------------------------- |
| Phase 0 | 2 tuần (2026-10-18 → 2026-10-31), ước lượng ban đầu 1 tuần |
| Phase 1 | Đang làm, slice 1.1–1.3 xong                               |
