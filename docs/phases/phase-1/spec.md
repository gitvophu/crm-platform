# Phase 1: Core CRM · Spec

## Mục tiêu

Nhân viên Nova Agency đăng nhập và quản lý được khách hàng của mình: contact, company, deal theo pipeline, lịch sử hoạt động. Mỗi người chỉ thấy dữ liệu của team mình. Mỗi thực thể là một module riêng của modular monolith (ADR-0001), nên đây cũng là phase kiểm chứng cách ghép dữ liệu giữa các module không join chéo schema.

## Trong phạm vi

- **Khung web:** TanStack Router, Tailwind 4 + shadcn/ui, layout, API client, xử lý lỗi và 401
- **Auth đơn giản:** đăng nhập email + mật khẩu, JWT trong cookie httpOnly, đăng xuất, đổi mật khẩu
- **User, team, role:** chỉ tạo bằng seed. Mỗi user thuộc một team, role `admin` / `manager` / `member`
- **Contacts** (module mẫu): CRUD, danh sách có lọc, sắp xếp, phân trang, phân quyền theo dòng
- **Companies:** CRUD, contact gắn với company
- **Deals + pipeline:** deal gắn contact/company, các giai đoạn pipeline, màn hình Kanban
- **Activities + timeline:** ghi call, meeting, note; timeline trên contact, company, deal
- **Custom fields:** admin định nghĩa thêm trường cho một số thực thể
- **Seed data Nova Agency:** team, user, contact, company, deal, activity giống thật
- **Phân quyền theo dòng** cho mọi thực thể nghiệp vụ, làm từ Contacts
- **Format lỗi API** dùng chung (backlog từ slice 0.7), chốt ở Contacts

## Ngoài phạm vi

- Đăng ký công khai, mời qua email, màn hình quản trị user/team (Q7: chỉ seed)
- Deploy, link demo công khai (Q11: để phase sau)
- OIDC, Keycloak, RBAC/ABAC đầy đủ (Phase 1.5)
- Tìm kiếm full-text (Meilisearch, Phase 2), gửi email, notification (Phase 2)
- Import/export (Phase 3), lead từ form/ads, tracking
- User thuộc nhiều team

## Quyết định đã chốt (Q&A, 2026-10-31)

| #   | Câu hỏi              | Quyết định                                                                                                                                                                                                                                             | Lý do / ghi chú                                                                                                                                 |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Chia module          | Mỗi thực thể một module, một schema: `identity`, `contacts`, `companies`, `deals`, `activities` (+ module custom fields). Tham chiếu chéo bằng id, không FK chéo schema. Màn hình cần dữ liệu nhiều module thì gọi public service theo lô (`getByIds`) | Đúng ADR-0001, là điểm thực hành chính của phase. Đổi lại phải tự ghép dữ liệu, xử lý tham chiếu tới bản ghi đã xoá. ADR viết ở slice Companies |
| Q2  | Auth                 | Email + mật khẩu (argon2). Server ký JWT, đặt trong cookie httpOnly, `SameSite=Lax`. Web và api cùng origin nhờ proxy nên không cần CORS                                                                                                               | Đơn giản nhất. Đánh đổi: logout chỉ xoá cookie, không thu hồi được token trước khi hết hạn. Phase 1.5 thay bằng OIDC. ADR viết ở slice Auth     |
| Q3  | Phân quyền           | Mỗi bản ghi có `owner_id`, `team_id`. `admin`: thấy, sửa tất cả. `manager`: thấy, sửa mọi bản ghi của team. `member`: thấy bản ghi của team, chỉ sửa bản ghi mình sở hữu. Mỗi user một team                                                            | Đúng use case "account manager chỉ thấy client của team mình". ADR viết ở slice Contacts                                                        |
| Q4  | Lịch                 | Giữ đủ scope, bỏ deadline cứng. Lịch tuần trong roadmap chỉ để ước lượng                                                                                                                                                                               | Phase 0 mất 2 tuần thay vì 1. Ghi thời gian thật từng slice để rút kinh nghiệm ước lượng                                                        |
| Q5  | UI                   | Tailwind 4 + shadcn/ui, bảng dùng TanStack Table                                                                                                                                                                                                       | Phổ biến, tuỳ biến tự do. Đóng mục backlog từ slice 0.4                                                                                         |
| Q6  | Router               | TanStack Router                                                                                                                                                                                                                                        | Type-safe cả search params, hợp với danh sách lọc/sắp xếp trên URL, đi cùng TanStack Query                                                      |
| Q7  | Quản lý user         | Chỉ seed (hoặc lệnh CLI), không có màn hình quản trị                                                                                                                                                                                                   | Đủ cho phase này                                                                                                                                |
| Q8  | Số liệu              | Chưa đo trong Phase 1                                                                                                                                                                                                                                  | Lệch nguyên tắc 5 của `02-workflow.md` ("mỗi phase ít nhất 1 con số"), xem rủi ro                                                               |
| Q9  | Khung web            | Slice riêng (1.1) trước Auth                                                                                                                                                                                                                           | Slice nhỏ hơn, Auth tập trung vào identity                                                                                                      |
| Q10 | Thời điểm phân quyền | Từ Contacts (1.3), mọi module sau theo mẫu. Không có slice phân quyền riêng                                                                                                                                                                            | Không phải sửa lại module đã xong, mỗi module có test "user team A không thấy data team B" ngay từ đầu                                          |
| Q11 | Deploy               | Bỏ khỏi Phase 1                                                                                                                                                                                                                                        | Vision và roadmap đã cập nhật                                                                                                                   |
| Q12 | ADR                  | Viết trong slice dùng đến: auth (1.2), phân quyền (1.3), tham chiếu chéo module (1.4)                                                                                                                                                                  | Ghi kèm chi tiết kỹ thuật thật thay vì đoán trước                                                                                               |

