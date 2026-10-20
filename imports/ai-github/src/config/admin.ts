export type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "textarea" | "checkbox" | "select";
  options?: string[];
  value?: string | number | boolean;
  help?: string;
};
const slug: Field = { key: "slug", label: "Slug (chữ thường, số, dấu -)" };
const image: Field = {
  key: "image",
  label: "Hình ảnh",
  type: "select",
  options: [
    "hero.webp",
    "hub.svg",
    "bedwars.svg",
    "skywars.svg",
    "skypvp.svg",
    "practice.svg",
    "the-bridge.svg",
    "survival.svg",
    "duels.svg",
    "rank.svg",
    "cosmetic.svg",
    "crate.svg",
    "pet.svg",
    "booster.svg",
  ].map((s) => `/images/${s}`),
  value: "/images/hub.svg",
  help: "Thêm file trong public/images/ rồi khai báo vào danh sách nếu cần ảnh mới.",
};
const enabled: Field = {
  key: "enabled",
  label: "Đang bật",
  type: "checkbox",
  value: true,
};
const order: Field = {
  key: "order",
  label: "Thứ tự",
  type: "number",
  value: 0,
};
const demo: Field = {
  key: "isDemo",
  label: "Dữ liệu DEMO",
  type: "checkbox",
  value: true,
};
export const editorConfig: Record<
  string,
  { title: string; description: string; fields: Field[] }
> = {
  news: {
    title: "Quản lý tin tức",
    description:
      "Soạn bài, thay ảnh và bật/tắt xuất bản. Nội dung được hiển thị dưới dạng văn bản an toàn, hỗ trợ xuống dòng.",
    fields: [
      slug,
      { key: "title", label: "Tiêu đề" },
      { key: "excerpt", label: "Mô tả ngắn", type: "textarea" },
      { key: "body", label: "Nội dung bài viết", type: "textarea" },
      { key: "category", label: "Danh mục", value: "Thông báo" },
      image,
      { key: "published", label: "Đã xuất bản", type: "checkbox", value: true },
      demo,
    ],
  },
  modes: {
    title: "Quản lý chế độ chơi",
    description: "Bật/tắt chế độ, nội dung giới thiệu và thứ tự xuất hiện.",
    fields: [
      slug,
      { key: "name", label: "Tên chế độ" },
      { key: "description", label: "Mô tả ngắn", type: "textarea" },
      { key: "details", label: "Hướng dẫn chi tiết", type: "textarea" },
      image,
      {
        key: "accent",
        label: "Màu nhấn",
        type: "select",
        options: ["cyan", "violet", "amber", "green", "rose"],
        value: "cyan",
      },
      enabled,
      order,
    ],
  },
  products: {
    title: "Quản lý cửa hàng",
    description:
      "Chỉ quản lý danh mục và giỏ hàng xem thử. Không tạo thanh toán hoặc cấp vật phẩm.",
    fields: [
      slug,
      { key: "name", label: "Tên sản phẩm" },
      { key: "description", label: "Mô tả chi tiết", type: "textarea" },
      {
        key: "category",
        label: "Danh mục",
        type: "select",
        options: ["Ranks", "Cosmetics", "Crates", "Pets", "Boosters"],
        value: "Ranks",
      },
      {
        key: "price",
        label: "Giá (đơn vị tiền tệ được chọn)",
        type: "number",
        value: 0,
      },
      {
        key: "currency",
        label: "Tiền tệ",
        type: "select",
        options: ["VND", "USD", "EUR"],
        value: "VND",
      },
      image,
      enabled,
      demo,
    ],
  },
  rules: {
    title: "Quản lý quy định",
    description:
      "Mỗi mục hiển thị trong sidebar và accordion của trang quy định.",
    fields: [
      slug,
      { key: "title", label: "Tiêu đề" },
      { key: "body", label: "Nội dung", type: "textarea" },
      order,
    ],
  },
  links: {
    title: "Quản lý liên kết",
    description:
      "Dùng URL HTTPS hoặc đường dẫn nội bộ. Link vote chỉ xuất hiện khi được bật.",
    fields: [
      { key: "label", label: "Tên liên kết" },
      { key: "url", label: "URL" },
      {
        key: "kind",
        label: "Nhóm",
        type: "select",
        options: ["vote", "social", "quick"],
        value: "quick",
      },
      enabled,
      order,
    ],
  },
  rankings: {
    title: "Quản lý thống kê",
    description:
      "Chỉ nhập dữ liệu được xác minh từ server. Giữ nhãn DEMO cho mọi số liệu minh họa.",
    fields: [
      {
        key: "metric",
        label: "Bảng xếp hạng",
        type: "select",
        options: [
          "playtime",
          "kills",
          "wins",
          "bedwars",
          "skypvp",
          "purchasers",
        ],
        value: "playtime",
      },
      { key: "player", label: "Tên người chơi" },
      { key: "value", label: "Thành tích", type: "number", value: 0 },
      { key: "unit", label: "Đơn vị", value: "giờ" },
      { key: "source", label: "Nguồn thống kê", value: "Dữ liệu mẫu" },
      demo,
    ],
  },
  tickets: {
    title: "Yêu cầu hỗ trợ",
    description:
      "Ticket lưu trong database; không có email tự động. Đổi trạng thái sau khi xem xét hoặc xóa dữ liệu theo yêu cầu.",
    fields: [
      {
        key: "status",
        label: "Trạng thái",
        type: "select",
        options: ["OPEN", "IN_PROGRESS", "RESOLVED"],
        value: "OPEN",
      },
    ],
  },
  settings: {
    title: "Cấu hình website",
    description:
      "Các giá trị này ghi đè mặc định trong src/config/site.ts và .env. Không chứa secret.",
    fields: [
      { key: "SERVER_NAME", label: "Tên network" },
      {
        key: "SERVER_IP",
        label: "Hostname/IP Minecraft (không có giao thức hoặc port)",
      },
      { key: "SERVER_PORT", label: "Port Minecraft", type: "number" },
      { key: "SERVER_VERSION", label: "Phiên bản hỗ trợ" },
      { key: "DISCORD_INVITE", label: "Link mời Discord" },
      { key: "DISCORD_GUILD_ID", label: "Discord Guild ID (không bắt buộc)" },
      { key: "STORE_URL", label: "Đường dẫn cửa hàng hoặc URL Tebex HTTPS" },
      { key: "LANGUAGE", label: "Ngôn ngữ", type: "select", options: ["vi"] },
      { key: "THEME", label: "Giao diện", type: "select", options: ["dark"] },
      { key: "DEMO_MODE", label: "Chế độ DEMO", type: "checkbox" },
      { key: "TAGLINE", label: "Tiêu đề hero" },
      { key: "DESCRIPTION", label: "Mô tả network", type: "textarea" },
      { key: "VOTE_REWARDS", label: "Thông tin thưởng vote", type: "textarea" },
    ],
  },
};
