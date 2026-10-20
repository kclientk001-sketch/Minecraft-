# Kết quả kiểm thử thực tế

Môi trường thực thi: Linux, Node.js 24.19.0, Next.js 16.4.2, React 19.3.1, Prisma 6.19.0, Playwright 1.56.1 và Chromium Headless Shell 141. Các số dưới đây là kết quả lệnh đã chạy, không phải kế hoạch kiểm thử.

| Nhóm                        | Kết quả                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------- |
| TypeScript                  | Qua `npm run typecheck`; build cũng kiểm tra kiểu                                       |
| ESLint                      | Qua, không có lỗi/cảnh báo của source ở lượt cuối                                       |
| Production build            | Qua `npm run build`, tạo standalone output và các route đầy đủ                          |
| SQLite setup                | Migration, seed và Prisma client generation chạy thành công                             |
| Unit/integration            | **21/21 qua**                                                                           |
| Next.js browser E2E         | **14/14 qua**                                                                           |
| iNET static export          | Qua `npm run build:inet`, 31 mục trong quá trình prerender/export                       |
| iNET browser E2E            | **6/6 qua**                                                                             |
| PostgreSQL schema           | `prisma validate --schema prisma/schema.postgres.prisma` qua; có SQL migration khởi tạo |
| Standalone startup          | Khởi động với `DATABASE_URL=file:./dev.db`, `/api/health` trả HTTP 200                  |
| Dependency audit production | `npm audit --omit=dev`: 0 finding được báo cáo tại lượt kiểm tra                        |

Tổng các bộ test chính: **41/41 bài qua**. Hai lượt kiểm tra route công khai được bổ sung assertion thu thập console error để kiểm tra riêng sau đó. Xem file test để biết điều kiện chính xác; kết quả không thay thế việc kiểm tra ở domain/hosting thật.

## Đã xác minh

- Route công khai và metadata của Home, News/detail, Game Modes/detail, Leaderboards, Store/detail, Vote, Rules, Support, Privacy.
- Sao chép IP thật vào browser clipboard và toast thành công.
- Mobile menu mở, Escape, trả focus và điều hướng.
- News tìm kiếm, chi tiết; leaderboard chọn metric và phân trang.
- Store lọc/tìm kiếm, thêm/sửa giỏ, lưu sau reload và thanh toán bị tắt khi chưa có integration.
- Support validation, lưu ticket thật trong database test riêng và phản hồi mã ticket.
- Admin login, cookie/session, truy cập có quyền, tạo/sửa/xóa News qua giao diện, logout.
- Route handler từ chối anonymous, phiên hết hạn, EDITOR sửa settings và Origin khác.
- Rate limit lưu DB, body size limit, URL/host validation, honeypot và hash mật khẩu.
- Minecraft TCP fixture thật trên loopback: handshake, status phân mảnh, ping/pong, timeout, packet quá lớn và chặn host nội bộ mặc định. Đây là server fixture phục vụ test, không phải endpoint Minecraft của người dùng.
- Dữ liệu DEMO không phát sinh số online giả; stats ingest có bearer authentication và thay dữ liệu mẫu đúng metric.
- Bản iNET chạy qua HTTP static server, không cần Next runtime; hiển thị rõ backend chưa kết nối, tắt nút gửi và không có đăng nhập giả.

## Responsive và ảnh chụp

Bản đầy đủ: 1920, 1440, 768, 375 và 320px. Các route được kiểm tra không có horizontal overflow. Bản tĩnh kiểm tra riêng 1440 và 375px. Reduced motion được bật trong browser context, nội dung không bị ẩn bởi scroll reveal.

Ảnh chụp đã xem để đối chiếu:

- `screenshots/home-1920.png`, `home-1440.png`, `home-768.png`, `home-375.png`, `home-320.png`.
- `screenshots/inet-1440.png`, `inet-375.png`: toàn trang bản tĩnh.
- `screenshots/inet-preview-1440.png`, `inet-preview-375.png`: viewport để xem nhanh.

Lỗi từng được tìm và sửa: section bị giữ opacity 0 khi render/reduced motion, tên trường hỗ trợ thay đổi theo thông báo lỗi, kiểu cấu hình Playwright reduced motion và path database tương đối khi chạy standalone.

## Dependency overrides

Prisma CLI 6.19.0 kéo theo các phiên bản `deepmerge-ts`/`effect` có advisory. Dự án khóa override `deepmerge-ts=8.0.0` và `effect>=3.20.0` trong cùng major 3 để loại các finding đó. Prisma migrate/generate, tests và build đã chạy với dependency đã cập nhật. Xem `dependency-audit.json` và `package-lock.json`; khi nâng Prisma, đánh giá lại override thay vì xóa tùy ý.

Advisory được npm audit trả về: https://github.com/advisories/GHSA-ggr8-5vv4-36mx và https://github.com/advisories/GHSA-38f7-945m-qr2g. Audit chỉ phản ánh dữ liệu dependency tại thời điểm chạy, không phải chứng nhận an toàn toàn hệ thống.

## Giới hạn còn lại

- Chưa triển khai trên Railway/iNET hoặc thay DNS của `ryuuworl.id.vn`; không có URL public đã được xác minh.
- Chưa có Minecraft IP/Discord Guild ID thật để kiểm tra integration của người dùng. Placeholder giữ nhãn DEMO.
- PostgreSQL mới kiểm tra schema và tạo migration SQL; chưa chạy integration trên instance PostgreSQL thật.
- Dockerfile và cấu hình Railway đã chuẩn bị nhưng chưa build/chạy image Docker trong môi trường này.
- Chưa đo Core Web Vitals/Lighthouse trên production domain, chưa load test, chưa kiểm tra riêng Safari/Firefox.
- Chưa kết nối cổng thanh toán, plugin cấp vật phẩm, xác minh vote hoặc gửi email/Discord notification.
