# ADR-0001: Lõi CRM là modular monolith

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-10-18
- **Phase:** 0

## Bối cảnh

Contact, Company, Deal, Activity, User gắn chặt với nhau: hầu hết màn hình đều cần dữ liệu từ nhiều module. Team chỉ có 1 người. Mục tiêu học nhiều stack dễ dẫn tới việc chia microservices quá sớm.

## Các phương án

| Phương án                 | Ưu                                     | Nhược                                                               |
| ------------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| Microservices ngay từ đầu | Luyện được nhiều stack sớm             | Chi phí vận hành cao, dữ liệu phân tán, khó debug, chậm ra sản phẩm |
| Monolith thông thường     | Nhanh nhất                             | Dễ thành "big ball of mud", khó tách sau này                        |
| **Modular monolith**      | Nhanh, ranh giới rõ, tách được khi cần | Phải giữ kỷ luật ranh giới module                                   |

## Quyết định

Lõi CRM là **một app NestJS**, chia module theo bounded context:

- Mỗi module có **schema PostgreSQL riêng**, không join chéo schema.
- Module khác chỉ gọi qua **public service/interface** của module, không import repository/entity của nhau.
- Ranh giới được kiểm tra tự động bằng lint (dependency-cruiser hoặc eslint-plugin-boundaries).

Chỉ tách **service vệ tinh** khi thỏa ít nhất một tiêu chí:

1. Đặc tính tải khác hẳn phần lõi (ví dụ tracking event có lượng ghi gấp 1000 lần CRUD)
2. Có stack phù hợp hơn hẳn (Go cho ingest, Python cho AI, ClickHouse cho analytics)
3. Lỗi của nó không được làm sập phần lõi (gửi email, gọi API ngoài)
4. Giao tiếp được bất đồng bộ qua event

Mỗi lần tách service phải có ADR riêng dẫn chiếu tiêu chí trên.

## Hệ quả

- Tích cực: ra sản phẩm nhanh, có câu chuyện "khi nào KHÔNG dùng microservices" để kể khi phỏng vấn.
- Đánh đổi: phải review kỹ ranh giới module ở mỗi PR.
- Khi nào cần xem lại: khi một module đo được vấn đề về tải hoặc cô lập lỗi.
