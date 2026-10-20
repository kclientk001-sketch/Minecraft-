# Ryuuworl Phone Linux

Máy chủ Linux chạy ngay trên điện thoại OPPO CPH2321 qua Termux và Debian 13 PRoot. Dùng lại Java 21, dữ liệu Minecraft và liên kết Playit đã có, không cài thêm bộ Linux lớn. Máy dùng RAM, CPU, ổ đĩa và kết nối mạng của điện thoại; PRoot không tạo kernel hoặc IP công khai riêng.

## Bật máy chủ

Mở ứng dụng Termux và chạy:

```sh
python /data/data/com.termux/files/home/ryuuworl/phone-vps/manage.py run
```

Hoặc:

```sh
sh /data/data/com.termux/files/home/ryuuworl/phone-vps/start.sh
```

Giữ phiên này chạy. Có thể mở phiên Termux thứ hai để dùng các lệnh quản lý. Minecraft cần vài phút để khởi động trên máy này; tiến trình đang tồn tại chưa có nghĩa game đã sẵn sàng.

Bộ điều khiển bật ba dịch vụ:

- Minecraft Paper 1.21.11 + ViaVersion/ViaBackwards, AuthMe, Geyser/Floodgate.
- Playit agent đã liên kết với tài khoản của chủ máy.
- Bảng quản trị tại http://127.0.0.1:8765, tiếp tục dùng mật khẩu bạn đã đặt.

Java được giới hạn heap 256–768 MB, dùng cấu hình CPU và khoảng nhìn đã thiết lập cho điện thoại. Yêu cầu giữ CPU thức được gửi bằng `termux-wake-lock`; kết quả được ghi trong trạng thái. Cổng bảng quản trị chỉ nghe localhost.

## Kiểm tra và điều khiển

Trong một phiên Termux khác:

```sh
cd /data/data/com.termux/files/home/ryuuworl
python phone-vps/manage.py status --public
python phone-vps/manage.py open
python phone-vps/manage.py shell
```

`status --public` kiểm tra lại endpoint Java thật; không dùng kết quả cũ để kết luận server đang online. `shell` mở Debian với Java 21, thư mục nhà riêng `/root` lưu tại `phone-vps/home/` và dữ liệu game ở `/srv/minecraft`. Tên shell là `ryuuworl-phone`; root trong PRoot là quyền giả lập trong môi trường Linux, không phải quyền root Android.

Dừng toàn bộ bằng Ctrl+C trong phiên đang chạy, hoặc:

```sh
python /data/data/com.termux/files/home/ryuuworl/phone-vps/manage.py stop
```

Bộ điều khiển gửi lệnh `stop` để Minecraft lưu thế giới, rồi dừng relay và bảng quản trị. Trạng thái sẽ báo tiến trình còn đang dừng nếu chưa lưu xong. Lệnh dừng Minecraft từ bảng quản trị hoặc console được giữ nguyên, không bị tự khởi động lại. Có thể bật lại riêng game từ bảng quản trị.

Nếu một tiến trình lỗi, bộ điều khiển thử chạy lại với khoảng chờ tăng dần. Sau năm lần lỗi trong mười phút, dịch vụ đó được tạm dừng để tránh vòng lặp lỗi; dùng lệnh `run` sau khi xử lý nguyên nhân để yêu cầu bật lại.

## Địa chỉ game

- Java: **`ryuuworl.id.vn`**, không kèm cổng. Bản ghi SRV đã được chủ tên miền lưu và kiểm tra trên Google DNS/Cloudflare ngày 19/10/2026. Địa chỉ tunnel dự phòng: `traded-disk.tun.ply.gg:9719`. Game và agent cần đang chạy.
- Bedrock trong LAN: cổng 19132; chưa có tunnel Bedrock công khai.
- Kiểm tra lại DNS và đích game bằng `python scripts/check-minecraft-domain.py` từ thư mục dự án. Chưa thử đăng nhập/chơi bằng client Minecraft thực tế.

## Phiên chạy và quyền trên Android

Trên lần kiểm tra này, phiên tmux do công cụ tạo đã bị kết thúc sau khi bật game. Lệnh `detach` vẫn có sẵn cho phiên Termux do chủ máy quản lý, nhưng chưa được xác nhận chạy bền trên máy này; cách chính là chạy `run` trực tiếp trong ứng dụng Termux.

Termux RunCommand hiện từ chối khởi động lệnh từ ứng dụng khác vì `allow-external-apps` chưa bật. Chạy lệnh trực tiếp trong terminal Termux không cần bật quyền này. Bộ công cụ không sửa `~/.termux/termux.properties` hoặc thiết lập hệ thống ngoài thư mục dự án.

Android 12 trên máy này có thể giới hạn tiến trình nền và CPU. Để chạy lâu, kiểm tra quyền chạy nền và tối ưu pin của Termux trong cài đặt Android. Việc hệ thống tắt toàn bộ ứng dụng Termux hoặc tắt nguồn điện thoại cũng dừng máy chủ; sau khi mở máy, chạy lại lệnh bật ở trên.

## File và dữ liệu

- Dữ liệu game và tài khoản: giữ trong `minecraft-server/`, không tạo lại thế giới hoặc thông tin đăng nhập.
- Điều khiển riêng: `phone-vps/.runtime/`, quyền thư mục 0700 và file 0600.
- Nhật ký bộ điều khiển: `phone-vps/logs/supervisor.log`; được xoay khi vượt 2 MB.
- Token Playit và mật khẩu bảng quản trị tiếp tục ở các file riêng đã có; không in ra terminal, không đóng gói vào ZIP phát hành.
- Lần kiểm tra tài nguyên đầu: RAM tổng khoảng 5,5 GiB, RAM khả dụng khoảng 1,6 GiB, ổ trống khoảng 1,3 GiB. Không xóa dữ liệu của bạn để giải phóng chỗ.

## Tài liệu nền tảng

- [PRoot-Distro: Linux trên Android và giới hạn](https://github.com/termux/proot-distro#limitations)
- [Termux RunCommand](https://github.com/termux/termux-app/wiki/RUN_COMMAND-Intent)
- [Termux: giới hạn Android 12+](https://github.com/termux/termux-app#readme)
