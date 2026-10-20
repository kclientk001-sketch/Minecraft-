# Ryuuworl — Minecraft Java + Bedrock

Server game dùng chung world Survival; Minecraft Java dùng địa chỉ **`ryuuworl.id.vn`** qua bản ghi SRV đã được chủ tên miền cấu hình.
Website tại `imports/ai-github` và OneShield Pages hoạt động riêng; Pages không chạy tiến trình Minecraft hoặc các cổng game.

## Phiên bản

| Thành phần | Phiên bản |
| --- | --- |
| Paper / world | Minecraft 1.21.11, build 132 STABLE |
| ViaVersion / ViaBackwards | 5.12.1 / 5.12.1 |
| Geyser-Spigot | 2.12.0, build 1265 |
| Floodgate-Spigot | 2.2.5, build 141 |
| AuthMe Paper | 6.0.1 |
| Runtime | Linux Java 21+ và Python 3.11+ |

Cấu hình chấp nhận **Java 1.21–1.21.11 và 26.1–26.3** theo các giao thức hiện có trong hai plugin Via. Các client dưới 1.21 bị chặn. Không cam kết tự hỗ trợ các phiên bản tương lai chưa có trong plugin; cần kiểm tra và cập nhật JAR khi Minecraft phát hành bản mới.
Bedrock theo dải Geyser hiện hỗ trợ: **26.30–26.52**. Bedrock 1.21 cũ cần cập nhật; ViaBackwards chỉ dịch giao thức Java, không bổ sung hỗ trợ Bedrock cũ.
World và nội dung game vẫn là 1.21.11; dịch giao thức không thêm các khối hoặc tính năng thế giới của bản mới.

## Tạo tài khoản và đăng nhập trong game

Java nhận cả tài khoản bản quyền và tài khoản offline (crack) với `online-mode=false`. Cả hai loại đều phải dùng AuthMe để đăng ký/đăng nhập; chưa bật tự đăng nhập cho tài khoản premium. Bedrock vẫn dùng Floodgate xác thực qua Xbox. Sau khi vào server, người chơi dùng tài khoản AuthMe gắn với tên nhân vật của mình:

```text
/register MAT_KHAU MAT_KHAU
/login MAT_KHAU
/changepassword MAT_KHAU_CU MAT_KHAU_MOI
/logout
```

Mật khẩu dài 8–72 ký tự ASCII hiển thị, không có khoảng trắng. Người chơi tự chọn mật khẩu; không có tài khoản hoặc mật khẩu admin mặc định.
AuthMe lưu mật khẩu dạng BCrypt (cost 12) trong SQLite riêng, không lưu mật khẩu rõ. Yêu cầu đăng nhập mỗi lần kết nối; chưa đăng nhập thì không được di chuyển/chat/chơi.
Cấu hình cho phép tiền tố `.` của tên nhân vật Floodgate và tối đa 5 đăng ký từ một IP để hỗ trợ các người chơi cùng mạng.
Thông báo AuthMe dùng tiếng Việt. Dùng lệnh chat để tương thích Java cũ và Bedrock; đã tắt các hộp thoại đăng nhập mới. Chưa thiết lập SMTP/khôi phục mật khẩu qua email.
Đã tắt log lệnh người chơi trong `spigot.yml`. Không đưa mật khẩu vào các lệnh quản trị được chia sẻ hoặc công khai dữ liệu tài khoản.

## Bảng điều khiển trên trình duyệt

Mở **http://127.0.0.1:8765** trên chính thiết bị chạy server. Bảng quản lý có trạng thái Java/Bedrock, số người chơi, log trực tiếp, ô gửi lệnh, nút bật server, lưu và dừng, cùng các lệnh nhanh. Lần đầu mở, tự đặt mật khẩu quản trị 8–128 ký tự trên trang; đây là mật khẩu riêng của bảng quản lý, tách với AuthMe trong game.

Mật khẩu quản trị được băm bằng scrypt và lưu tại `.runtime/panel-auth.json` với quyền 0600. Phiên đăng nhập dùng cookie HttpOnly và hết hạn sau 8 giờ. Bảng quản lý chỉ nghe trên loopback; các thao tác cần đăng nhập và Origin hợp lệ. Không có API tải cấu hình, DB tài khoản hay khóa Floodgate.

