# Đưa bản tĩnh lên iNET cho ryuuworl.id.vn

Thông tin này dựa trên ảnh màn hình OneSite bạn cung cấp: mục Git URL nhận repository công khai và chỉ tải tệp có sẵn, không chạy lệnh build. Vì vậy bản iNET đã được export thành HTML/CSS/JS trước khi bàn giao.

## Cách nhanh: ZIP

1. Dùng file `Minecraft-Network-iNET.zip` được bàn giao. `index.html` phải nằm ngay gốc ZIP, không lồng thêm thư mục `inet-site`.
2. Trong cửa sổ **Tải lên phiên bản**, chọn domain đúng **ryuuworl.id.vn** như ảnh. Chỉ chọn thêm `www` khi bạn muốn phục vụ cả hai tên.
3. Chuyển sang **Tải tệp ZIP / HTML**, chọn ZIP này. Không dùng `Minecraft-Network-source.zip` ở bước này.
4. Xem trước nếu portal cung cấp. Chọn kênh Production chỉ khi bạn sẵn sàng công khai.
5. Sau khi iNET xác nhận xuất bản thành công, kiểm tra trang chủ, `/news/`, `/store/`, `/rules/`, `/support/` và HTTPS.
6. Nếu domain chưa được xác minh/trỏ đúng, dùng chính bản ghi DNS mà iNET cung cấp trong tài khoản của bạn. Dự án không tự thay DNS và không đưa IP DNS phỏng đoán.

Không đổi cấu trúc `_next/`, `images/`, `icons/` hoặc các thư mục trang. Chúng chứa bundle và tài nguyên của bản đã build.

## Dùng Git URL

Repository bàn giao là `kclientk001-sketch/ai`. Mã nguồn Next.js ở nhánh `main`; bản iNET chỉ gồm tệp đã build ở nhánh `inet`. Nhập URL nhánh này vào mục Git URL:

```text
https://github.com/kclientk001-sketch/ai/tree/inet
```

Portal trong ảnh chỉ nhận repository công khai. Nếu sau này đổi repository sang private, dùng ZIP để tải bản tĩnh lên. Nhập URL không tự kết nối database hoặc triển khai backend Node.

Muốn tự tạo nhánh từ nội dung export trong một repo đã có remote:

```bash
npm run build:inet
git subtree split --prefix=inet-site -b inet
```

Lệnh subtree chỉ phù hợp nếu `inet-site/` đã được commit. Trong bản bàn giao Git bundle, nhánh `inet` đã được chuẩn bị riêng, không cần commit build vào main. Kiểm tra `git branch -a` trước khi tạo nhánh trùng tên.

## Kết nối backend sau này

Bản tĩnh chưa cấu hình backend sẽ:

- Hiển thị trạng thái server DEMO, không có số online giả.
- Tắt nút gửi ticket và thông báo rõ chưa kết nối.
- Dẫn `/admin/` đến trang giải thích kết nối dashboard, không tạo đăng nhập giả.
- Giữ hoạt động tìm kiếm, bộ lọc, phân trang, copy IP và giỏ xem thử.

Khi backend Node đã hoạt động ở URL thật, chỉnh `inet-config.js` trong bản export:

```js
window.MC_NETWORK = {
  staticMode: true,
  apiBase: "https://BACKEND-DOMAIN-CUA-BAN",
  adminUrl: "https://BACKEND-DOMAIN-CUA-BAN/admin",
};
```

Thay hai placeholder bằng domain HTTPS đã triển khai và kiểm tra. Không thêm dấu `/` cuối `apiBase`. Đây là cấu hình công khai: không đặt token, mật khẩu hoặc database URL vào file.

Ở backend, đặt:

```dotenv
APP_URL="https://BACKEND-DOMAIN-CUA-BAN"
STATIC_SITE_ORIGIN="https://ryuuworl.id.vn"
```

Backend chỉ bật CORS cho origin chính xác này trên server status, Discord và hỗ trợ. Admin/auth không dùng CORS từ frontend tĩnh. Mở dashboard ở origin backend để đăng nhập an toàn.

Sau khi chỉnh nội dung trong admin, chạy lại `npm run build:inet` ở môi trường truy cập database đó, rồi tải lại ZIP/nhánh tĩnh. Trang News, Store và Leaderboards trong bản tĩnh là snapshot, không tự đồng bộ mọi thay đổi từ database.

## Giới hạn

iNET tĩnh không chạy Prisma, session, API Route Handlers hoặc TCP ping. Muốn toàn bộ chức năng trên một origin, trỏ domain đến hosting Node/Railway theo DEPLOYMENT.md. Một tên miền không thể đồng thời trỏ apex đến hai hosting khác nhau; có thể dùng subdomain backend riêng nếu bạn chọn kiến trúc tĩnh + Node.

Chưa đăng nhập portal, thay DNS hay xuất bản domain thay bạn.
