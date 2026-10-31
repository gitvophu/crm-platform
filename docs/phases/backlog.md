# Backlog

Ý tưởng phát sinh giữa chừng ghi vào đây, KHÔNG code ngay. Xem lại khi lên spec cho phase kế tiếp.

| Ngày       | Ý tưởng                                                                                                                                                         | Phase dự kiến             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 2026-10-18 | Nâng TypeScript lên 7.x khi `typescript-eslint` và `@nestjs/cli` hỗ trợ (slice 0.1, Q5)                                                                         | Khi hệ sinh thái sẵn sàng |
| 2026-10-18 | Git hooks (husky + lint-staged) chạy lint/format trên file staged (slice 0.1, Q11)                                                                              | Chưa chốt                 |
| 2026-10-25 | Tự watch `packages/shared` khi stack đang chạy (service `tsc --watch` + `node --watch` cho api, đã thử chạy được), thay cho `make restart` (slice 0.5, Q4)      | Khi shared thay đổi nhiều |
| 2026-10-31 | Chốt format body lỗi API (RFC 9457 Problem Details hoặc format riêng, có `requestId`) + global exception filter, khi có validation/404/409 thật (slice 0.7, Q5) | Slice 1.3 (Contacts)      |
| 2026-10-31 | Dark mode: thêm khối token `.dark` (theme shadcn), nút chuyển theme, Sonner theo theme (slice 1.1, Q7)                                                          | Chưa chốt                 |