## Tiêu chí hoàn thành (Definition of Done)

- [ ] `make up` + seed → đăng nhập bằng user seed, thấy contact/company/deal/activity của team mình
- [ ] User team A gọi API không thấy, không sửa được dữ liệu team B (test tự động ở mọi module)
- [ ] `member` không sửa được bản ghi của người khác trong team, `manager` thì được
- [ ] Deal kéo thả qua các giai đoạn trên Kanban, lưu được
- [ ] Timeline của contact/company/deal hiện đúng activity
- [ ] Thêm custom field cho một thực thể, nhập và hiển thị được giá trị
- [ ] Không module nào join hay import ruột module khác (lint ranh giới xanh)
- [ ] Format lỗi API thống nhất, có trong CLAUDE.md
- [ ] ADR: auth, phân quyền, tham chiếu chéo module
- [ ] CI xanh, `make lint typecheck test build` pass

## Số liệu cần đo

Chưa đo trong Phase 1 (Q8). Khi cần, ứng viên đã bàn:

| Chỉ số                                     | Cách đo                                                                      | Ghi chú                         |
| ------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------- |
| p95 `GET /contacts` có lọc quyền, seed lớn | k6 / autocannon, trước và sau index                                          |                                 |
| Chi phí ghép dữ liệu giữa module           | Danh sách deal có tên contact/company: gọi theo lô so với từng bản ghi (N+1) | Câu chuyện cho modular monolith |
| Thời gian seed, bundle web                 | Đo tay                                                                       | Ghi mốc                         |

## Rủi ro / câu hỏi mở

- **Không có con số nào cho Phase 1** (Q8) trái với nguyên tắc 5 của workflow. Xem lại trước slice 1.8 (seed): seed lớn là lúc dễ đo p95 nhất.
- **Ghép dữ liệu giữa module** có thể chậm hoặc rườm rà (lọc deal theo tên company, sắp xếp theo trường của module khác). Nếu gặp nhiều, cân nhắc read model hoặc gộp module, phải có ADR.
- **Tham chiếu tới bản ghi đã xoá** khi không có FK: xoá mềm, chặn xoá khi còn tham chiếu, hay để trống. Chốt ở slice Companies.
- **Custom fields** (lưu JSONB hay bảng EAV, lọc theo trường tuỳ biến) có thể lớn hơn ước lượng.
- **JWT không thu hồi được:** chọn thời hạn ngắn vừa phải ở slice Auth.
