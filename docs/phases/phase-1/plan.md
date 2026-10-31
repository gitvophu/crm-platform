# Phase 1: Core CRM · Plan

Mỗi slice đi xuyên DB → API → UI → test, là 1 PR. Mỗi slice có tài liệu Spec · Q&A · Plan riêng trong `slices/`, phải được duyệt trước khi code (xem `docs/02-workflow.md`). Lịch chỉ để ước lượng (spec, Q4): ghi ngày bắt đầu/kết thúc thật của từng slice.

| Slice | Nội dung                                                    | Tài liệu | Branch                            | Điểm cần review                                    | Trạng thái |
| ----- | ----------------------------------------------------------- | -------- | --------------------------------- | -------------------------------------------------- | ---------- |
| 1.1   | Khung web: router, Tailwind + shadcn/ui, layout, API client |          | `phase-1/slice-1-1-web-shell`     | Cấu trúc thư mục web, cách gọi API, xử lý lỗi      | ⬜         |
| 1.2   | Auth + user/team (seed)                                     |          | `phase-1/slice-1-2-auth`          | ADR auth, cookie, guard, seed                      | ⬜         |
| 1.3   | Contacts (module mẫu) + phân quyền theo dòng                |          | `phase-1/slice-1-3-contacts`      | ADR phân quyền, format lỗi API, mẫu module         | ⬜         |
| 1.4   | Companies + gắn contact với company                         |          | `phase-1/slice-1-4-companies`     | ADR tham chiếu chéo module, gọi service theo lô    | ⬜         |
| 1.5   | Deals + pipeline Kanban                                     |          | `phase-1/slice-1-5-deals`         | Giai đoạn pipeline, kéo thả, ghép dữ liệu 3 module | ⬜         |
| 1.6   | Activities + timeline                                       |          | `phase-1/slice-1-6-activities`    | Timeline đa thực thể                               | ⬜         |
| 1.7   | Custom fields                                               |          | `phase-1/slice-1-7-custom-fields` | Cách lưu, validate, hiển thị                       | ⬜         |
| 1.8   | Seed data Nova Agency + review phase                        |          | `phase-1/slice-1-8-seed`          | Dữ liệu giống thật, `review.md`                    | ⬜         |

Trạng thái: ⬜ Chưa bắt đầu · 📝 Đang viết tài liệu · 👀 Chờ review · ✅ Đã duyệt · 🚧 Đang làm · 🎉 Xong

## Chi tiết từng slice

### 1.1 Khung web

- **Kết quả:** web có router, layout (sidebar + nội dung), bộ component shadcn/ui, API client dùng chung. Trang trạng thái `/health` của Phase 0 chạy trong khung mới
- **Việc cần làm:**
  - [ ] TanStack Router (file-based, plugin Vite), route gốc + layout
  - [ ] Tailwind 4 + shadcn/ui, theme cơ bản
  - [ ] API client: gọi `/api/*`, parse lỗi theo một chỗ, chuẩn bị xử lý 401 (chuyển tới login ở 1.2)
  - [ ] Trang 404, trạng thái loading/lỗi dùng chung
- **Test:** component test layout + điều hướng, API client với MSW
- **Demo:** `make up`, mở web thấy layout, điều hướng giữa các trang

### 1.2 Auth + user/team

