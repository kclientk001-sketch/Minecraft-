# API, Minecraft và phân quyền

Backend phải chạy Node.js. Mọi dữ liệu nhập được kiểm tra bằng Zod. Body JSON có giới hạn byte; form không chuyển tiếp yêu cầu đến URL do người gửi tùy ý cung cấp.

| Endpoint                     | Method       | Quyền / chức năng                                    |
| ---------------------------- | ------------ | ---------------------------------------------------- |
| `/api/health`                | GET          | Kiểm tra DB, HTTP 200 hoặc 503                       |
| `/api/server-status`         | GET          | Trạng thái Java thật hoặc DEMO có nhãn               |
| `/api/discord`               | GET          | Widget count từ Discord nếu cấu hình hợp lệ          |
| `/api/support`               | POST         | Lưu ticket, validation/honeypot/rate limit           |
| `/api/auth/login`            | POST         | Tạo session, chống brute force, kiểm tra Origin      |
| `/api/auth/logout`           | POST         | Thu hồi session và cookie                            |
| `/api/auth/me`               | GET          | Profile quản trị đang đăng nhập, không có hash/token |
| `/api/admin/{resource}`      | GET/POST     | Liệt kê/tạo nội dung theo role                       |
| `/api/admin/{resource}/{id}` | PATCH/DELETE | Sửa/xóa nội dung theo role                           |
| `/api/stats/ingest`          | POST         | Nhập dữ liệu từ plugin/API với bearer token          |

Resource: `news`, `modes`, `products`, `rules`, `links`, `rankings`, `tickets`, `settings`. EDITOR quản lý news/modes/products/rules/links. ADMIN quản lý tất cả. `settings` không xóa được; ticket được tạo từ form hỗ trợ và chỉ sửa trạng thái qua admin. Không trả email/ticket trên API công khai.

Auth dùng session token 32 byte ngẫu nhiên, chỉ lưu SHA-256 trong DB; mật khẩu dùng scrypt với salt riêng. Cookie HttpOnly, SameSite Strict, path `/`, Secure và tiền tố `__Host-` ở production. Phiên hết hạn sau 8 giờ. Role và active flag được đọc từ DB mỗi lần xác thực.

Các mutation từ trình duyệt kiểm tra Origin bằng `APP_URL`. Không gửi mutation từ site bất kỳ. Riêng public support/status/Discord có CORS allowlist cho `STATIC_SITE_ORIGIN`; không bật CORS quản trị.

## Status

```json
{
  "state": "demo",
  "demo": true,
  "online": null,
  "players": null,
  "maxPlayers": null,
  "version": null,
  "motd": "Cần cấu hình host thật",
  "latency": null,
  "updatedAt": "ISO timestamp"
}
```

Đây là minh họa response DEMO, không phải trạng thái live.

- `online`: đã nhận status hợp lệ từ server. Online/max/version/MOTD lấy từ packet đó.
- `offline`: kết nối bị từ chối; `online=false` và không bịa số người chơi.
- `error`: DNS/timeout/protocol không xác minh được, UI tạm xem offline và nêu rõ lỗi truy vấn.
- `demo`: host mẫu hoặc DEMO bật; số liệu live để null.

Cache 45 giây phía backend, đồng thời các request cùng host dùng chung promise. Trình duyệt cập nhật 45 giây và dừng khi tab ẩn. Ping có timeout, retry tối đa hai lượt, packet tối đa 64 KiB, kiểm tra packet ID/JSON và đối chiếu pong. Latency là ping/pong nếu nhận được, không phải số ngẫu nhiên.

Host chỉ lấy từ cấu hình server/admin, không nhận tham số URL tùy ý. Resolve DNS một lần, kiểm tra địa chỉ và kết nối chính IP đã kiểm tra để tránh DNS rebinding. Hostname gốc vẫn dùng cho handshake virtual-host. Chưa hỗ trợ tự dò SRV hoặc Bedrock RakNet; nhập đúng port Java.

## Nhập leaderboard

Đặt `STATS_INGEST_TOKEN` thật ở backend và plugin. Plugin gửi `Content-Type: application/json` và `Authorization: Bearer <token>`. Không đặt token trong file JavaScript công khai hoặc biến NEXT_PUBLIC.

Payload ví dụ minh họa, không phải dữ liệu người chơi thật:

```json
{
  "entries": [
    {
      "metric": "kills",
      "player": "ExamplePlayer",
      "value": 123,
      "unit": "lượt",
      "source": "Minecraft statistics plugin"
    }
  ]
}
```

Metric: playtime, kills, wins, bedwars, skypvp, purchasers. `value` là số nguyên không âm trong giới hạn Int; nguồn và unit do integration gửi. Tối đa 500 mục mỗi batch. Upsert theo `(metric, player)`; xóa bản DEMO của những metric được nhập, giữ các mục thật khác. Một batch không tự xóa người chơi thật bị thiếu; quản trị viên xử lý dữ liệu cũ theo chính sách của server.

`purchasers` chỉ nên xuất bản dữ liệu được phép công khai; website không tự đọc lịch sử thanh toán của Tebex. Không có endpoint công khai để người chơi tự sửa thành tích.

## Discord và Vote

Discord widget truy vấn cố định `https://discord.com/api/guilds/{id}/widget.json` với Guild ID dạng số; timeout 4 giây, cache fetch 60 giây. Khi không hợp lệ/không bật widget, trả `online:null`.

Vote hiện là danh sách link và nội dung hướng dẫn được quản trị. Không có webhook Votifier hoặc cấp thưởng tự động. Thêm integration và kiểm tra chữ ký/cơ chế xác thực của nhà cung cấp trước khi bật phần thưởng thật.
