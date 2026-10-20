# Minecraft Network · RyuuWorld deployment kit

Website Minecraft Network tiếng Việt, lấy cảm hứng từ trải nghiệm BlocksMC và sử dụng logo, ảnh nền, minh họa riêng. Tên/IP mặc định vẫn là giá trị mẫu, không đại diện cho server thật.

Dự án có **hai bản chạy**:

| Bản                   | Dùng ở đâu                     | Chức năng                                                                                                                      |
| --------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Next.js đầy đủ        | Node.js, VPS hoặc Railway      | Website, database, đăng nhập quản trị, CRUD, ticket, TCP ping Minecraft, API nhập thống kê                                     |
| `inet-site/` đã build | iNET OneSite hoặc hosting tĩnh | Các trang công khai, tìm kiếm/lọc/phân trang phía trình duyệt, giỏ hàng cục bộ; kết nối trạng thái/ticket khi có backend riêng |

**iNET trong ảnh chỉ tải tệp, không chạy build.** Không đưa nguyên mã nguồn Next.js vào mục Git URL và kỳ vọng backend hoạt động. Đọc [hướng dẫn iNET](docs/INET.md). Tên miền website được chuẩn bị là `ryuuworl.id.vn`; không tự suy ra đây là địa chỉ Minecraft server.

## Chạy trên máy của bạn

Yêu cầu: Node.js 22.13 trở lên, npm và Git. Đã khóa dependency bằng `package-lock.json`.

```bash
git clone https://github.com/kclientk001-sketch/ai.git minecraft-network
cd minecraft-network
npm ci
cp .env.example .env
npm run db:setup
npm run dev
```

Windows PowerShell dùng `Copy-Item .env.example .env` thay cho `cp`. Mở `http://localhost:3000`.

`db:setup` tạo database, chạy migration và seed nội dung có nhãn DEMO; **không tạo tài khoản quản trị mặc định**. Seed không ghi đè bản ghi cùng slug. Không chạy lại seed như một lịch định kỳ vì nó có thể tạo lại nội dung mẫu bạn đã xóa.

## Tạo quản trị viên

Mật khẩu cần ít nhất 14 ký tự. Không dán mật khẩu vào chat hay commit vào Git.

Bash:

```bash
read -r -p 'Email quản trị: ' ADMIN_EMAIL
read -r -s -p 'Mật khẩu: ' ADMIN_PASSWORD
export ADMIN_EMAIL ADMIN_PASSWORD
npm run admin:create
unset ADMIN_PASSWORD
```

PowerShell:

```powershell
$env:ADMIN_EMAIL = Read-Host 'Email quản trị'
$securePassword = Read-Host 'Mật khẩu' -AsSecureString
$env:ADMIN_PASSWORD = [Net.NetworkCredential]::new('', $securePassword).Password
npm run admin:create
Remove-Item Env:ADMIN_PASSWORD
```

Mở `/admin/login`. Muốn tạo biên tập viên, đặt `ADMIN_ROLE=EDITOR` trước khi chạy script. Script từ chối ghi đè tài khoản có sẵn. Không có cơ chế đăng ký quản trị công khai.

## Tùy chỉnh

- Mặc định tập trung tại `src/config/site.ts` và `.env.example`.
- `/admin/settings`: tên network, IP/port, phiên bản, hero, Discord, cửa hàng, thưởng vote và DEMO.
- `/admin/news`, `/admin/modes`, `/admin/products`, `/admin/rules`, `/admin/links`: thêm, sửa, xóa nội dung.
- `/admin/rankings`, `/admin/tickets`: chỉ ADMIN được truy cập.
- Các giá trị lưu trong `SiteSetting` ghi đè mặc định và biến môi trường tương ứng.
- Thêm ảnh vào `public/images/`, khai báo lựa chọn trong `src/config/admin.ts`. Chỉ chấp nhận tài nguyên cục bộ, không có upload ảnh tùy ý.
- Nội dung bài viết và quy định là văn bản có xuống dòng, được React escape; không thực thi HTML hoặc script nhập từ admin.

Khi có Minecraft server thật, nhập host và port, rồi tắt DEMO. Không dùng tên miền website làm host Minecraft nếu chưa có máy chủ và DNS tương ứng.

## Những chức năng đã triển khai

