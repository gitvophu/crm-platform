# CLAUDE.md

CRM platform cho công ty giả định _Nova Agency_ (agency digital marketing). Dự án thực hành nhiều stack. Xem `docs/00-vision.md`.

## Đọc trước khi làm

- `docs/00-vision.md`: scope và những gì KHÔNG làm
- `docs/02-workflow.md`: vòng lặp spec → plan → slice → review
- `docs/phases/<phase hiện tại>/plan.md`: danh sách slice và trạng thái
- `docs/phases/<phase hiện tại>/slices/<slice>.md`: spec, Q&A, plan của slice đang làm
- `docs/adr/`: các quyết định đã chốt, không làm ngược lại nếu chưa có ADR mới

## Quy tắc làm việc

- Chỉ implement đúng slice được yêu cầu. Ý tưởng ngoài scope ghi vào `docs/phases/backlog.md`.
- Mỗi slice: 1 branch `phase-N/slice-x-y-ten`, 1 PR, có test.
- Trước khi code một slice: viết slice doc theo `docs/phases/_template/slice.md`, hỏi Q&A để làm rõ, ghi câu trả lời vào file, chờ duyệt (✅). Chưa duyệt thì không code.
- Trình bày plan và chờ xác nhận trước khi tạo/sửa nhiều file.
- Quyết định kiến trúc mới → đề xuất ADR trong `docs/adr/`.
- Trước khi báo xong: chạy `make lint typecheck test` và đối chiếu `docs/review-checklist.md`.
- Host không cài Node (ADR-0002): mọi lệnh node/pnpm chạy qua `make`, không gọi `pnpm`/`node`/`npx` trực tiếp trên host.

## Kiến trúc (ADR-0001)

- Lõi CRM: một app NestJS, modular monolith.
- Mỗi module một schema PostgreSQL riêng, không join chéo schema.
- Module khác chỉ gọi qua public service của module, không import repository/entity của nhau.

## Convention

> TODO (slice 0.7): điền sau khi Phase 0 chốt tooling.

- Cấu trúc module:
- Đặt tên file/class:
- ORM / migration:
- Test:
- Format lỗi API:

## Lệnh thường dùng

Chạy trong container `dev` của `compose.yaml`, xem `make help`.

```bash
make install                       # pnpm install
make lint typecheck test build
make pnpm ARGS="add -D x --filter @crm/api"
make sh                            # shell trong container
```
