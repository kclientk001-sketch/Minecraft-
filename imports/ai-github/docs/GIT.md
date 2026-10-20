# Git và repository

Repository bàn giao: [kclientk001-sketch/ai](https://github.com/kclientk001-sketch/ai). Repository này ban đầu chỉ có README mặc định; lịch sử khởi tạo được giữ lại.

## Lấy mã nguồn đầy đủ

```bash
git clone https://github.com/kclientk001-sketch/ai.git minecraft-network
cd minecraft-network
git branch -a
```

Nhánh `main` chứa mã nguồn Next.js, Prisma, tests, tài liệu và ảnh kiểm thử. Làm theo README để cài dependencies, khởi tạo database và tạo quản trị viên bằng mật khẩu riêng. Repository không chứa database, mật khẩu quản trị hoặc `.env` thật.

## Bản dành cho iNET

Nhánh `inet` chứa HTML/CSS/JS đã build, với `index.html` ngay ở gốc. URL dùng trong mục Git URL của OneSite:

```text
https://github.com/kclientk001-sketch/ai/tree/inet
```

Nếu muốn lấy riêng bản tĩnh:

```bash
git clone --branch inet --single-branch https://github.com/kclientk001-sketch/ai.git minecraft-inet
```

Không chạy `npm` trong nhánh này. Đọc `docs/INET.md` trên nhánh `main` để biết giới hạn và cách nối backend. Nhánh tĩnh không tự cập nhật sau mỗi thay đổi source: cần build, kiểm thử và cập nhật nhánh `inet` khi phát hành.

## Bản sao ngoại tuyến

Git bundle bàn giao trước khi đồng bộ GitHub vẫn có thể clone khi không có mạng:

```bash
git clone Minecraft-Network.bundle minecraft-network-offline
```

Bundle là snapshot tại thời điểm bàn giao, có thể không chứa các cập nhật tài liệu sau đó. Dùng GitHub để lấy phiên bản mới nhất.

Không chèn PAT vào remote URL hoặc gửi thông tin đăng nhập trong chat. Dùng cơ chế đăng nhập Git của máy bạn. Việc đưa mã nguồn lên GitHub không tự triển khai website hoặc thay DNS của `ryuuworl.id.vn`.
