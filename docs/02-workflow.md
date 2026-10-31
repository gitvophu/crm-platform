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
| **Review**    | Đối chiếu `review-checklist.md`                                         | `phases/phase-N/review.md`           |
| **Retro/ADR** | Ghi quyết định và số liệu đo được                                       | `adr/NNNN-*.md`                      |
| **Release**   | `git tag phase-N`                                                       |                                      |

## Nguyên tắc

1. **Slice theo chiều dọc.** Mỗi slice merge xong phải chạy được end-to-end.
2. **Slice đầu tiên của mỗi loại là slice mẫu.** Ví dụ Contacts ở Phase 1: làm kỹ, review kỹ, các module sau theo đúng pattern.
3. **Không thêm scope giữa chừng.** Ý tưởng mới ghi vào `phases/backlog.md`.
4. **Quyết định kiến trúc → ADR.** Kể cả quyết định "không làm".
   Quyết định nhỏ chỉ ảnh hưởng một slice (tooling, quy ước) ghi ở phần Q&A của slice doc. Câu trả lời trong Q&A không được để lại trong chat.
5. **Mỗi phase có ít nhất 1 con số** (latency, throughput, memory, thời gian import...).

## Dùng Claude Code

| Bước        | Cách dùng                                                                     |
| ----------- | ----------------------------------------------------------------------------- |
| Spec → Plan | Plan mode: đưa `spec.md` vào, nhận `plan.md`, chốt rồi mới code               |
| Slice doc   | _"Viết slice doc cho X"_: Claude hỏi Q&A, ghi câu trả lời vào file, chờ duyệt |
| Slice       | _"Implement slice X theo slice doc, theo convention trong CLAUDE.md"_         |
| Verify      | Yêu cầu chạy test + `docker compose up`                                       |
| Review      | `/code-review` trên branch, sau đó tự đối chiếu checklist                     |
| Retro       | Tóm tắt quyết định trong phase thành ADR, cập nhật `CLAUDE.md`                |
