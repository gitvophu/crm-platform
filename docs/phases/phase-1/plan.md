# Phase 1: CRM · Plan

Mỗi slice đi xuyên DB → API → UI → test, là 1 PR. Mỗi slice có tài liệu Spec · Q&A · Plan riêng trong `slices/`, phải được duyệt trước khi code (xem `docs/02-workflow.md`). Lịch chỉ để ước lượng (spec, Q4): ghi ngày bắt đầu/kết thúc thật của từng slice.

Slice 1.4 trở đi viết lại ngày 2026-11-09 theo mô hình Odoo 19.0 (spec, Q13–Q23). 1.1–1.3 giữ nguyên.

| Slice | Nội dung                                                    | Yêu cầu          | Tài liệu                       | Branch                              | Điểm cần review                                                | Trạng thái |
| ----- | ----------------------------------------------------------- | ---------------- | ------------------------------ | ----------------------------------- | -------------------------------------------------------------- | ---------- |
| 1.1   | Khung web: router, Tailwind + shadcn/ui, layout, API client |                  | [1.1](slices/1.1-web-shell.md) | `phase-1/slice-1-1-web-shell`       | Cấu trúc thư mục web, cách gọi API, xử lý lỗi                  | 🎉         |
| 1.2   | Auth + user/team (seed)                                     | AUTH-01, AUTH-02 | [1.2](slices/1.2-auth.md)      | `phase-1/slice-1-2-auth`            | ADR auth, cookie, guard, seed                                  | 🎉         |
| 1.3   | Contacts (module mẫu) + phân quyền theo dòng                |                  | [1.3](slices/1.3-contacts.md)  | `phase-1/slice-1-3-contacts`        | ADR phân quyền, format lỗi API, mẫu module                     | 🎉         |
| 1.4   | Contacts theo `res.partner`: công ty + người một bảng       | CON-01..04       | [1.4](slices/1.4-partners.md)  | `phase-1/slice-1-4-partners`        | Cây công ty → người, bỏ scope theo team                        | 🎉         |
| 1.5   | Settings: user, quyền theo app, Sales Team                  | SET-01..04       |                                | `phase-1/slice-1-5-settings`        | ADR quyền theo app (thay ADR-0005), `access.ts`, `SessionUser` | ⬜         |
| 1.6   | Lead / Opportunity + pipeline Kanban                        | CRM-01..10       |                                | `phase-1/slice-1-6-leads`           | ADR tham chiếu chéo module, record rule Own/All, Won/Lost      | ⬜         |
| 1.7   | Activity + chatter                                          | ACT-01..05       |                                | `phase-1/slice-1-7-activities`      | Bản ghi polymorphic, kiểm quyền qua module sở hữu              | ⬜         |
| 1.8   | Form website + chia lead tự động                            | CRM-11..14       |                                | `phase-1/slice-1-8-lead-assignment` | Endpoint công khai, rate limit, xoay vòng đồng thời            | ⬜         |
| 1.9   | Seed data Nova + review phase                               |                  |                                | `phase-1/slice-1-9-seed`            | Dữ liệu giống thật, `review.md`                                | ⬜         |

Trạng thái: ⬜ Chưa bắt đầu · 📝 Đang viết tài liệu · 👀 Chờ review · ✅ Đã duyệt · 🚧 Đang làm · 🎉 Xong

## Chi tiết từng slice

1.1–1.3: xem slice doc. Phần dưới là slice còn lại; chi tiết chốt trong slice doc qua Q&A.

### 1.4 Contacts theo `res.partner`

- **Kết quả:** một bảng contact cho công ty và người; người thuộc công ty; mọi nhân viên thấy mọi contact
- **Việc cần làm:**
  - [ ] Đổi schema `contacts`: `is_company`, `parent_id`, `salesperson_id`, địa chỉ, MST, ngành, tag; bỏ `owner_id`, `team_id`
  - [ ] Bỏ `teamScope` khỏi contacts (quyền tạm: mọi user đăng nhập xem, sửa); ghi ADR-0005 bị thay một phần
  - [ ] API: lọc loại, công ty, tag, salesperson; con của một công ty; archive / restore
  - [ ] Web: danh sách có cột công ty, form chọn loại + công ty cha (combobox tìm trên server), chi tiết công ty liệt kê người
