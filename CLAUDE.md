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
- Slice có màn hình mới hoặc đổi giao diện: làm design trước khi xin duyệt. Mockup HTML bấm được, giống thật (Tailwind + token của shadcn), lưu ở `docs/phases/<phase>/design/<slice>.html`, review bằng cách mở file trên máy (`xdg-open`). Chỉ publish thành artifact khi user yêu cầu (xem trên điện thoại, gửi người khác). Slice doc có mục Design (đường dẫn file, điểm cần chú ý). Design được duyệt cùng slice doc, code bám theo design; lệch thì ghi ở "Ghi chú khi implement".
- Trình bày plan và chờ xác nhận trước khi tạo/sửa nhiều file.
- Quyết định kiến trúc mới → đề xuất ADR trong `docs/adr/`.
- Trước khi báo xong: chạy `make lint typecheck test` và đối chiếu `docs/review-checklist.md`.
- Implement xong một slice: chạy subagent với skill `/code-review` để review thay đổi của slice. Main agent xem từng điểm, sửa điểm hợp lý, điểm cần quyết định thiết kế thì hỏi, rồi chạy lại `make lint typecheck test`. Chỉ một vòng review. Báo cáo cuối liệt kê điểm đã sửa và điểm không sửa kèm lý do. Sau bước này mới báo slice xong.
- Host không cài Node (ADR-0002): mọi lệnh node/pnpm chạy qua `make`, không gọi `pnpm`/`node`/`npx` trực tiếp trên host.

## Kiến trúc (ADR-0001)

- Lõi CRM: một app NestJS, modular monolith.
- Mỗi module một schema PostgreSQL riêng, không join chéo schema.
- Module khác chỉ gọi qua public service của module, không import repository/entity của nhau.
- Module nằm ở `apps/api/src/modules/<tên>/`, public API là `index.ts`. ESLint chặn import vượt ranh giới (xem README, mục "Import và ranh giới module"). Đổi rule thì cập nhật fixture và `apps/api/test/boundaries.test.ts`.

## Convention

Chốt ở Phase 0. Mục ghi "slice 1.3" sẽ chốt ở slice Contacts (module mẫu) rồi cập nhật lại đây.

- Cấu trúc module (api):
  - Nghiệp vụ: `apps/api/src/modules/<tên>/`, mỗi module một Nest module. `index.ts` là public API (module class, service, type dùng chung), module khác và code ngoài module chỉ import qua đây. Truy cập DB chỉ trong `<tên>.repository.ts`.
  - Hạ tầng dùng chung nằm ngoài `modules/`: `config/` (env, zod), `prisma/` (`PrismaService`, global), `logging/`, `health/`.
  - Controller, service, DTO, validation input: chốt ở slice 1.3.
- Đặt tên file/class:
  - File kebab-case theo vai trò: `<tên>.module.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`. Class PascalCase cùng hậu tố (`HealthController`, `PrismaService`).
  - Web: component React một file PascalCase (`SystemStatusCard.tsx`), file còn lại kebab-case (`fetch-health.ts`).
  - `packages/shared`: chỉ type và hàm thuần dùng chung giữa api và web, không phụ thuộc Nest, React.
- Cấu trúc web (`apps/web/src/`):
  - `routes/`: route theo file của TanStack Router, chỉ ghép trang, logic để ở thư mục tính năng. Tên trang đặt bằng `staticData: { title }`. `routeTree.gen.ts` sinh tự động, không commit.
  - Thư mục theo tính năng (`health/`, sau này `contacts/`...): component, hook, hàm gọi API của tính năng đó.
  - `components/`: component dùng chung (`AppSidebar`, `ErrorState`, `ComingSoon`). `components/ui/`: sinh bằng shadcn CLI, ít sửa, lint nới vài rule.
  - `lib/`: `api.ts` (`api<T>()`, `ApiError`), `query-client.ts`, `utils.ts` (`cn`).
  - Gọi API qua `api<T>()`, không gọi `fetch` trực tiếp. Lỗi tải dữ liệu: `ErrorState` trong trang. Lỗi thao tác: toast tự động từ `MutationCache`, đặt tiêu đề bằng `meta: { errorTitle }`. Query không retry lỗi 4xx, retry 1 lần với lỗi mạng/5xx.
  - Giao diện tiếng Anh, không i18n. Màu lấy từ token (`bg-primary`, `text-muted-foreground`, `bg-success`...), không ghi mã màu trong component.
- ORM / migration: Prisma 7 (ADR-0003). Schema ở `apps/api/prisma/schema/<module>.prisma`, model có `@@schema("<module>")`, không `@relation` chéo schema. Trong `modules/`, chỉ `*.repository.ts` (và test của nó) import `PrismaService`, Prisma client; file khác được `import type` model. Hạ tầng ngoài `modules/` không bị giới hạn (`health/` gọi `PrismaService.ping()`). Chỉ roll forward, không down migration.
- Import: khác thư mục dùng alias `@/` (= `src/` của app), cùng thư mục dùng `./`, không dùng `../` (lint chặn). `apps/api` (Node, nodenext) ghi đuôi `.js`; `apps/web` (Vite, bundler) không ghi đuôi. Web gọi API qua `/api/*` (Vite proxy), type response lấy từ `@crm/shared`.
- Test (Vitest):
  - Unit test đặt cạnh file: `x.ts` → `x.test.ts`.
  - api: test qua HTTP và DB trong `apps/api/test/*.e2e.test.ts`, dựng `AppModule` thật với supertest, DB `crm_test` được reset bằng migration mỗi lần chạy (`make test` tự bật postgres). Mock bằng `vi.spyOn`, mock tự gỡ sau mỗi test (`restoreMocks`).
  - web: Testing Library + jsdom, giả API bằng MSW (`src/test/setup.ts`, mặc định `/api/health` ok), không mock `fetch` trực tiếp. Test cả trang qua `renderApp(path)` (`src/test/render-app.tsx`: router thật với memory history).
  - Đổi rule ranh giới module thì cập nhật fixture của `apps/api/test/boundaries.test.ts`.
- Logging (api): log JSON qua `nestjs-pino`. Trong code dùng `new Logger(<Class>.name)` của `@nestjs/common`, log trong request tự có `reqId`. Request-id nhận từ header `X-Request-Id` nếu hợp lệ, không thì tạo UUID, luôn trả về trong header. Không log dữ liệu nhạy cảm (header `authorization`, `cookie` đã redact). Mức log qua `LOG_LEVEL`.
- Format lỗi API: chốt ở slice 1.3 (xem backlog). Hiện dùng mặc định của Nest; `/health` 503 trả body `HealthResponse`.

## Lệnh thường dùng

Chạy trong container `dev` của `compose.yaml`, xem `make help`.

```bash
make up / make down                # cả stack (localhost:5173); up tự install + build shared + migrate
make restart                       # sau khi sửa packages/shared, hoặc pull khi stack đang chạy
make install                       # pnpm install
make migrate                       # chạy lại setup (có prisma migrate deploy)
make migration NAME=add_contact    # tạo migration, chưa áp
make lint typecheck test build
make pnpm ARGS="add -D x --filter @crm/api"
make sh                            # shell trong container
```
