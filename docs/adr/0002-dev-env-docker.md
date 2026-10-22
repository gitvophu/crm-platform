# ADR-0002: Môi trường dev chạy trong Docker Compose

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-10-21
- **Phase:** 0
- **Thay thế:** Q6, Q7 của [slice 0.1](../phases/phase-0/slices/0.1-monorepo.md) (cài Node qua nvm, pnpm qua Corepack trên host)

## Bối cảnh

Slice 0.1 giả định Node 26 và pnpm cài trên host qua nvm và Corepack. Máy dev hiện tại (Ubuntu 26.04) chưa có Node, nhưng đã có Docker. Các phase sau còn thêm Go, PHP, Python. Nếu cài từng stack lên host thì môi trường mỗi máy sẽ lệch nhau dần.

## Các phương án

| Phương án                                             | Ưu                                                                     | Nhược                                                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Hybrid: tooling trên host (nvm), runtime trong Docker | Lệnh ngắn, chạy nhanh nhất, không cần cấu hình thêm                    | Mỗi stack mới là một lần cài lên host, version giữa các máy dễ lệch                      |
| `docker run` từng lệnh                                | Không cần file cấu hình                                                | Lệnh rất dài, tự lo volume và UID ở mỗi lần gọi                                          |
| Dev Container                                         | IDE chạy hẳn trong container                                           | Thêm một tầng cấu hình, hỗ trợ khác nhau giữa các IDE, CLI trên host vẫn phải `exec` vào |
| **Service `dev` trong Docker Compose + Makefile**     | Host chỉ cần Docker + make, dùng chung compose với các service runtime | Lệnh phải bọc qua `make`, phải xử lý UID và pnpm store                                   |

## Quyết định

Toàn bộ lệnh dev chạy qua service `dev` trong `compose.yaml`, gọi bằng `make`:

- Host chỉ cần **Docker và `make`**. Không cài Node, pnpm hay runtime của các stack khác.
- Repo được bind mount vào container. `node_modules` nằm trong repo để IDE trên host đọc được.
- Container chạy bằng UID/GID của host, nên file sinh ra không thuộc root.
- Version Node lấy từ `.nvmrc`, version pnpm lấy từ `packageManager` trong `package.json`.

Chi tiết cấu hình ở [slice 0.2](../phases/phase-0/slices/0.2-dev-docker.md).

## Hệ quả

- Tích cực: clone về trên máy chỉ có Docker là chạy được. Stack mới (Go, PHP) thêm vào theo cùng một cách. Môi trường dev và CI có thể dùng chung image.
- Đánh đổi:
  - Gõ `make lint` thay vì `pnpm lint`. Claude Code cũng chạy lệnh qua `make`.
  - IDE cần cấu hình Node interpreter trong Docker (WebStorm). VS Code dùng Node có sẵn của nó.
  - pnpm không hardlink được giữa store (volume) và `node_modules` (bind mount), nên lần cài đầu chậm hơn.
- Khi nào cần xem lại: khi thời gian chạy lệnh qua container gây khó chịu đo được, hoặc khi cần làm việc trên máy không có Docker.
