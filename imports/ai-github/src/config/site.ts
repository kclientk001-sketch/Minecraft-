import type { SiteConfig } from "@/types";
// The single source for installation defaults. Admin overrides live in SiteSetting.
export const defaults: SiteConfig = {
  SERVER_NAME: "Ryuuworl",
  SERVER_IP: "ryuuworl.id.vn",
  SERVER_PORT: 25565,
  SERVER_VERSION: "Đang cập nhật",
  DISCORD_INVITE: "https://discord.gg/example",
  DISCORD_GUILD_ID: "",
  STORE_URL: "/store",
  LANGUAGE: "vi",
  THEME: "dark",
  DEMO_MODE: false,
  TAGLINE: "Thế giới của bạn. Luật chơi của bạn.",
  DESCRIPTION:
    "Từ những trận BedWars nghẹt thở đến hành trình Survival bất tận. Tìm đồng đội, chinh phục thử thách và viết nên câu chuyện của riêng bạn.",
  VOTE_REWARDS:
    "Nội dung phần thưởng mẫu: 1 Vote Key mỗi lượt vote hợp lệ. Chỉ áp dụng sau khi quản trị viên kết nối plugin vote và công bố thể lệ chính thức.",
};
export const navigation = [
  ["/", "Trang chủ"],
  ["/news", "Tin tức"],
  ["/leaderboards", "Xếp hạng"],
  ["/vote", "Bình chọn"],
  ["/store", "Cửa hàng"],
  ["/rules", "Quy định"],
  ["/support", "Discord"],
] as const;
export const metrics = {
  playtime: "Thời gian chơi",
  kills: "Hạ gục",
  wins: "Chiến thắng",
  bedwars: "BedWars",
  skypvp: "SkyPvP",
  purchasers: "Ủng hộ",
} as const;
export type Metric = keyof typeof metrics;
