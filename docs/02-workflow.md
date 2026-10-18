# Workflow: vòng lặp cho mỗi phase

```
 SPEC ──► PLAN ──► SLICES (code) ──► VERIFY ──► REVIEW ──► RETRO/ADR ──► tag release
                     ▲    │
                     └────┘ mỗi slice = 1 branch = 1 PR nhỏ
```

| Bước | Làm gì | File kết quả |
|---|---|---|
| **Spec** | Phase này giải quyết gì, KHÔNG làm gì, tiêu chí "xong" | `phases/phase-N/spec.md` |
| **Plan** | Chia 4–8 vertical slice (DB → API → UI → test), mỗi slice 1–3 ngày | `phases/phase-N/plan.md` |
| **Slice** | Branch `phase-N/slice-x-y-ten`, 1 PR | PR |
| **Verify** | CI xanh, `docker compose up` chạy được, demo được | Checklist trong PR |
| **Review** | Đối chiếu `review-checklist.md` | `phases/phase-N/review.md` |
| **Retro/ADR** | Ghi quyết định và số liệu đo được | `adr/NNNN-*.md` |
| **Release** | `git tag phase-N` | |

## Nguyên tắc

1. **Slice theo chiều dọc.** Mỗi slice merge xong phải chạy được end-to-end.
2. **Slice đầu tiên của mỗi loại là slice mẫu.** Ví dụ Contacts ở Phase 1: làm kỹ, review kỹ, các module sau theo đúng pattern.
3. **Không thêm scope giữa chừng.** Ý tưởng mới ghi vào `phases/backlog.md`.
4. **Quyết định kiến trúc → ADR.** Kể cả quyết định "không làm".
5. **Mỗi phase có ít nhất 1 con số** (latency, throughput, memory, thời gian import...).

## Dùng Claude Code

| Bước | Cách dùng |
|---|---|
| Spec → Plan | Plan mode: đưa `spec.md` vào, nhận `plan.md`, chốt rồi mới code |
| Slice | *"Implement slice X theo plan.md, theo convention trong CLAUDE.md"* |
| Verify | Yêu cầu chạy test + `docker compose up` |
| Review | `/code-review` trên branch, sau đó tự đối chiếu checklist |
| Retro | Tóm tắt quyết định trong phase thành ADR, cập nhật `CLAUDE.md` |
