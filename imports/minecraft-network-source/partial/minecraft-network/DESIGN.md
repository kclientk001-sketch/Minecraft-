# Design system và website tham khảo

## Bằng chứng tham khảo

- Nguồn chính: https://blocksmc.com/
- Thu thập bằng Firecrawl: nội dung trang, branding, screenshot desktop 1920×1080 và mobile 360×800. Ảnh gốc trong `docs/reference/` đã được xem trực tiếp.
- Bản desktop chụp ở viewport cho thấy navbar ngang, hero hai vùng, logo nổi và các vật thể khối, badge online, nút IP vàng, Store xanh và khối News bên dưới.
- Bản mobile cho thấy navbar thu gọn thành hamburger, hero một cột, các CTA xếp dọc và không giữ logo hero lớn ở bên phải.
- Nội dung trích xuất xác nhận News, Top Purchasers, Top Join theo kỳ, Discord, Quick Links và Footer. Không suy ra toàn bộ bố cục cuối trang từ một screenshot viewport.
- Chưa kiểm tra trực tiếp tất cả hover/animation của website gốc. Các hiệu ứng của bản dựng là lựa chọn riêng, không khẳng định sao chép chính xác.

## Token quan sát và token triển khai

| Vai trò           | Nguồn tham khảo                         | Bản dựng riêng                                                             |
| ----------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| Nền               | Branding trả `#14181D`                  | `#0b1019`                                                                  |
| Primary           | `#008FD5`                               | Cyan `#36d8f1`                                                             |
| CTA               | `#F3BC00`                               | Amber `#ffc857`                                                            |
| Text              | `#FFFFFF`                               | `#edf3fb`                                                                  |
| Body/heading font | Cairo theo branding                     | Font hệ thống Arial/Helvetica, hỗ trợ tiếng Việt, không tải font bên ngoài |
| Border radius     | Branding: card 12px, primary button 8px | Card 12px, button 7px                                                      |
| Spacing           | Branding gợi ý đơn vị 4px               | Ưu tiên 4/8px, section 46–76px tùy viewport                                |

Token branding là dữ liệu trích xuất, không phải kiểm tra từng selector CSS gốc. Kích thước section/card trong bản dựng là quyết định triển khai, không tuyên bố là số đo chính xác từ BlocksMC.

## Hướng thiết kế

Giữ nhịp trải nghiệm: navbar → hero/IP → trạng thái → game modes → news → xếp hạng → Discord → quick links → footer. Dùng một thế giới đảo khối và lâu đài riêng làm nền hero, overlay navy để đọc rõ chữ. Không dùng logo hoặc asset BlocksMC trong website.

Container desktop 1280px, mở 1370px ở màn lớn; padding co theo viewport. Hero type lớn, cyan cho nửa sau tiêu đề, nút vàng cho hành động copy IP. Card mode có artwork isometric riêng và hover nhẹ. Xếp hạng có avatar pixel cục bộ, top 3 khác biệt vừa phải. Dữ liệu mẫu có nhãn DEMO ở vị trí đọc được.

Navbar chuyển hamburger dưới 1080px. Grid mode 4→2→1 cột, news/store 3→2→1 cột. Sidebar rules/admin trở thành phần đầu trang khi màn hẹp. Cart dùng native dialog để có focus containment và Escape. Focus ring cyan; toast có thông báo dễ nhận biết.

Motion giữ nội dung SSR luôn nhìn thấy. Scroll reveal chỉ biến đổi nhẹ; reduced motion bỏ chuyển động, không dùng trạng thái opacity 0 kéo dài. CSS global tắt transition/animation khi người dùng chọn reduced motion.

## Tài nguyên

Logo và avatar là SVG tự tạo. Mode/store art là isometric SVG gốc. Hero là ảnh tạo mới cho dự án và nén WebP. Xem `docs/ASSETS.md`. Các screenshot BlocksMC chỉ phục vụ đối chiếu trong tài liệu, không được nhúng làm asset thương hiệu của site.

## QA thị giác

Xem `docs/screenshots/` và `docs/QA.md` để biết viewport đã kiểm tra, lỗi đã sửa và giới hạn. Không cam kết pixel-perfect hoặc chất lượng Core Web Vitals khi chưa đo ở hosting/domain thật.
