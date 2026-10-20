# Bản build Ryuuworl

Nguồn: https://github.com/kclientk001-sketch/ai.git, commit `80ca61eb046759709dfbe38a0553c2a26b4d2dfc`.

Cấu hình đã tùy chỉnh:

- Tên website/network: `Ryuuworl`.
- Địa chỉ Minecraft do người dùng cung cấp: `ryuuworl.id.vn`, cổng mặc định `25565`.
- Phiên bản game: `Đang cập nhật`; chưa có thông tin phiên bản được xác nhận.
- Origin dự kiến của bản tĩnh: `https://v1.ryuuworl.id.vn`.
- Không có tài khoản quản trị mặc định. Discord/backend riêng chưa được cấu hình.

Repo này là website và backend quản trị Minecraft Network; không chứa phần mềm máy chủ game Minecraft. IP cấu hình trên website không tự khởi tạo một server game hoặc xác nhận rằng server đó đang online.

## Build trên Linux thông thường

Dùng Node.js 22.13 trở lên, chạy tại thư mục repo:

```sh
npm ci
npm run db:setup
npm run typecheck
npm test
npm run build
npm run build:inet
```

Dự án cần `.env` cục bộ; bản này đã tạo từ `.env.example` với cấu hình công khai trên. Không đưa `.env`, database, tài khoản, session hoặc token vào gói website tĩnh.

- `.next/standalone/`: ứng dụng Node.js đầy đủ, gồm API và quản trị. Chạy từ repo bằng `npm start`; cấu hình URL HTTPS và database bền vững trước khi vận hành trên VPS.
Bản Node hiện được build cho Linux ARM64. Nếu VPS dùng kiến trúc khác, build lại từ source ngay trên VPS.

- `inet-site/`: website tĩnh cho OneShield Pages. Trạng thái trực tiếp, ticket và đăng nhập quản trị cần backend Node riêng; `inet-config.js` chỉ nhận URL công khai, không nhận token/mật khẩu.

Dữ liệu seed như tin tức, sản phẩm và bảng xếp hạng vẫn là nội dung DEMO có nhãn. Cần thay bằng dữ liệu máy chủ thật trước khi quảng bá các tính năng đó như dịch vụ đang hoạt động.

## Môi trường Termux hiện tại

Đã chuẩn bị runtime Linux Node.js tại `.build-tools/node` ở gốc workspace, xác minh SHA-256 với checksum từ nodejs.org. Adapter sử dụng rootfs Debian sẵn có, giữ cache/tệp tạm trong workspace và không thay Node.js của Termux.

Ví dụ:

```sh
sh scripts/run-linux.sh npm run typecheck
sh scripts/run-linux.sh npm test
sh scripts/run-linux.sh npm run build:inet
```

Adapter là tiện ích cho cấu trúc workspace hiện tại. Trên VPS/Linux dùng các lệnh npm trực tiếp.

## Phát hành

Build không tự upload hoặc phát hành. Bản mới cần được người dùng duyệt trước khi triển khai. Hostname `v1.ryuuworl.id.vn` cần có binding đúng project/kênh và DNS/TLS sẵn sàng; xử lý hostname không nằm trong phạm vi skill OneShield Pages.

## Kết quả đã xác minh

- TypeScript: đạt.
- Unit tests: 3 bộ, 21 test đạt.
- Build Node.js production và build tĩnh iNET: đạt.
- Backend: trang chủ, news, admin/login, health trả HTTP 200; API admin không đăng nhập trả 401.
- Gói ZIP backend đã được giải nén sang thư mục khác, khởi động bằng launcher và vượt qua cùng kiểm tra HTTP, không phụ thuộc `.env` của source.
- Gói tĩnh: 245 tệp, 29 trang HTML qua HTTP cục bộ; 684 tham chiếu tài nguyên nội bộ hợp lệ.
- SHA-256/CRC ZIP và kiểm tra token trong hai gói: đạt. Không đóng gói `.env` hoặc tài khoản quản trị.
- Chưa QA bằng trình duyệt; chưa triển khai bản GitHub này.

Gói bàn giao ở thư mục `release/` của gốc workspace:

- `ryuuworl-backend-linux-arm64.zip`: backend web Linux ARM64; giải nén và chạy `node start-ryuuworl.mjs` trên Linux ARM64 với Node >=22.13. Có database DEMO, không có admin mặc định.
- `ryuuworl-github-inet.zip`: website tĩnh cho OneShield, `index.html` ở gốc ZIP.
- `ryuuworl-github-validation.json`: kết quả kiểm tra và SHA-256.

Để chạy backend trong Termux hiện tại, mở terminal tại thư mục source này và chạy `sh scripts/run-linux.sh npm start`; ứng dụng web nghe cổng 3000. Dừng bằng Ctrl+C.
