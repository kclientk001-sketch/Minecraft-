# Git và repository

Mã nguồn được chuẩn bị cho tài khoản GitHub `kclientk001-sketch`. Hiện công cụ kết nối chưa trả về repository truy cập được và không có thao tác tạo repository mới; chưa có remote repository được xác minh.

Sau khi bạn tạo repository trống, cấp quyền cho kết nối GitHub và gửi URL, có thể đẩy commit đã kiểm tra. Không thay đổi một repository production có sẵn một cách tự động.

Nếu có Git bundle bàn giao, bạn có thể clone hoàn toàn bằng Git mà không cần hosting:

```bash
git clone Minecraft-Network.bundle minecraft-network
cd minecraft-network
git branch -a
```

Nhánh `main` chứa source, nhánh `inet` chứa frontend đã build. Đây là repo cục bộ, không chứng minh code đã có trên GitHub.

Để tự đẩy lên repository trống của bạn:

```bash
git remote add origin https://github.com/kclientk001-sketch/minecraft-network.git
git push -u origin main
git push origin inet
```

URL trên là mẫu đích sau khi repository đã tồn tại. Git sẽ dùng cơ chế đăng nhập của máy bạn. Không chèn PAT vào remote URL hoặc gửi PAT trong chat. Giữ private cho source nếu chưa có ý định công khai; OneSite trong ảnh cần repo công khai nếu dùng Git URL nên ZIP là phương án không cần công khai repo.
