# Truy cập Ryuuworl từ Internet

Minecraft Java đã được kiểm tra thành công qua relay Playit:

- Địa chỉ trong Minecraft Java: **traded-disk.tun.ply.gg:9719**.
- Tên không ghi port `traded-disk.tun.ply.gg` hiện có SRV trỏ tới TCP 9719.
- Tunnel Ryu chuyển TCP về `127.0.0.1:25565`; Proxy Protocol đã tắt.
- Người chơi dùng Minecraft Java bình thường từ mạng khác, không cần ứng dụng tunnel/VPN.
- Máy Termux phải duy trì game và agent đang chạy để tiếp nhận kết nối.

## Bằng chứng kiểm tra

Đã nhận đúng MOTD Ryuuworl qua địa chỉ Playit với protocol 767 (Java 1.21) và 777 (Java 26.3). Cả hai bắt tay đăng nhập đều tới bước yêu cầu mã hóa/xác thực Microsoft. Java 1.20.4 bị từ chối theo cấu hình tối thiểu 1.21. Không đọc/in public key hoặc verification token trong các packet mã hóa.

Chưa thử đăng nhập bằng tài khoản Microsoft thật hoặc chơi game từ một client hoàn chỉnh. Xem `release/ryuuworl-public-java-verification.json` và `release/ryuuworl-public-access.json`.

Công cụ `status.py` dùng protocol 767 mặc định; `--java-protocol` cho phép kiểm tra protocol khác. Thăm dò protocol -1 bị ngắt ở đường Playit dù client 767 và 777 kết nối thành công.

## Các phần chưa công khai

- **Bedrock/PE:** chưa có tunnel công khai. Geyser tại LAN vẫn phản hồi RakNet và TCP signaling; NetherNet cần đủ TCP/UDP. Playit hiện ghi rõ NetherNet cần tunnel TCP/UDP của Premium; chưa mua gói hoặc thay đổi hỗ trợ NetherNet.
- **ryuuworl.id.vn:** còn trỏ tới hosting website. Chưa có SRV `_minecraft._tcp.ryuuworl.id.vn`; thử gửi hostname này qua tunnel hiện tại bị ngắt. Chưa thay DNS hoặc xác nhận tên miền game hoạt động. Tính năng external domain của Playit thuộc Premium; cần cấu hình domain và DNS phù hợp trước khi thử lại.
- Bảng quản trị `http://127.0.0.1:8765` chỉ phục vụ localhost.

## Điều khiển agent trên máy chủ

- `python minecraft-server/tunnel.py status`: trạng thái và mốc kiểm tra công khai gần nhất, không in token.
- `python minecraft-server/tunnel.py open`: mở trang quản lý Playit trong trình duyệt Android.
- `python minecraft-server/tunnel.py stop`: dừng riêng agent và trình liên kết, không dừng game.
- Khi cần khởi chạy lại, dùng một phiên Termux duy trì riêng: `python minecraft-server/tunnel.py run-agent`.
- `run-setup` chỉ dùng khi chưa liên kết; thông tin xác thực hiện đã được lưu, không cần liên kết lại.

Đã kiểm SHA-256 Playit 1.0.10 Linux ARM64 từ bản phát hành chính thức. Agent dùng Debian proot có sẵn để đọc đúng cấu hình DNS/chứng chỉ TLS. Trình liên kết dùng DNS Android, giữ nguyên claim đang có và chuyển thông tin xác thực qua IPC protocol 2.

Thông tin xác thực và nhật ký riêng nằm trong `minecraft-server/.runtime/playit/`, thư mục 0700, file riêng 0600; được bỏ qua bởi Git và không nằm trong ZIP phát hành. Agent key chỉ có quyền đọc/chạy; chủ tài khoản tạo/chỉnh tunnel trong dashboard.

## Mạng gốc

IP LAN máy chủ `192.168.1.172`; router `192.168.1.1`. UPnP và NAT-PMP đều báo WAN `100.65.55.215`, thuộc Shared Address Space 100.64.0.0/10. IP egress quan sát được `42.113.243.205`. Mạng có CGNAT, nên dùng relay Playit; không thêm port mapping trên router.

## Nguồn

- [Playit: NetherNet](https://playit.gg/support/minecraft-bedrock-nethernet/)
- [Playit: giá và tính năng](https://playit.gg/pricing/)
- [RFC 6598: Shared Address Space](https://www.rfc-editor.org/rfc/rfc6598)