Nếu bảng chưa chạy, mở một phiên Termux và dùng:

```sh
cd minecraft-server
python3 panel.py
```

Sau đó mở URL trên hoặc gọi `termux-open-url http://127.0.0.1:8765` trong một phiên khác. Tắt tiến trình bảng quản lý không tự dừng game. Bảng không tự chấp nhận EULA hay cấp OP.

## Chạy trên Termux hiện tại

Java Android trực tiếp không nạp được thư viện NetherNet của bản Geyser này. Máy hiện tại đã có Debian proot và Java Linux Temurin 21.0.12.1 được tải từ Adoptium, kiểm tra SHA256 chính thức; thử nạp thư viện NetherNet qua Linux đã đạt.

```sh
cd minecraft-server
python3 service.py start
python3 service.py status
python3 status.py
# Dừng và lưu world:
python3 service.py stop
```

`service.py` điều khiển console qua FIFO riêng trong `.runtime`, không mở cổng quản trị RCON. Log ở `logs/console.log` và `logs/latest.log`. Lệnh `start` chỉ báo tiến trình đã được tạo; đợi dòng `Done` và kiểm tra bằng `status.py` mới xác nhận endpoint sẵn sàng.
Có thể gửi lệnh quản trị bằng `python3 service.py console list`, `python3 service.py console plugins`, hoặc `python3 service.py console op TEN_NGUOI_CHOI`.

Chạy foreground trên Termux:

```sh
sh run-linux.sh
# Gõ stop trong console để lưu và dừng.
```

Helper mặc định dùng rootfs Debian của `proot-distro` và Java tại `../.build-tools/java21`. Có thể đổi bằng `MC_LINUX_ROOTFS` và `MC_LINUX_JAVA`. Linux Java/rootfs không nằm trong ZIP. Khi chuyển ZIP sang một máy Termux khác cần chuẩn bị hai thành phần này.
Trên Android, có thể dùng `termux-wake-lock` trước khi chạy lâu và `termux-wake-unlock` sau khi dừng, đồng thời kiểm tra thiết lập pin của Termux. Không có cơ chế bảo đảm Android luôn giữ tiến trình hoạt động.

## Chạy trên Linux/VPS

Cài Linux Java 21+ và Python 3.11+, giải nén ZIP và chạy:

```sh
cd minecraft-server
python3 install.py --verify
# Nếu thiếu JAR: python3 install.py
# Đọc EULA, rồi chỉ khi chính bạn đồng ý:
sh accept-eula.sh --agree
MC_MIN_RAM=512M MC_MAX_RAM=2G sh start.sh
```

Trên VPS dùng `start.sh` trực tiếp thay cho helper Termux. Nên có ít nhất 4 GB RAM để còn bộ nhớ ngoài heap; điều chỉnh theo tải thực tế. Cấu hình heap mặc định cho điện thoại là 256–768 MB. Cấu hình chơi hiện tại: Survival, Normal, tối đa 5 người, view-distance 4 và simulation-distance 4.

