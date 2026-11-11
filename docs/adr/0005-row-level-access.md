# ADR-0005: Phân quyền theo dòng bằng owner + team

- **Trạng thái:** Bị thay. Slice 1.4 (2026-11-10) bỏ scope theo team ở Contacts và xoá `src/access/`; ADR-0006 (slice 1.5) thay bằng quyền theo app kiểu Odoo (spec Phase 1, Q15)
- **Ngày:** 2026-11-05
- **Phase:** 1

## Bối cảnh

Nhân viên Nova Agency chỉ được thấy khách hàng của team mình (spec Phase 1, Q3). Mỗi user thuộc một team, có role `admin` / `manager` / `member` (ADR-0004, slice 1.2). Mọi thực thể nghiệp vụ (contact, company, deal, activity) cần cùng một quy tắc, làm từ Contacts (slice 1.3) rồi các module sau theo mẫu (spec Phase 1, Q10).

Ràng buộc: guard không đọc DB (ADR-0004), nên quyền phải tính được từ `SessionUser` (id, role, teamId) và chính bản ghi.

## Các phương án

| Phương án                                        | Ưu                                                        | Nhược                                                                                       |
| ------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Cột `owner_id`, `team_id` + lọc ở repository** | Đơn giản, test được bằng e2e, cùng một hàm cho mọi module | Dễ quên lọc ở một truy vấn mới, phải có test "team A không thấy team B" ở mọi module        |
| Row Level Security của PostgreSQL                | DB tự lọc, quên ở code cũng không lộ                      | Phải đặt biến phiên (`SET app.user_id`) cho mỗi transaction qua Prisma, khó debug, khó test |
| Thư viện ABAC (CASL)                             | Quy tắc khai báo, dùng chung cho api và web               | Thêm khái niệm và thư viện cho một ma trận 3 role nhỏ; Phase 1.5 sẽ xem lại phân quyền      |

## Quyết định

Chọn **cột `owner_id`, `team_id` trên mọi bảng nghiệp vụ, lọc và kiểm quyền trong code**, theo ma trận:

| Hành động               | admin                        | manager              | member                     |
| ----------------------- | ---------------------------- | -------------------- | -------------------------- |
| Xem danh sách, chi tiết | mọi team                     | team mình            | team mình                  |
| Sửa, lưu trữ, khôi phục | mọi bản ghi                  | mọi bản ghi của team | bản ghi mình là owner      |
| Chọn, đổi owner         | người trong team của bản ghi | người trong team     | không (owner luôn là mình) |

- Hàm dùng chung ở `apps/api/src/access/access.ts`: `teamScope(user)` (điều kiện `where` cho mọi truy vấn), `canSee`, `canEdit`, `canAssignOwner`. Không phụ thuộc module nào.
- Repository nhận `teamScope` ở **mọi** truy vấn đọc và ghi. Service kiểm `canEdit` trước khi sửa.
- Bản ghi không được thấy (team khác, id không tồn tại) → **404**, không để lộ là có tồn tại. Thấy nhưng không được sửa → **403**.
- API trả `permissions: { canEdit }` trong mỗi bản ghi; web dựa vào đó để hiện nút, quy tắc chỉ nằm ở server.
- `owner_id`, `team_id` là id của module identity, **không có FK** (ADR-0001). Owner phải thuộc team của bản ghi: service kiểm qua `UsersService` của identity.

## Hệ quả

- Tích cực: một chỗ cho quy tắc, đọc là hiểu; không cần extension DB hay thư viện.
- Đánh đổi:
  - An toàn phụ thuộc vào việc mọi truy vấn dùng `teamScope`. Bù lại: mỗi module có e2e cho từng role và "team khác → 404".
  - Role, team lấy từ access token: đổi team của user có hiệu lực chậm tối đa 15 phút (ADR-0004).
- Khi nào cần xem lại: Phase 1.5 (RBAC/ABAC đầy đủ, OIDC); khi có chia sẻ bản ghi giữa team; khi user thuộc nhiều team.
