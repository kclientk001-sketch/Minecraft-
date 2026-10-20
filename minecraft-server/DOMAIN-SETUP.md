# Tên miền Minecraft Java Ryuuworl

Chủ tên miền đã lưu bản ghi SRV trong iNET ngày 19/10/2026. Google DNS và Cloudflare đều trả đúng bản ghi; đích `traded-disk.tun.ply.gg:9719` phản hồi status và yêu cầu xác thực Java ở giao thức 767 và 777. Trong Minecraft Java, nhập **`ryuuworl.id.vn`**, không kèm cổng. Chưa thử đăng nhập/chơi bằng client Minecraft thực tế. Kết quả tại `../release/ryuuworl-minecraft-domain-verification.json`.

Để xem hoặc khôi phục cấu hình, trong https://portal.inet.vn, vào Tên miền → Danh sách → ryuuworl.id.vn → Bản ghi. Nếu hệ thống chuyển sang trang bản ghi OneShield, dùng trang được chuyển tới. Bản ghi đã lưu:

| Trường | Giá trị |
| --- | --- |
| Tên bản ghi | `_minecraft._tcp` |
| Loại | SRV |
| Ưu tiên | 0 |
| Giá trị bản ghi | `5 9719 traded-disk.tun.ply.gg.` |
| TTL | 5 phút (300 giây) |

Nếu giao diện tách trường, Trọng số = 5, Cổng = 9719, Target = traded-disk.tun.ply.gg. Tên đầy đủ của bản ghi phải là `_minecraft._tcp.ryuuworl.id.vn`. Đây là bản ghi bổ sung cho Minecraft Java; giữ các bản ghi website đang có.

Sau khi lưu, kiểm tra:

```sh
cd /data/data/com.termux/files/home/ryuuworl
python scripts/check-minecraft-domain.py
python scripts/check-minecraft-domain.py --resolver 1.1.1.1
```

Công cụ chỉ tra cứu SRV và kiểm tra Minecraft tới target đã định, không sửa DNS. Chỉ khi bản ghi xuất hiện và target phản hồi mới xác nhận tuyến SRV hoạt động. Cần thử tên miền trong client Minecraft Java để hoàn tất kiểm tra thực tế.

Client Java hỗ trợ SRV sẽ tìm dịch vụ `_minecraft._tcp` khi nhập `ryuuworl.id.vn` với cổng mặc định; SRV chỉ tới hostname/cổng Playit đã được cấp. Không nhập `ryuuworl.id.vn:9719` để kiểm tra tuyến SRV mặc định. Tính năng Add External Domain do Playit quản lý là luồng riêng có Premium; chưa mua gói hoặc chuyển nameserver trong bước này.

Bản ghi này không cấu hình Bedrock/PE.

Theo skill OneShield Pages, quản lý DNS/custom domain cần người đã đăng nhập cổng quản trị; token triển khai Pages không dùng để lưu bản ghi DNS.

Nguồn: [iNET: Quản lý DNS](https://developers.inet.vn/docs/oneportal/quan-ly-ban-ghi-dns), [iNET: định dạng SRV](https://helpdesk.inet.vn/knowledgebase/ban-ghi-srv-la-gi-huong-dan-tro-ban-ghi-srv), [client Java hỗ trợ tra cứu SRV](https://github.com/PrismarineJS/node-minecraft-protocol/blob/master/src/client/tcp_dns.js).