- Home, News/list/detail, Game Modes/list/detail, Leaderboards, Store/list/detail, Vote, Rules, Support, Privacy và 404.
- Navigation desktop/mobile, trạng thái cuộn, copy IP, toast, loading, hover, chuyển động nhẹ và hỗ trợ reduced motion.
- News tìm kiếm, danh mục, phân trang; leaderboard sáu loại và phân trang.
- Store lọc, tìm kiếm, chi tiết, giỏ hàng chỉnh số lượng và lưu localStorage.
- Ticket hỗ trợ có validation, honeypot, rate limit và lưu database; admin xem, đổi trạng thái, xóa.
- Auth: scrypt có salt, session token ngẫu nhiên lưu hash, cookie HttpOnly/SameSite Strict, Secure ở production, hết hạn 8 giờ, phân quyền ADMIN/EDITOR và kiểm tra Origin.
- Java server status qua TCP: handshake/status/ping/pong, chặn địa chỉ nội bộ mặc định, giới hạn packet, timeout, tối đa hai lần thử, cache 45 giây và gộp truy vấn đồng thời.
- Discord widget chỉ hiển thị số liệu nhận được từ API hợp lệ; không bịa số thành viên.
- API nhập thống kê có bearer token. Không dùng số liệu ngẫu nhiên làm dữ liệu live.
- Metadata, Open Graph, sitemap, robots, keyboard focus, responsive và security headers.

## Những tích hợp cần cấu hình thật

- `play.example.com` và link `discord.gg/example` là placeholder. Trạng thái DEMO trả `players: null`.
- Avatar và thành tích seed là minh họa. Nhập dữ liệu đã xác minh qua admin hoặc `/api/stats/ingest`.
- Không có thanh toán/cấp vật phẩm. Giỏ chỉ xem thử; có thể cấu hình link Tebex/cửa hàng ngoài. Giỏ bên ngoài quản lý riêng.
- Vote chưa kết nối Votifier/NuVotifier; không xác minh lượt vote, tự cấp thưởng hoặc hiển thị lịch sử giả.
- Ticket được lưu thật nhưng không tự gửi email/Discord. Không hứa thời gian phản hồi.
- Bản tĩnh cập nhật nội dung bằng cách build và xuất bản lại. Admin/database phải chạy ở backend Node riêng.

## Lệnh

| Lệnh                      | Tác dụng                                                     |
| ------------------------- | ------------------------------------------------------------ |
| `npm run dev`             | Development server                                           |
| `npm run db:setup`        | Khởi tạo migration và dữ liệu DEMO                           |
| `npm run admin:create`    | Cấp tài khoản từ biến môi trường                             |
| `npm run typecheck`       | Kiểm tra TypeScript                                          |
| `npm run lint`            | ESLint                                                       |
| `npm test`                | Test bảo mật, protocol và route với SQLite riêng             |
| `npm run build`           | Build production                                             |
| `npm start`               | Chạy output standalone cùng static assets                    |
| `npm run build:inet`      | Xuất frontend tĩnh vào `inet-site/`                          |
| `npm run test:inet`       | Kiểm thử bản iNET đã export                                  |
| `npm run preview:inet`    | Xem bản tĩnh ở localhost:3102                                |
| `npm run test:e2e`        | Chromium tests với database test riêng                       |
| `npm run db:use-postgres` | Chọn schema/migration PostgreSQL, không tự chuyển dữ liệu cũ |

Chạy kiểm thử trình duyệt:

```bash
npm run build
npx playwright install chromium --only-shell
npm run test:e2e
```

Nếu Linux thiếu thư viện trình duyệt, dùng `npx playwright install --with-deps chromium --only-shell` trên máy/CI có quyền cài gói hệ thống. E2E tự tạo mật khẩu ngẫu nhiên cho tài khoản test trong `tests/e2e.db`; không dùng database thật. Kết quả thực tế và giới hạn kiểm chứng ở [docs/QA.md](docs/QA.md).

## Production và tên miền

```bash
npm run build
npm start
```

Cấu hình `APP_URL` bằng URL HTTPS thật trong production. Với SQLite, đặt file trên volume bền vững và chỉ chạy một replica. Với PostgreSQL, xem [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) để chọn đúng schema/migration trước build. Có `Dockerfile`, `railway.json` và health check `/api/health`.

Tài liệu:

- [iNET, ZIP và nhánh Git tĩnh](docs/INET.md)
- [Railway, domain, HTTPS, database và backup](docs/DEPLOYMENT.md)
- [API và Minecraft integrations](docs/API.md)
- [Design system và đối chiếu nguồn tham khảo](DESIGN.md)
- [Nguồn tài nguyên](docs/ASSETS.md)
- [Kết quả kiểm thử](docs/QA.md)

Chưa công khai website, chưa thay DNS và chưa có URL deployment được xác minh. Việc chuẩn bị cấu hình domain không đồng nghĩa domain đã được nối hosting.
