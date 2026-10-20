# Ryuuworl Minecraft

Mã nguồn website Ryuuworl và bộ cài máy chủ Minecraft Java + Bedrock.

- `src/`: website tĩnh đang dùng; chạy `npm run check` rồi `npm run build`.
- `minecraft-server/`: máy chủ game, plugin và bảng quản lý. Xem `minecraft-server/README.md`. JAR được tải bằng `python3 install.py` theo `artifacts.lock.json`.
- `imports/ai-github/`: website Next.js có backend; xem `BUILD-RYUUWORL.md` trong thư mục này.
- `phone-vps/`: công cụ quản lý tiến trình trên Termux.
- `scripts/`: công cụ kiểm tra, build, đóng gói và triển khai.

Bản mã nguồn không chứa token, cơ sở dữ liệu tài khoản, world, khóa Floodgate, nhật ký, bản build hay thư viện đã tải. Các cấu hình phân phối đã bỏ khóa quản trị và địa chỉ LAN của máy đang chạy. `eula.txt` đặt `false`; người vận hành mới tự đọc và chấp nhận EULA trước khi khởi động.

Tài liệu dưới đây ghi lại cấu hình và các lần triển khai trước khi đưa mã nguồn lên GitHub; các biên nhận trong `release/` thuộc workspace cục bộ.

---

