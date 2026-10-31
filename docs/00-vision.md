# Vision: CRM Platform

> Kim chỉ nam cho mọi quyết định scope. Khi phân vân "có nên làm X không?", đối chiếu với file này.

## Bối cảnh

- **Công ty giả định:** _Nova Agency_, agency digital marketing quy mô ~50 người (sale, account manager, marketer).
- **Khách hàng của Nova:** các brand/doanh nghiệp thuê dịch vụ (ads, SEO, content, social).
- **Mục tiêu dự án:** thực hành nhiều tech stack trên một domain thật, đưa vào CV với **vấn đề đã giải quyết + số liệu đo được**.
- **Nguyên tắc ưu tiên:** mục tiêu học > tính năng kinh doanh. Nhưng mỗi tính năng phải có use case hợp lý với một agency.

## Use case đặc thù ngành agency

| Use case                                                             | Module liên quan                 |
| -------------------------------------------------------------------- | -------------------------------- |
| Lead đến từ form landing page, campaign ads, giới thiệu              | Leads, Tracking (#6)             |
| Deal = hợp đồng dịch vụ (one-off hoặc retainer hàng tháng)           | Deals / Pipeline                 |
| Account manager chăm sóc nhiều client, chỉ thấy client của team mình | Permissions                      |
| Gửi email nurture, theo dõi open/click                               | Notification (#4), Tracking (#6) |
| Báo cáo doanh thu theo dịch vụ / sale / tháng                        | Analytics (#8)                   |

## Stack

| Vai trò          | Stack                                                                               |
| ---------------- | ----------------------------------------------------------------------------------- |
| Core CRM         | NestJS, PostgreSQL, React, TanStack Query                                           |
| Stack luyện thêm | **Go** (Tracking Ingest), **Symfony/PHP + Redpanda** (Event Backbone, Notification) |
| Hạ tầng          | Docker Compose ở local, chỉ deploy phần cần demo                                    |

## Mục tiêu thời gian

| Mốc                 | Thời hạn                                                    | Kết quả                                 |
| ------------------- | ----------------------------------------------------------- | --------------------------------------- |
| Phase 0 + Phase 1   | Không deadline cứng (ước lượng ban đầu 8 tuần, xem roadmap) | CRM dùng được, có seed data Nova Agency |
| Link demo công khai | Sau Phase 1                                                 | Bỏ khỏi Phase 1 (spec Phase 1, Q11)     |
| Phase 2 trở đi      | Chưa chốt                                                   | Lên kế hoạch khi Phase 1 xong           |

## Ngoài phạm vi (ít nhất đến hết Phase 1)

- Microservices cho phần lõi
- Kubernetes, IaC, service mesh
- Keycloak / OIDC / ABAC (để sang Phase 1.5)
- Đồng bộ Gmail/Calendar
- Mobile app
