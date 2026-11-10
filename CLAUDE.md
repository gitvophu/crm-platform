# CLAUDE.md

CRM platform cho công ty giả định _Nova Agency_ (agency digital marketing). Dự án thực hành nhiều stack. Xem `docs/00-vision.md`.

## Đọc trước khi làm

- `docs/00-vision.md`: scope và những gì KHÔNG làm
- `docs/reference/odoo.md`: mô hình nghiệp vụ tham khảo (Odoo 19.0). Model, field, trạng thái, quyền theo Odoo; làm khác thì ghi lý do trong spec
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
- Slice có màn hình mới hoặc đổi giao diện: sau khi code, chạy smoke test trong repo `/home/phuvo/me/projects/crm-platform-test` (Playwright chụp màn hình trên stack dev, chỉ đọc), đọc ảnh chụp và so với mockup đã duyệt. Lệch hoặc lỗi giao diện thì sửa, hoặc ghi vào "Ghi chú khi implement". Thêm màn hình mới vào script smoke trong cùng lần.
- Implement xong một slice: chạy subagent với skill `/code-review` để review thay đổi của slice. Main agent xem từng điểm, sửa điểm hợp lý, điểm cần quyết định thiết kế thì hỏi, rồi chạy lại `make lint typecheck test`. Chỉ một vòng review. Báo cáo cuối liệt kê điểm đã sửa và điểm không sửa kèm lý do. Sau bước này mới báo slice xong.
- Host không cài Node (ADR-0002): mọi lệnh node/pnpm chạy qua `make`, không gọi `pnpm`/`node`/`npx` trực tiếp trên host.

## Kiến trúc (ADR-0001)

- Lõi CRM: một app NestJS, modular monolith.
- Mỗi module một schema PostgreSQL riêng, không join chéo schema.
- Module khác chỉ gọi qua public service của module, không import repository/entity của nhau.
- Module nằm ở `apps/api/src/modules/<tên>/`, public API là `index.ts`. ESLint chặn import vượt ranh giới (xem README, mục "Import và ranh giới module"). Đổi rule thì cập nhật fixture và `apps/api/test/boundaries.test.ts`.

## Convention

Chốt ở Phase 0, bổ sung ở slice 1.3 (Contacts là module mẫu: module mới làm theo `modules/contacts/` và `apps/web/src/features/contacts/`).

- Không ghi cứng giá trị có ý nghĩa (mã lỗi, HTTP status, tên cookie, thời hạn, giới hạn độ dài, key...): đặt vào hằng số có tên rồi dùng lại. Hằng dùng một file thì đặt đầu file đó; dùng chung api và web thì đặt trong `@crm/shared`; đã có hằng của thư viện thì dùng luôn (`HttpStatus` của Nest). Ngoại lệ: test (giữ giá trị để đọc rõ), comment, chữ hiển thị trên giao diện.

- Cấu trúc module (api):
  - Nghiệp vụ: `apps/api/src/modules/<tên>/`, mỗi module một Nest module. `index.ts` là public API (module class, service, type dùng chung), module khác và code ngoài module chỉ import qua đây. Truy cập DB chỉ trong `<tên>.repository.ts`.
  - Hạ tầng dùng chung nằm ngoài `modules/`: `config/` (env, zod), `prisma/` (`PrismaService`, global), `logging/`, `health/`.
  - Auth (ADR-0004): guard toàn cục, mọi route cần đăng nhập trừ `@Public()`. Lấy người gọi bằng `@CurrentUser()` (`SessionUser`: id, role, teamId). Cả hai export từ `modules/identity/index.ts`.
  - Validation input: schema zod trong `@crm/shared` (web dùng lại cho form), api dùng `@Body(new ZodValidationPipe(schema))` (`src/validation/`). Lỗi 400 có `errors` theo field.
  - Controller chỉ lo HTTP: parse input bằng pipe zod, lấy `@CurrentUser()`, gọi service, trả DTO. Service chứa nghiệp vụ và kiểm quyền. Repository nhận `teamScope` ở mọi truy vấn. Mapper `<tên>.mapper.ts` đổi row thành DTO (type DTO, schema input trong `@crm/shared`, ngày giờ là chuỗi ISO).
  - Phân quyền theo dòng (ADR-0005, **đang được thay**: từ slice 1.4 contact không giới hạn theo team, slice 1.5 chuyển sang quyền theo app kiểu Odoo, xem spec Phase 1 Q15; module mới làm theo spec, không theo `teamScope`): bảng nghiệp vụ có `owner_id`, `team_id` (không FK sang identity). Dùng `teamScope`, `canEdit`, `canAssignOwner` của `src/access/access.ts`. Không thấy (team khác, id lạ) → 404, thấy mà không được sửa → 403. DTO có `permissions: { canEdit }`.
  - Dữ liệu của module khác: gọi public service theo lô một lần cho cả trang (`UsersService.findByIds`), không N+1, không join chéo schema.
  - Hành động không phải CRUD là `POST /<tên>/:id/<hành động>` (`archive`, `restore`). Xoá mềm bằng `archived_at`.
