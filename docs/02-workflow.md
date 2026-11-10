# Workflow: vòng lặp cho mỗi phase

```
 SPEC ──► PLAN ──► SLICES ──► VERIFY ──► REVIEW ──► RETRO/ADR ──► tag release
                     ▲    │
                     └────┘ mỗi slice = 1 branch = 1 PR nhỏ
                            slice doc (Spec · Q&A · Design · Plan) ──► duyệt ──► code
```

| Bước          | Làm gì                                                                  | File kết quả                         |
| ------------- | ----------------------------------------------------------------------- | ------------------------------------ |
| **Spec**      | Phase này giải quyết gì, KHÔNG làm gì, tiêu chí "xong"                  | `phases/phase-N/spec.md`             |
| **Plan**      | Chia 4–8 vertical slice (DB → API → UI → test), mỗi slice 1–3 ngày      | `phases/phase-N/plan.md`             |
| **Slice doc** | Spec + Q&A làm rõ + plan chi tiết của slice. Chỉ code khi đã duyệt (✅) | `phases/phase-N/slices/N.x-ten.md`   |
| **Design**    | Slice có UI: mockup HTML bấm được, giống thật, duyệt cùng slice doc     | `phases/phase-N/design/N.x-ten.html` |
| **Slice**     | Branch `phase-N/slice-x-y-ten`, 1 PR (gồm cả slice doc)                 | PR                                   |
| **Verify**    | CI xanh, `docker compose up` chạy được, demo được                       | Checklist trong PR                   |
| **Smoke**     | Slice có UI: chụp màn hình bằng Playwright, AI review so với mockup     | Ghi chú trong slice doc              |
| **Review**    | Đối chiếu `review-checklist.md`                                         | `phases/phase-N/review.md`           |
| **Retro/ADR** | Ghi quyết định và số liệu đo được                                       | `adr/NNNN-*.md`                      |
| **Release**   | `git tag phase-N`                                                       |                                      |

## Nguyên tắc

1. **Slice theo chiều dọc.** Mỗi slice merge xong phải chạy được end-to-end.
2. **Slice đầu tiên của mỗi loại là slice mẫu.** Ví dụ Contacts ở Phase 1: làm kỹ, review kỹ, các module sau theo đúng pattern.
3. **Không thêm scope giữa chừng.** Ý tưởng mới ghi vào `phases/backlog.md`.
4. **Quyết định kiến trúc → ADR.** Kể cả quyết định "không làm".
   Quyết định nhỏ chỉ ảnh hưởng một slice (tooling, quy ước) ghi ở phần Q&A của slice doc. Câu trả lời trong Q&A không được để lại trong chat.

## Tiêu chí một spec tốt

Áp cho `00-vision.md` (cấp sản phẩm) và `phases/phase-N/spec.md` (cấp phase). Template: `phases/_template/spec.md`.

**Chung**

1. **Đủ để làm mà không phải đoán:** người đọc trả lời được ai, làm gì, khi nào, có được phép không, kết quả ra sao.
2. **Có mô hình tham khảo:** mỗi khái niệm ghi tương ứng trong Odoo (`crm.lead`, `sale.order`...). Làm khác Odoo thì ghi lý do.
3. **Đo được:** mỗi tiêu chí hoàn thành kiểm tra được bằng test, demo hoặc con số.
4. **Có ranh giới:** trong phạm vi và ngoài phạm vi; phần ngoài phạm vi ghi để ở đâu (phase sau, backlog, không làm).
5. **Thống nhất thuật ngữ:** một khái niệm một tên, có trong bảng thuật ngữ, trùng với chữ trên giao diện.
6. **Truy vết được:** mỗi yêu cầu có mã (`CRM-03`), slice doc ghi mình làm yêu cầu nào.
7. **Không lặp:** chi tiết nằm ở một chỗ, chỗ khác dẫn link.

**Vision phải có:** bối cảnh business (Nova làm gì, dịch vụ, gói, cách tính tiền, quy mô, cơ cấu team) · vấn đề cần giải quyết · người dùng và role · quy trình end-to-end · mô hình nghiệp vụ (entity, quan hệ, map Odoo, sơ đồ) · ma trận phân quyền (role × hành động × phạm vi own/team/all) · phạm vi hệ thống theo app và ngoài phạm vi · bảng thuật ngữ · stack và nghiệp vụ mỗi stack phục vụ · mục tiêu học.

**Spec phase phải có:** mục tiêu (dẫn tới phần nào của vision) · quy trình nào được làm, tới bước nào · yêu cầu chức năng có mã · mô hình dữ liệu và trạng thái của phase · phân quyền áp dụng · yêu cầu phi chức năng (khi có) · ngoài phạm vi · tiêu chí hoàn thành · số liệu (khi có) · giả định, phụ thuộc, rủi ro, câu hỏi mở · quyết định đã chốt.

**Cách viết**

- **Yêu cầu chức năng:** mã + user story + quy tắc nghiệp vụ.

  ```markdown
  - **CRM-03** Là salesperson, tôi chuyển lead thành opportunity để theo dõi trên pipeline.
    - Chọn hoặc tạo contact; lead đã có contact trùng email thì gợi ý gộp.
    - Opportunity vào stage đầu của pipeline sales team.
  ```

- **Quy trình:** bảng bước đánh số (bước · ai · làm gì · trạng thái sau bước) + Mermaid `stateDiagram-v2` cho entity có trạng thái (lead, quotation, subscription, ticket).

## Dùng Claude Code

| Bước        | Cách dùng                                                                        |
| ----------- | -------------------------------------------------------------------------------- |
| Spec → Plan | Plan mode: đưa `spec.md` vào, nhận `plan.md`, chốt rồi mới code                  |
| Slice doc   | _"Viết slice doc cho X"_: Claude hỏi Q&A, ghi câu trả lời vào file, chờ duyệt    |
| Slice       | _"Implement slice X theo slice doc, theo convention trong CLAUDE.md"_            |
| Verify      | Yêu cầu chạy test + `docker compose up`                                          |
| Smoke       | Chạy script trong repo `crm-platform-test`, Claude đọc ảnh chụp và so với mockup |
| Review      | `/code-review` trên branch, sau đó tự đối chiếu checklist                        |
| Retro       | Tóm tắt quyết định trong phase thành ADR, cập nhật `CLAUDE.md`                   |
