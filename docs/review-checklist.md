# Review checklist

Dùng cho mọi PR và khi review cuối phase.

## Scope

- [ ] Đúng scope trong `spec.md`/`plan.md`, không làm thừa
- [ ] Ý tưởng phát sinh đã ghi vào `phases/backlog.md` thay vì code luôn

## Chất lượng

- [ ] Unit test cho logic, integration test cho API, ít nhất 1 e2e cho happy path
- [ ] Validate input ở biên API, lỗi trả về đúng format chung
- [ ] Không import chéo module (chỉ qua public interface của module)
- [ ] Không có secret trong code/commit

## Dữ liệu

- [ ] Migration chạy được trên DB sạch và trên DB đang có dữ liệu. Chỉ roll forward: sửa sai bằng migration mới (ADR-0003)
- [ ] Index cho các cột filter/sort chính
- [ ] Phân quyền: đã test case user A KHÔNG thấy data của user B

## Vận hành

- [ ] `docker compose up` từ repo sạch vẫn chạy
- [ ] Log có request-id

## Tài liệu

- [ ] ADR cho quyết định kiến trúc mới (nếu có)
- [ ] `CLAUDE.md` cập nhật nếu có convention mới
- [ ] Ghi lại số liệu đo được (nếu phase yêu cầu)
