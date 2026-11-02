# ADR-0004: Auth bằng access token JWT + refresh token trong cookie httpOnly

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-01
- **Phase:** 1

## Bối cảnh

Phase 1 cần đăng nhập bằng email + mật khẩu cho nhân viên Nova Agency (spec Phase 1, Q2). Ràng buộc:

- Web và api cùng origin nhờ proxy `/api` (Vite khi dev), không cần CORS.
- Phải thu hồi được phiên khi đăng xuất và khi đổi mật khẩu (slice 1.2, Q11).
- Guard chạy ở mọi request, không muốn thêm một query DB cho mỗi request (slice 1.2, Q2).
- Phase 1.5 sẽ thay bằng OIDC (Keycloak), nên chọn cách đơn giản nhưng đúng chuẩn.

## Các phương án

| Phương án                                  | Ưu                                                                   | Nhược                                                          |
| ------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------- |
| Một JWT dài hạn (8h) trong cookie          | Đơn giản nhất, guard không đọc DB                                    | Không thu hồi được trước khi hết hạn                           |
| Session phía server (id trong cookie)      | Thu hồi tức thì, đơn giản                                            | Mỗi request một lần đọc DB/Redis                               |
| **Access JWT ngắn + refresh token lưu DB** | Guard không đọc DB, thu hồi được (chậm tối đa bằng hạn access token) | Phức tạp nhất: luồng refresh ở web, xoay vòng, xử lý nhiều tab |
| JWT trong `localStorage` + header          | Không lo CSRF                                                        | Script bị chèn (XSS) đọc được token                            |

## Quyết định

Chọn **access token JWT 15 phút + refresh token lưu DB**, cả hai trong cookie httpOnly:

- Access token: JWT HS256 (`@nestjs/jwt`, secret `JWT_SECRET`), payload `sub`, `sid`, `role`, `teamId`. Cookie `crm_access`, `Path=/api`.
- Refresh token: `<session id>.<bí mật ngẫu nhiên 32 byte>`, DB chỉ lưu SHA-256 của phần bí mật. Cookie `crm_refresh`, `Path=/api/auth`.
- Cookie `HttpOnly`, `SameSite=Lax`, `Secure`. Chống CSRF bằng `SameSite=Lax`: trình duyệt không gửi cookie kèm request POST từ site khác. Web và api cùng origin nên không ảnh hưởng.
- Phiên (bảng `identity.sessions`) hết hạn sau 7 ngày không dùng và 30 ngày tuyệt đối từ lúc đăng nhập.
- Xoay vòng mỗi lần refresh. Token vừa bị thay bị dùng lại thì thu hồi cả phiên, trừ trong 30 giây sau khi xoay (request song song, nhiều tab): khi đó trả 401 mà không thu hồi, không xoá cookie. Token có id phiên nhưng bí mật chưa từng cấp chỉ bị từ chối, không thu hồi (biết id phiên không đủ để đăng xuất người khác). Chỉ nhớ một token trước đó, nên dùng lại token cũ hơn chỉ bị từ chối.
- `Secure` bật mặc định, tắt bằng `COOKIE_SECURE=false` khi dev qua HTTP từ máy khác hoặc Safari.
- Guard toàn cục, mặc định mọi route cần đăng nhập, `@Public()` để mở. Guard chỉ verify JWT, không đọc DB.
- Mật khẩu hash bằng argon2id (`@node-rs/argon2`).

## Hệ quả

- Tích cực: guard không tốn query; đăng xuất, đổi mật khẩu thu hồi được phiên; XSS không đọc được token.
- Đánh đổi:
  - Thu hồi phiên, đổi role/team có hiệu lực chậm tối đa 15 phút (access token cũ vẫn hợp lệ tới hết hạn).
  - Web phải xử lý 401 → refresh → gọi lại, và đồng bộ refresh giữa nhiều tab.
  - Path cookie gắn với tiền tố `/api` của proxy. Đổi tiền tố thì đổi path cookie.
- Khi nào cần xem lại: Phase 1.5 (OIDC); khi cần thu hồi tức thì (thêm danh sách đen hoặc đọc session trong guard); khi api và web khác origin.
