# Tài nguyên và nguồn gốc

- `public/icons/logo.svg`, `public/images/logo.svg`, `src/app/icon.svg`: biểu tượng khối isometric màu cyan được tạo riêng bằng SVG.
- `public/images/avatar-*.svg`: avatar pixel minh họa cục bộ, không tải skin/danh tính thật của người chơi.
- `public/images/{bedwars,skywars,skypvp,practice,the-bridge,survival,duels,hub}.svg`: minh họa isometric được viết riêng bằng các hình SVG.
- `rank.svg`, `cosmetic.svg`, `crate.svg`, `pet.svg`, `booster.svg`: minh họa sản phẩm mẫu, không phải tài nguyên cửa hàng BlocksMC.
- `public/images/hero.webp`: ảnh được tạo mới bằng công cụ ImageGen tích hợp, sau đó chỉ chuyển định dạng/nén WebP để phục vụ website. Không lấy ảnh từ BlocksMC.
- Lucide, Radix, shadcn-style primitives và các dependency giữ giấy phép riêng trong package tương ứng.
- `docs/reference/blocksmc-*.png`: screenshot website tham khảo để đối chiếu, không phải artwork sở hữu của dự án hoặc asset đang phục vụ giao diện.

Prompt tạo hero (built-in tool, không dùng CLI/API key):

> Use case: stylized-concept. Asset type: widescreen website hero background, original art for a Minecraft PvP server network. Primary request: cinematic richly detailed voxel floating islands world at blue twilight, epic fantasy citadel on a large floating block island on the RIGHT half, lush squared pine trees, waterfalls spilling into mist, tiny blue glowing crystals, one warm golden sunset light ray, floating little stepping stone islands. Style: premium Minecraft-inspired voxel game environment render, every surface made of textured cubes, high end gaming key art, physically lit. Composition: 16:9 landscape, wide perspective, keep the LEFT half dark blue sky and subtle mist to place readable website copy. Palette: deep navy, teal, cyan, emerald trees, warm amber accents. No text, no letters, no UI, no logo, no watermark. An original fictional environment, do not reproduce BlocksMC artwork.

Ảnh nguồn chỉ làm asset minh họa, không được trình bày như screenshot từ một Minecraft server thật đang hoạt động.