> **Website đã cập nhật ngày 20/10/2026:** [ryuuworl.id.vn](https://ryuuworl.id.vn/) và [www.ryuuworl.id.vn](https://www.ryuuworl.id.vn/) đã phục vụ đúng bản có nút Discord rõ ở đầu trang, menu và phần cộng đồng; khung trạng thái Java online/offline, số người chơi, phiên bản, nút kiểm tra lại và tự cập nhật mỗi phút. Bedrock vẫn hiển thị bảo trì, ẩn thông tin kết nối. Cả 10 tệp trên hai tên miền đã khớp bản build; Preview giữ nguyên. Biên nhận: `release/discord-status-deployment.json`; kiểm tra chức năng/public HTTP: `release/discord-status-build.json` và `release/discord-status-live-validation.json`.

## Server game Java + Bedrock

Đã khởi động Ryuuworl trên Termux qua Debian/Linux Java 21. Java nhận client 1.21–26.3; Bedrock theo dải Geyser 26.30–26.52. Địa chỉ LAN: `192.168.1.172`, Java TCP `25565`, Bedrock port `19132` (TCP/UDP), NetherNet media UDP `19133`.

Đã thêm AuthMe cho `/register` và `/login`, lưu BCrypt trong SQLite, giao diện lệnh tiếng Việt. Kiểm tra status Java/Bedrock, signaling TCP, bắt tay Java 1.21/1.21.4/1.21.11/26.3 và chặn client dưới 1.21 đã đạt. Chưa thử đăng nhập/chơi bằng tài khoản thực từ client.

Hướng dẫn tại [minecraft-server/README.md](minecraft-server/README.md); biên bản kiểm tra ở `release/ryuuworl-minecraft-runtime.json`. Gói cài đặt: `release/ryuuworl-minecraft-crossplay.zip`, không chứa world, dữ liệu tài khoản, khóa Floodgate hoặc token. EULA đã được chủ server chấp nhận trên máy này; ZIP vẫn dùng `eula=false` cho người vận hành mới.

Java công khai qua SRV `ryuuworl.id.vn` → `traded-disk.tun.ply.gg:9719`; đã kiểm tra kết nối từ Internet. Cấu hình Java hiện nhận cả bản quyền và offline (`online-mode=false`), bắt buộc AuthMe `/register` và `/login`. Bedrock chưa có tunnel công khai. Xem `release/java-mixed-mode-change.json` và `release/runtime-validation.md`. Gói ZIP Minecraft đã được đóng gói lại với chế độ nhận cả bản quyền và offline; khóa quản trị cục bộ không được xuất vào ZIP.

> **Bản GitHub mới đã build:** mã nguồn tại `imports/ai-github/`, đã cấu hình Ryuuworl và IP Minecraft `ryuuworl.id.vn`. Gói backend web: `release/ryuuworl-backend-linux-arm64.zip`; gói tĩnh OneShield: `release/ryuuworl-github-inet.zip`. Xem `imports/ai-github/BUILD-RYUUWORL.md` và `release/ryuuworl-github-validation.json`. Cả hai bản đã build và kiểm tra; chưa triển khai bản mới. Các mục bên dưới ghi lại website và những lần triển khai trước.

# Minecraft Ryuuworl

Website tiếng Việt dạng tĩnh, được chuẩn bị cho **OneShield Pages — kênh Preview**. Giao diện gồm phong cảnh voxel SVG, nội dung khám phá, hướng dẫn Java/Bedrock trong hộp thoại, menu di động, câu hỏi thường gặp và phần cộng đồng.

**Trạng thái mới nhất: bản có Discord và trạng thái server đã phát hành Production, kiểm tra thành công trên tên miền gốc và www.** Chi tiết ở thông báo đầu tài liệu và `release/discord-status-deployment.json`. Các lỗi 509/nội dung cũ và biên nhận `release/production-deployment.json` bên dưới thuộc các lần phát hành trước.

## Chạy cục bộ

Yêu cầu Node.js 20+ và Python 3.10+. Không cần `npm install`; dự án không có dependency ngoài.

```sh
npm run check
npm run build
npm run preview
```

Mở `http://127.0.0.1:4173`. Máy chủ cục bộ chỉ phục vụ `dist/`, không phục vụ thư mục gốc dự án hoặc `.env`. Dùng `Ctrl+C` để dừng.

## Cập nhật thông tin công khai

Sửa `site.config.json`, sau đó build lại:

- `serverAddress`: địa chỉ Minecraft thực tế.
- `edition`: nền tảng được máy chủ hỗ trợ.
- `gameVersion`: phiên bản Minecraft tương thích.
- `discordUrl`: liên kết Discord HTTPS chính thức.

Cấu hình hiện có địa chỉ Java `ryuuworl.id.vn`, phiên bản tương thích và link Discord chính thức `https://discord.gg/qKVvetUnxR`. Nút Discord có href ngay trong HTML và hoạt động khi không tải được cấu hình hoặc khi JavaScript tắt. Trạng thái Java được kiểm tra qua mcstatus.io; lỗi mạng/dữ liệu quá cũ hiển thị “Chưa xác định”, không tự kết luận server offline. Bedrock đang bảo trì, không hiện IP/cổng hay nút sao chép trong tab Bedrock. Các hình và câu chuyện khám phá là nội dung minh họa, không phải ảnh chụp hoặc danh sách chế độ đã xác nhận của máy chủ.

Chỉ nhập thông tin công khai vào tệp này. Token nằm trong biến môi trường hoặc `.env`, không đưa vào website. Build sử dụng danh sách tệp được phép, không sao chép cả workspace.

## Kiểm tra OneShield và đóng gói Preview

Theo [skill OneShield Pages](.agents/skills/oneshield-pages/SKILL.md): biến môi trường được ưu tiên trước `.env`. Endpoint mặc định là `https://portal.inet.vn`. Các script không in token, Authorization hoặc URL ký sẵn.

```sh
npm run preflight:preview
npm run prepare:preview
```

`preflight:preview` chỉ gọi GET cho project đã cấu hình, state, usage và tiers. Không theo redirect để tránh chuyển thông tin xác thực sang host khác. Phản hồi được lọc trước khi lưu; không lưu phản hồi thô.

`prepare:preview` chỉ kiểm tra và đóng gói cục bộ, không thực hiện HTTP. Script yêu cầu kênh cấu hình là `preview`, kiểm tra `index.html`, tham chiếu HTML/ARIA, SVG, các tài nguyên nội bộ, danh sách tệp được phép và việc token không xuất hiện trong build. ZIP có `index.html` ở gốc và timestamp cố định để tái tạo được.

Tệp bàn giao:

- `dist/`: website đã build, chỉ gồm tài nguyên công khai.
- `release/ryuuworl-preview.zip`: ZIP sẵn sàng upload.
- `release/preview-manifest.json`: project, kênh `preview`, kích thước, SHA-256 ZIP, SHA-256 từng tệp và trạng thái chờ xác nhận.
- `release/preflight.json`: kết quả kiểm tra GET cùng snapshot hai kênh trước triển khai.
- `release/validation.json`: kết quả HTTP, kiểm tra hash và giới hạn kiểm thử giao diện.

Thông số triển khai: `channel=preview`, `spa_fallback=false`, `smart_rename_index=false`. Website dùng anchor và hộp thoại, không dùng client-side router. Preview đặt `noindex, nofollow` và `robots.txt: Disallow: /`; cần xem lại cấu hình tìm kiếm nếu sau này xuất bản Production.

API project/state/usage đã xác thực thành công. `/tiers` trả HTTP 403 với token hiện có, vì vậy giới hạn gói chưa được xác minh. Không suy đoán hạn mức; nếu upload bị từ chối, dùng lỗi thực tế từ OneShield để xử lý.

## Triển khai sau khi người dùng xác nhận

Không có hook tự triển khai khi build hoặc đóng gói. Lần triển khai hiện tại đã được xác nhận trong hội thoại. Script `scripts/deploy-preview.py --confirmed-preview` đã dùng đúng ZIP được duyệt, lưu Idempotency-Key riêng cho upload/prepare/activate và kiểm tra cả hai kênh. Biên nhận cho phép tiếp tục cùng thao tác nếu kết quả mạng không rõ ràng.

Với các lần triển khai tiếp theo, chỉ chạy **khi người dùng đã xác nhận bản build mới và kênh Preview**. Lệnh skill gốc là:

```sh
ONESHIELD_CHANNEL=preview ONESHIELD_SPA_FALLBACK=false python3 .agents/skills/oneshield-pages/scripts/deploy.py ./dist
```

Script gốc của skill thực hiện ZIP → upload → prepare với `channel=preview` → activate → kiểm tra `preview.effective` khớp deployment mới. Mỗi thao tác ghi dùng Idempotency-Key riêng.

Trước lệnh triển khai, kiểm tra file hash trong manifest còn khớp build đã được duyệt. Nếu thay đổi nội dung, build và chuẩn bị lại rồi xin xác nhận bản mới. Sau khi triển khai, đọc lại state để xác nhận Preview khớp deployment mới và Production khớp baseline; lấy hostname thực tế từ cấu hình project/state rồi kiểm tra nội dung live. Không suy đoán URL Preview. Upload thành công chưa có nghĩa website đã hoạt động.

## Giới hạn kiểm tra giao diện

Môi trường hiện không có trình duyệt hoặc công cụ điều khiển trình duyệt. Đã kiểm tra cú pháp JavaScript, cấu trúc và tài nguyên build, raster hóa để xem hình SVG, kiểm tra HTTP cục bộ và tính toàn vẹn ZIP. Chưa kiểm thử bố cục hoặc tương tác trong trình duyệt thực tế.

## Kết quả Preview trước khi phát hành Production

- Deployment: `dep_1792386233298121337_781cb2dc-66bb-4db2-918c-41278c1a5835_c70dc0d1`.
- ZIP SHA-256: `c70dc0d17114c1f80df00ff48f705ea4dfe95380e445daafbdb791c274a8e5c9`.
- Kênh Preview: `effective` khớp deployment đã upload.
- Production: `effective` không đổi so với baseline ngay trước triển khai.
- Kiểm tra URL công khai: đạt tại https://prev-e2a89a75.ryuuworl.id.vn/. Cả 10 tệp trả HTTP 200; 9 tệp khớp SHA-256 trực tiếp. HTML khớp hoàn toàn sau khi loại đúng hai script nội bộ được máy chủ chèn thêm; hai tài nguyên script này cũng truy cập được.
- Hostname Preview: `prev-e2a89a75.ryuuworl.id.vn`, hoạt động và TLS sẵn sàng. Hostname Production: `ryuuworl.id.vn`. Agent chỉ đọc cấu hình hostname và không thực hiện thay đổi DNS/domain.

## Lịch sử phát hành Production theo yêu cầu chuyển sang www

- Dùng lại deployment đã được duyệt: `dep_1792386233298121337_781cb2dc-66bb-4db2-918c-41278c1a5835_c70dc0d1`; không upload lại.
- Production `effective` đã khớp deployment mới; Preview giữ nguyên.
- Tên miền gốc: https://ryuuworl.id.vn/ — HTTP 200 nhưng nội dung vẫn là website cũ; các tài nguyên của build mới trả 404. Chưa xác nhận được Production ở tầng HTTP.
- Hostname được yêu cầu: `www.ryuuworl.id.vn` — DNS phân giải, binding Production active và TLS ready, nhưng HTTPS vẫn trả 509.
- Thông báo server: “Trang xem trước chưa sẵn sàng. Địa chỉ này chưa được liên kết với một trang đang hoạt động.”
- Không có thay đổi DNS/domain do agent thực hiện. Chủ tài khoản cần nhờ OneShield kiểm tra/đồng bộ định tuyến hostname: API state đã nhận deployment Production mới nhưng www vẫn 509 và tên miền gốc vẫn phục vụ website cũ. Đã thử yêu cầu bỏ cache và URL kiểm tra mới. Skill triển khai không quản lý DNS hoặc custom domain.
- Bản Production dùng nguyên build đã duyệt; chỉ thị noindex của bản Preview vẫn được giữ nguyên.