- **Kết quả:** đăng nhập bằng user seed, mọi API (trừ `/health`, login) yêu cầu đăng nhập, web chuyển tới login khi chưa đăng nhập
- **Việc cần làm:**
  - [ ] ADR-0004: auth bằng JWT trong cookie httpOnly
  - [ ] Module `identity` (schema `identity`): user, team, role, mật khẩu argon2
  - [ ] `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, đổi mật khẩu
  - [ ] Guard toàn cục, decorator lấy user hiện tại, route public
  - [ ] Seed/CLI tạo team và user (`make seed`)
  - [ ] Web: trang login, giữ phiên, đăng xuất, đổi mật khẩu
- **Test:** e2e đăng nhập/đăng xuất, gọi API không có cookie → 401, cookie hết hạn/sai chữ ký → 401
- **Demo:** đăng nhập bằng user seed, thấy tên mình trên header, đăng xuất

### 1.3 Contacts (module mẫu)

- **Kết quả:** CRUD contact, danh sách lọc/sắp xếp/phân trang, chỉ thấy contact của team mình. Là mẫu cho các module sau
- **Việc cần làm:**
  - [ ] ADR-0005: mô hình phân quyền owner + team
  - [ ] Module `contacts` (schema `contacts`) theo convention: controller, service, repository, DTO, validation
  - [ ] Lọc quyền trong repository, kiểm quyền sửa/xoá
  - [ ] Format lỗi API + global exception filter (đóng mục backlog), cập nhật CLAUDE.md
  - [ ] Convention phân trang, lọc, sắp xếp cho mọi danh sách
  - [ ] Web: danh sách (TanStack Table, filter/sort trên URL), form tạo/sửa, chi tiết
- **Test:** unit service, e2e CRUD, test phân quyền (team A không thấy team B, member không sửa của người khác)
- **Demo:** user team A và team B đăng nhập, mỗi người chỉ thấy contact của team mình

### 1.4 Companies

- **Kết quả:** CRUD company, contact gắn với company, danh sách contact hiện tên company, chi tiết company liệt kê contact
- **Việc cần làm:**
  - [ ] ADR-0006: tham chiếu chéo module bằng id, không FK, gọi service theo lô, xử lý bản ghi đã xoá
  - [ ] Module `companies` theo mẫu Contacts
  - [ ] `contact.company_id`, public service `getByIds` của companies
  - [ ] Web: danh sách, chi tiết company, chọn company trong form contact
- **Test:** như Contacts + ghép dữ liệu không N+1, xoá company đang được tham chiếu
- **Demo:** mở company thấy các contact thuộc company đó

### 1.5 Deals + pipeline Kanban

- **Kết quả:** deal (hợp đồng one-off hoặc retainer) gắn contact/company, đi qua các giai đoạn pipeline, kéo thả trên Kanban
- **Việc cần làm:**
  - [ ] Module `deals`, giai đoạn pipeline (cố định hay cấu hình được: hỏi trong slice doc)
  - [ ] Đổi giai đoạn, giá trị deal, loại hợp đồng
  - [ ] Web: Kanban kéo thả, danh sách, chi tiết deal
- **Test:** như Contacts + đổi giai đoạn, ghép dữ liệu contact/company
- **Demo:** kéo deal từ "Đề xuất" sang "Thắng", reload vẫn giữ

### 1.6 Activities + timeline

- **Kết quả:** ghi call, meeting, note gắn với contact/company/deal, timeline hiện trên trang chi tiết của từng thực thể
- **Việc cần làm:**
  - [ ] Module `activities`, gắn với nhiều loại thực thể bằng (type, id)
  - [ ] Timeline API theo thực thể, phân trang
  - [ ] Web: form ghi activity, timeline trên các trang chi tiết
- **Test:** như Contacts + timeline đúng thứ tự, đúng quyền
- **Demo:** ghi một cuộc gọi cho contact, thấy trên timeline của contact và deal liên quan

### 1.7 Custom fields

- **Kết quả:** admin định nghĩa trường tuỳ biến (text, số, ngày, lựa chọn) cho một số thực thể, nhập và hiển thị được giá trị
- **Việc cần làm:**
  - [ ] Cách lưu (JSONB hay bảng riêng), validate theo định nghĩa: hỏi trong slice doc
  - [ ] Áp cho ít nhất contact và deal
  - [ ] Web: form và chi tiết hiện trường tuỳ biến
- **Test:** validate theo kiểu, phân quyền như thực thể gốc
- **Demo:** thêm trường "Ngân sách hàng tháng" cho deal, nhập và thấy trên chi tiết

### 1.8 Seed data Nova Agency + review phase

- **Kết quả:** `make seed` tạo dữ liệu giống agency thật (team, user, khách hàng, deal, activity), `review.md` của Phase 1
- **Việc cần làm:**
  - [ ] Seed có kịch bản: vài team, account manager, client theo ngành, deal retainer/one-off, lịch sử activity
  - [ ] Xem lại Q8 (số liệu): seed lớn để đo nếu quyết định đo
  - [ ] `review.md`, cập nhật CLAUDE.md, tag `phase-1`
- **Demo:** `make seed`, đăng nhập bằng các role khác nhau và đi qua toàn bộ luồng