- Đặt tên file/class:
  - File kebab-case theo vai trò: `<tên>.module.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`. Class PascalCase cùng hậu tố (`HealthController`, `PrismaService`).
  - Web: component React một file PascalCase (`SystemStatusCard.tsx`), file còn lại kebab-case, có tiền tố tên tính năng (`health-api.ts`, `contacts-search.ts`).
  - `packages/shared`: type, hàm thuần và schema zod dùng chung giữa api và web, không phụ thuộc Nest, React. `src/http/`: phần dùng chung mọi tính năng (`problem.ts`, `http-status.ts`, `page.ts`, `sort.ts`, `filters.ts`). `src/<tính năng>/`: `index.ts` và một file mỗi vai trò, `<tính năng>.constants.ts` (enum, giới hạn, sort), `.problems.ts` (`<TÍNH NĂNG>_PROBLEMS`), `.schema.ts` (zod input, query danh sách), `.dto.ts` (type response), `.utils.ts` (hàm thuần); không có thì không tạo. Bên trong package import tương đối (`../http/page.js`); app chỉ import `@crm/shared`.
- Cấu trúc web (`apps/web/src/`):
  - `routes/`: route theo file của TanStack Router, chỉ ghép trang, logic để ở thư mục tính năng. Trang cần đăng nhập đặt trong `routes/_app/` (layout + kiểm tra đăng nhập ở `_app.tsx`). Tên trang đặt bằng `staticData: { title }`. `routeTree.gen.ts` sinh tự động, không commit.
  - Tính năng ở `features/<tên>/` (`auth`, `contacts`, `health`, `users`): component, hook, hàm gọi API của tính năng đó. `index.ts` là public API: route, `components/` và tính năng khác chỉ import `@/features/<tên>` (ESLint chặn import sâu và import vòng, như module api). Tính năng có nhiều màn hình chia thư mục con theo màn hình (`list/`, `detail/`, `form/`, `login/`, `account/`), phần dùng chung trong tính năng để ở gốc; tính năng nhỏ giữ phẳng. User đang đăng nhập: `useCurrentUser()` của `@/features/auth`.
  - `hooks/`: hook dùng chung nhiều tính năng (`use-unsaved-changes.tsx`).
  - `components/`: component dùng chung (`AppSidebar`, `ErrorState`, `ComingSoon`). `components/ui/`: sinh bằng shadcn CLI, ít sửa, lint nới vài rule.
  - `lib/`: `api.ts` (`api<T>()`, `ApiError` đọc problem+json: `code`, `fieldErrors`), `query-client.ts`, `format.ts`, `utils.ts` (`cn`).
  - Gọi API theo tính năng: mỗi endpoint một hàm trong `features/<tính năng>/<tính năng>-api.ts` (`contactsApi.list`...), đi cùng `<tính năng>Queries` (`queryOptions`: key + queryFn). Component không gọi `api()` trực tiếp. Mọi key của một tính năng bắt đầu bằng tên của nó (`['contacts', ...]`), sửa xong thì invalidate cả key đó.
  - Trang danh sách: lọc, sắp xếp, trang nằm trên URL (`validateSearch` bằng zod, giá trị lạ bị bỏ qua). Trang chi tiết: route cha `$id.tsx` có loader nạp dữ liệu và trả `{ crumb }` cho breadcrumb, 404 → `notFound()`. Tạo, sửa là trang riêng (`new.tsx`, `$id/edit.tsx`), hỏi trước khi rời form chưa lưu (`useUnsavedChanges`).
  - Gọi API qua `api<T>(path, { method, json })`, không gọi `fetch` trực tiếp. 401 tự refresh rồi gọi lại; hết phiên thì về login. Lỗi tải dữ liệu: `ErrorState` trong trang. Lỗi thao tác: toast tự động từ `MutationCache`, đặt tiêu đề bằng `meta: { errorTitle }`, form tự hiện lỗi thì `meta: { toastError: false }`. Query không retry lỗi 4xx, retry 1 lần với lỗi mạng/5xx.
  - Form: react-hook-form + `zodResolver` với schema của `@crm/shared` (từ slice 1.3). Lỗi theo field từ API (`ApiError.fieldErrors`) gắn vào ô bằng `setError`. Gửi bằng `useMutation` với `meta: { toastError: false }` để vẫn qua xử lý 401 chung. Login, đổi mật khẩu vẫn là form tự viết (`FormField`).
  - Chọn trong danh sách ngắn: `NativeSelect` (thẻ `<select>` thật), không dùng Select của Radix.
  - Giao diện tiếng Anh, không i18n. Màu lấy từ token (`bg-primary`, `text-muted-foreground`, `bg-success`...), không ghi mã màu trong component.