Chủ server đã xác nhận EULA trong cuộc trò chuyện cho bản đang chạy trên máy này. ZIP phân phối vẫn đặt `eula=false` để người vận hành máy mới tự đọc và chấp nhận [Minecraft EULA](https://www.minecraft.net/en-us/eula). Không tự chấp nhận EULA khi cài đặt.

## Kết nối

| Client/dịch vụ | Nhập trong client | Tuyến kết nối hiện tại |
| --- | --- | --- |
| Java công khai | `ryuuworl.id.vn` (không kèm cổng) | SRV → `traded-disk.tun.ply.gg:9719` → TCP 25565 trên điện thoại |
| Bedrock trong LAN | IP LAN điện thoại, port `19132` | TCP 19132 + UDP 19132; chưa có tunnel công khai |
| NetherNet media trong LAN | dùng cùng mục server Bedrock | UDP 19133 |

Geyser dùng `transport: both`: RakNet và NetherNet có các cổng UDP riêng. Signaling NetherNet dùng HTTP trên TCP 19132; chưa cài certificate HTTPS, nên client có thể hỏi xác nhận tin cậy lần đầu.

Trong cùng thiết bị dùng `127.0.0.1`; thiết bị cùng LAN dùng IP LAN thật của máy chạy server. Khi chuẩn bị lần đầu, IP theo tuyến mạng máy này là `192.168.1.172`; IP LAN có thể đổi, cần kiểm tra lại nếu không kết nối được. Bản chạy trên máy này khai báo địa chỉ LAN trên cổng UDP 19133 cho signaling NetherNet; bản ZIP để danh sách advertise rỗng để người vận hành mới tự cấu hình đúng mạng.
Java hiện dùng Playit cho kết nối Internet. Các bước sau dành cho việc chuyển sang máy có IP công khai hoặc cấu hình Bedrock công khai sau này:

1. Có IP công khai truy cập được và máy chủ đang chạy game; nếu CGNAT có thể cần VPS hoặc tunnel hỗ trợ đủ TCP/UDP.
2. Trỏ DNS hostname game tới IP thật của máy chủ. Hostname game qua CDN cần DNS trực tiếp; đồng thời kiểm tra việc phục vụ website trên cùng tên miền.
3. Mở firewall/chuyển tiếp TCP 25565, TCP+UDP 19132, UDP 19133 về máy chạy server.
4. Nếu ở sau NAT, điền IP công khai thật kèm `:19133` vào `bedrock.signaling.builtin.advertise-addresses` của Geyser rồi khởi động lại.
5. Thử đăng nhập từ mạng khác bằng cả hai loại client.

Chủ tên miền đã thêm SRV `_minecraft._tcp.ryuuworl.id.vn` trong iNET ngày 19/10/2026. Google DNS và Cloudflare trả đúng đích/cổng, đích game phản hồi status và yêu cầu xác thực Java. Chưa thử đăng nhập/chơi bằng client Minecraft thực tế. Xem [cấu hình tên miền](DOMAIN-SETUP.md); bản ghi SRV Java tách với các bản ghi website.

## Kiểm tra và sao lưu

```sh
python3 status.py
# Kiểm tra SRV và đích công khai từ thư mục minecraft-server:
python3 ../scripts/check-minecraft-domain.py
```

Script đọc status Java, ping Bedrock RakNet và kiểm tra TCP signaling. Đây không phải kiểm thử đăng nhập/chơi hoàn chỉnh hay xác nhận WebRTC xuyên NAT.

`online-mode=false` để nhận cả Java bản quyền và offline; AuthMe bắt buộc đăng ký/đăng nhập. Geyser dùng `java.auth-type: floodgate`; `enforce-secure-profile=false` để Bedrock chat. RCON và Query tắt. Chưa cấp OP cho người chơi nào.

Sau khi `stop`, sao lưu riêng toàn bộ world, `plugins/AuthMe/authme.db`, khóa Floodgate, cấu hình và dữ liệu người chơi. Không công khai `plugins/floodgate/key.pem`, dữ liệu tài khoản hoặc log riêng. ZIP cài đặt chỉ chứa JAR/cấu hình/script được chọn trước, không chứa world, DB mật khẩu, khóa Floodgate hay token OneShield.

## Nguồn chính thức

- [Paper: khởi động và Java](https://docs.papermc.io/paper/getting-started/)
- [ViaVersion](https://github.com/ViaVersion/ViaVersion), [ViaBackwards](https://viaversion.com/viabackwards)
- [Geyser: dải phiên bản](https://geysermc.org/wiki/geyser/supported-versions/), [cài đặt và cổng](https://geysermc.org/wiki/geyser/setup/)
- [Floodgate](https://geysermc.org/wiki/floodgate/setup/)
- [AuthMe 6.0.1](https://github.com/AuthMe/AuthMeReloaded/releases/tag/6.0.1), [lệnh](https://github.com/AuthMe/AuthMeReloaded/blob/6.0.1/docs/commands.md)
- [Minecraft: cách đánh số bản từ năm 2026](https://www.minecraft.net/en-us/article/minecraft-new-version-numbering-system)

Các JAR giữ nguyên từ nguồn chính thức, URL và SHA256 trong `artifacts.lock.json`. Xem giấy phép đi kèm từng JAR và nguồn dự án. Không phân phối Minecraft vanilla JAR hoặc Java runtime trong ZIP.
