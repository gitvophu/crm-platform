# ADR-0003: Prisma 7 làm ORM và công cụ migration

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-10-24
- **Phase:** 0

## Bối cảnh

API NestJS cần ORM và công cụ migration cho PostgreSQL. Ràng buộc từ ADR-0001: mỗi module có schema PG riêng, không join chéo schema, và module khác không dùng trực tiếp repository hay entity của nhau.

Bản ổn định ngày 2026-10-22: Prisma 7.10.1, Drizzle 0.45.4 (1.0 đang rc), TypeORM 1.1.2, MikroORM 7.2.5.

## Các phương án

| Phương án    | Ưu                                                                                       | Nhược                                                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prisma 7** | DX tốt, type-safe, phổ biến nhất, multi-schema (`@@schema`), schema chia được nhiều file | Một client chung nên module nào cũng truy cập được bảng của module khác; cho phép relation chéo schema; có bước generate; không có down migration |
| Drizzle 0.45 | Bảng khai báo trong module nên lint chặn được import chéo; query gần SQL; không codegen  | 1.0 chưa ổn định, sẽ phải nâng; không có unit of work                                                                                             |
| MikroORM 7   | Unit of Work, Identity Map, hợp DDD                                                      | Học lâu nhất, cộng đồng nhỏ hơn                                                                                                                   |
| TypeORM 1.x  | Cách truyền thống của NestJS                                                             | Lịch sử nhiều bug về type và migration, ít điểm học mới                                                                                           |

## Quyết định

Chọn **Prisma 7** (ghim `7.10.x`, vì tag `latest` của CLI `prisma` đang trỏ vào bản 8.0 rc), dùng driver adapter `@prisma/adapter-pg`:

- Schema chia file theo module trong `apps/api/prisma/schema/`, mỗi model khai báo `@@schema("<module>")`.
- Một lịch sử migration chung (`apps/api/prisma/migrations/`), chạy bằng `make migrate`.
- Giữ ranh giới module bằng quy ước: chỉ `*.repository.ts` của module được inject `PrismaService` và chỉ đụng model của schema mình. Không khai báo `@relation` chéo schema. Lint (slice 0.6) chặn import `PrismaService` ngoài repository.
- Chỉ roll forward: không viết down migration, sửa sai bằng migration mới.

Chi tiết ở [slice 0.3](../phases/phase-0/slices/0.3-api-db.md).

## Hệ quả

- Tích cực: viết query nhanh, type-safe, tài liệu và cộng đồng lớn. Kỹ năng Prisma được đánh giá cao trên CV.
- Đánh đổi:
  - Ranh giới module chỉ được kiểm tra một phần bằng lint; phần truy cập model của module khác qua client chung phải bắt khi review.
  - Không rollback nhanh được migration lỗi.
  - Thêm bước `prisma generate` (task `generate` trong turbo).
- Khi nào cần xem lại: khi review bắt được vi phạm ranh giới lặp lại nhiều lần, hoặc khi tách module thành service (lúc đó cần client và migration riêng).