- ORM / migration: Prisma 7 (ADR-0003). Schema ở `apps/api/prisma/schema/<module>.prisma`, model có `@@schema("<module>")`, không `@relation` chéo schema. Id là UUID v7 do Postgres sinh: `@id @default(dbgenerated("uuidv7()")) @db.Uuid`. Bảng và cột snake_case, tên bảng số nhiều (`@@map("users")`, `@map("team_id")`), thời gian `@db.Timestamptz`. Dữ liệu dev ở `prisma/seed.ts` (`make seed`), chạy lại được (upsert). Trong `modules/`, chỉ `*.repository.ts` (và test của nó) import `PrismaService`, Prisma client; file khác được `import type` model. Hạ tầng ngoài `modules/` không bị giới hạn (`health/` gọi `PrismaService.ping()`). Chỉ roll forward, không down migration.
- Import: khác thư mục dùng alias `@/` (= `src/` của app), cùng thư mục dùng `./`, không dùng `../` (lint chặn). `apps/api` (Node, nodenext) ghi đuôi `.js`; `apps/web` (Vite, bundler) không ghi đuôi. Web gọi API qua `/api/*` (Vite proxy), type response lấy từ `@crm/shared`.
- Test (Vitest):
  - Unit test đặt cạnh file: `x.ts` → `x.test.ts`.
  - api: test qua HTTP và DB trong `apps/api/test/*.e2e.test.ts`, dựng `AppModule` thật với supertest, DB `crm_test` được reset bằng migration mỗi lần chạy (`make test` tự bật postgres). Mock bằng `vi.spyOn`, mock tự gỡ sau mỗi test (`restoreMocks`).
  - web: Testing Library + jsdom, giả API bằng MSW (`src/test/setup.ts`, mặc định đã đăng nhập (`testUser`) và `/api/health` ok), không mock `fetch` trực tiếp. Test cả trang qua `renderApp(path)` (`src/test/render-app.tsx`: router thật với memory history).
  - Đổi rule ranh giới module thì cập nhật fixture của `apps/api/test/boundaries.test.ts`.
- Logging (api): log JSON qua `nestjs-pino`. Trong code dùng `new Logger(<Class>.name)` của `@nestjs/common`, log trong request tự có `reqId`. Request-id nhận từ header `X-Request-Id` nếu hợp lệ, không thì tạo UUID, luôn trả về trong header. Không log dữ liệu nhạy cảm (header `authorization`, `cookie` đã redact). Mức log qua `LOG_LEVEL`.
- Format lỗi API: RFC 9457 `application/problem+json` có `code`, `requestId`, `errors` theo field (400, 409). Lỗi chủ ý ném `AppProblem(status, code, detail, errors?)` (`src/errors/`). Không ghi cứng code và status: code chung ở `PROBLEM_CODES`, code nghiệp vụ dạng `<module>.<lỗi>` ở `<TÍNH NĂNG>_PROBLEMS` trong `<tính năng>.problems.ts` của `@crm/shared` (`CONTACT_PROBLEMS`, `AUTH_PROBLEMS`); status ở api dùng `HttpStatus` của Nest, ở web dùng `HTTP_STATUS` của `@crm/shared` (test giữ số để đọc rõ giao thức). Web rẽ nhánh theo `code` khi có. Lỗi lạ → 500 `internal_error`, chi tiết chỉ trong log. Ngoại lệ: `/health` 503 trả body `HealthResponse`.
- Danh sách: phân trang offset `?page=&pageSize=` (tối đa 100) → `Page<T>` (`items, page, pageSize, total`); `sort=<cột>` hoặc `-<cột>` (đọc, ghi bằng `parseSort`, `toSort`, `sortValues` của `@crm/shared`), cột trong danh sách cho phép, thêm `id` để thứ tự ổn định; trong repository dùng hằng của Prisma (`Prisma.SortOrder`, `QueryMode`, `<Model>ScalarFieldEnum`), mã lỗi Prisma ở `src/prisma/prisma-errors.ts`; lọc bằng query param, schema zod chung trong `@crm/shared`.

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