- **Test:** e2e CRUD, cây cha-con (không vòng, cha phải là công ty), archive; web test các trang
- **Demo:** mở Greenleaf Coffee thấy Hana và các người liên hệ khác

### 1.5 Settings: user, quyền theo app, Sales Team

- **Kết quả:** quản trị viên quản lý user và mức quyền Sales; Sales Administrator quản lý Sales Team; quyền tính theo app
- **Việc cần làm:**
  - [ ] ADR-0006: quyền theo app kiểu Odoo, thay ADR-0005
  - [ ] Identity: bỏ `role`, `team_id`; thêm `sales_access`, `is_system_admin`, archive user; cập nhật `SessionUser`, JWT, guard
  - [ ] Sales Team + thành viên (nhiều team, leader, capacity, tạm dừng); chốt module đặt Sales Team
  - [ ] `access.ts` viết lại theo app (helper kiểm Own/All/Admin)
  - [ ] Web: khu Settings (Users, Sales Teams), ẩn menu theo quyền
- **Test:** e2e từng mức quyền, archive user không đăng nhập được, quản trị viên cuối cùng
- **Demo:** tạo user mới mức Own Documents, thêm vào Sales Team SME, đăng nhập bằng user đó

### 1.6 Lead / Opportunity + pipeline Kanban

- **Kết quả:** sales tạo lead/opportunity, convert, kéo stage trên Kanban, Won/Lost/Restore, thấy đúng theo Own/All
- **Việc cần làm:**
  - [ ] ADR-0007: tham chiếu chéo module bằng id, gọi theo lô, bản ghi đích đã archive
  - [ ] Module `crm`: lead, stage (seed, theo team), lost reason, tag; `won_status`
  - [ ] Convert lead (chọn hoặc tạo contact qua public service của contacts)
  - [ ] Web: danh sách lead, Kanban opportunity (kéo thả, thứ tự), chi tiết, form, hộp Lost
  - [ ] Chi tiết công ty (contacts) hiện opportunity của nó
- **Test:** record rule Own/All (404, 403), convert, Won/Lost/Restore, kéo thả, ghép dữ liệu không N+1
- **Demo:** convert lead của Hana, kéo qua Proposition, đánh Won

### 1.7 Activity + chatter

- **Kết quả:** lên lịch activity, đánh xong, note, chatter tự ghi thay đổi trên contact và lead/opportunity
- **Việc cần làm:**
  - [ ] Chốt module (`mail` hay tên khác), bản ghi polymorphic `(res_model, res_id)`, kiểm quyền qua module sở hữu
  - [ ] Activity type (seed), activity, "My activities"
  - [ ] Message: note, activity done, tracking field từ module `crm` (gọi public service hoặc event nội bộ)
  - [ ] Web: khung chatter dùng chung, hộp lên lịch activity, trạng thái activity trên Kanban
- **Test:** quyền theo bản ghi đích, thứ tự chatter, tracking đúng field
- **Demo:** lên lịch cuộc gọi cho opportunity, đánh xong, thấy trong chatter cùng lịch sử đổi stage

### 1.8 Form website + chia lead tự động

- **Kết quả:** khách gửi form → lead → tự vào đúng team và salesperson → opportunity
- **Việc cần làm:**
  - [ ] Endpoint công khai tạo lead, honeypot, rate limit; trang form demo
  - [ ] Rule chia lead của team (điều kiện đơn giản), xoay vòng theo capacity, tạm dừng; nút "Assign leads"
  - [ ] Xử lý đồng thời (khoá hoặc transaction)
  - [ ] Web: cấu hình rule trong Sales Team, form demo
- **Test:** rule khớp/không khớp, xoay vòng đều, capacity, tạm dừng, spam
- **Demo:** gửi form với quy mô 30 cửa hàng → lead vào Key Accounts, gán cho Linh

### 1.9 Seed data Nova + review phase

- **Kết quả:** `make seed` tạo dữ liệu giống Nova (team, user mọi mức quyền, contact, lead/opportunity ở mọi stage, activity, chatter), `review.md` của Phase 1
- **Việc cần làm:**
  - [ ] Seed theo cơ cấu và câu chuyện trong vision
  - [ ] `review.md`, cập nhật CLAUDE.md, tag `phase-1`
- **Demo:** `make seed`, đăng nhập lần lượt các mức quyền, đi hết quy trình A
