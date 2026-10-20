import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const modes = [
    [
      "bedwars",
      "BedWars",
      "Bảo vệ giường. Phá vỡ mọi giới hạn.",
      "Thu thập tài nguyên, nâng cấp trang bị và bảo vệ giường của đội. Khi giường bị phá, bạn chỉ còn một cơ hội. Lựa chọn Solo, Doubles hoặc chiến đấu cùng tổ đội.",
      "rose",
    ],
    [
      "skywars",
      "SkyWars",
      "Một hòn đảo. Vô vàn khả năng.",
      "Bắt đầu trên đảo riêng, mở rương và xây cầu đến trung tâm. Tận dụng địa hình, kiểm soát tài nguyên để trở thành người sống sót cuối cùng.",
      "cyan",
    ],
    [
      "skypvp",
      "SkyPvP",
      "Bầu trời là đấu trường của bạn.",
      "Luyện kỹ năng kiểm soát không gian, combo và quản lý trang bị trong một đấu trường trên không. Luôn đọc quy định PvP trước khi tham gia.",
      "violet",
    ],
    [
      "practice",
      "Practice PvP",
      "Từng combo đều tạo nên khác biệt.",
      "Luyện aim, combo và khả năng xử lý tình huống với các bộ kit. Khởi động trước trận đấu hoặc tập luyện cùng một người bạn.",
      "amber",
    ],
    [
      "the-bridge",
      "The Bridge",
      "Xây cầu. Vượt qua. Ghi điểm.",
      "Băng qua cây cầu hẹp để ghi điểm, đồng thời bảo vệ phần sân của mình. Phản xạ và chiến thuật đội là chìa khóa.",
      "cyan",
    ],
    [
      "survival",
      "Survival",
      "Tạo nên thế giới của chính bạn.",
      "Khai phá địa hình, xây nhà, trồng trọt và khám phá cùng bạn bè. Nội dung và cơ chế bảo vệ đất sẽ được quản trị viên cập nhật theo server thật.",
      "green",
    ],
    [
      "duels",
      "Duels",
      "Một đối thủ. Một người chiến thắng.",
      "Thách đấu 1v1 và rèn luyện phong cách riêng của bạn. Nội dung mẫu có thể thay đổi trong trang quản trị.",
      "rose",
    ],
  ];
  for (let i = 0; i < modes.length; i++) {
    const [slug, name, description, details, accent] = modes[i];
    await db.gameMode.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name,
        description,
        details,
        accent,
        image: `/images/${slug}.svg`,
        enabled: true,
        order: i,
      },
    });
  }
  const articles = [
    [
      "hanh-trinh-moi",
      "Một thế giới mới. Một hành trình mới.",
      "Khám phá cách trang web kết nối người chơi với cộng đồng của bạn.",
      "Thông báo",
      "hub",
      "Đây là bài viết DEMO để bạn xem bố cục tin tức.\n\nChào mừng đến với ngôi nhà mới của network. Tại đây, người chơi có thể tìm địa chỉ kết nối, khám phá chế độ chơi và gửi yêu cầu hỗ trợ.\n\nQuản trị viên hãy thay nội dung, hình ảnh và lịch hoạt động bằng thông tin máy chủ thật trước khi phát hành. Bài mẫu này không thông báo một sự kiện đã diễn ra.",
    ],
    [
      "bedwars-teamwork",
      "BedWars: cùng nhau tạo nên chiến thắng",
      "Bốn người chơi, một mục tiêu. Tìm hiểu những vai trò trong đội.",
      "Hướng dẫn",
      "bedwars",
      "Nội dung hướng dẫn mẫu.\n\nMột người kiểm soát tài nguyên, một người bảo vệ giường, những người còn lại tìm cơ hội tấn công. Hãy trao đổi trước khi bắt đầu trận đấu.\n\nBắt đầu bằng việc đọc luật, chọn kit phù hợp và chơi công bằng. Các cơ chế cụ thể phụ thuộc cấu hình server thật.",
    ],
    [
      "pvp-practice",
      "Luyện tập hôm nay. Bứt phá ngày mai.",
      "Một vài thói quen nhỏ để cải thiện kỹ năng PvP.",
      "Cộng đồng",
      "practice",
      "Nội dung cộng đồng mẫu.\n\nDành thời gian khởi động, giữ góc nhìn ổn định và luyện cách chọn thời điểm tấn công. Theo dõi tiến bộ của mình thay vì chỉ đếm số trận thắng.\n\nBạn có thể biên tập hoặc xóa bài viết này trong trang quản trị.",
    ],
  ];
  for (let i = 0; i < articles.length; i++) {
    const [slug, title, excerpt, category, image, body] = articles[i];
    await db.news.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        title,
        excerpt,
        category,
        image: `/images/${image}.svg`,
        body,
        isDemo: true,
        published: true,
        createdAt: new Date(
          `2026-10-${String(18 - i * 3).padStart(2, "0")}T05:00:00Z`,
        ),
      },
    });
  }
  const products = [
    [
      "vip-rank",
      "VIP Rank",
      "Ranks",
      99000,
      "Mô tả sản phẩm DEMO: tiền tố VIP, hiệu ứng vào sảnh và các tiện ích trang trí. Không mang lại lợi thế PvP.",
      "rank",
    ],
    [
      "mvp-rank",
      "MVP Rank",
      "Ranks",
      199000,
      "Mô tả sản phẩm DEMO: bộ danh hiệu MVP và hiệu ứng trang trí mở rộng. Không có giao dịch thực tế trên website này.",
      "rank",
    ],
    [
      "cyan-trail",
      "Cyan Trail",
      "Cosmetics",
      39000,
      "Vệt sáng cyan trang trí nhân vật. Sản phẩm DEMO, chưa kết nối plugin.",
      "cosmetic",
    ],
    [
      "galaxy-crate",
      "Galaxy Crate",
      "Crates",
      49000,
      "Hình minh họa crate. Cần công bố đầy đủ phần thưởng và xác suất trước khi bán thật. Sản phẩm DEMO.",
      "crate",
    ],
    [
      "fox-companion",
      "Fox Companion",
      "Pets",
      79000,
      "Bạn đồng hành hình cáo trong sảnh. Sản phẩm DEMO, chưa kết nối plugin.",
      "pet",
    ],
    [
      "community-boost",
      "Community Boost",
      "Boosters",
      59000,
      "Hiệu ứng cộng đồng mẫu. Chưa có kích hoạt, thanh toán hoặc cấp vật phẩm.",
      "booster",
    ],
  ];
  for (const [slug, name, category, price, description, image] of products) {
    const s = String(slug);
    await db.product.upsert({
      where: { slug: s },
      update: {},
      create: {
        slug: s,
        name: String(name),
        category: String(category),
        price: Number(price),
        description: String(description),
        image: `/images/${image}.svg`,
        isDemo: true,
        enabled: true,
      },
    });
  }
  const rules = [
    [
      "general",
      "Quy định chung",
      "Tôn trọng người chơi và đội ngũ quản trị. Không gian lận, khai thác lỗi, giả mạo danh tính hoặc phá hoại trải nghiệm của người khác.\n\nĐây là nội quy mẫu; quản trị viên cần biên tập trước khi áp dụng.",
    ],
    [
      "chat",
      "Quy định trò chuyện",
      "Không spam, xúc phạm, đe dọa hoặc đăng thông tin cá nhân của người khác. Không quảng cáo và không chia sẻ nội dung không phù hợp. Hãy sử dụng kênh hỗ trợ khi gặp vấn đề.",
    ],
    [
      "pvp",
      "Quy định PvP",
      "Không sử dụng auto-clicker, kill aura, reach, aim assist hoặc cơ chế tự động hóa để tạo lợi thế không công bằng. Không cấu kết trái luật của chế độ chơi.",
    ],
    [
      "clients",
      "Client & Mods",
      "Chỉ sử dụng client và mod được máy chủ cho phép. Mod tối ưu hiệu năng không tự động đồng nghĩa với việc được chấp thuận; hỏi quản trị viên nếu chưa chắc chắn.",
    ],
    [
      "punishments",
      "Xử lý vi phạm & kháng nghị",
      "Hình thức xử lý phụ thuộc mức độ vi phạm và bằng chứng. Gửi kháng nghị qua mục Hỗ trợ, ghi rõ tên tài khoản, thời điểm và nội dung cần xem xét. Không tạo tài khoản mới để né hình phạt.",
    ],
  ];
  for (let i = 0; i < rules.length; i++) {
    const [slug, title, body] = rules[i];
    await db.rule.upsert({
      where: { slug },
      update: {},
      create: { slug, title, body, order: i },
    });
  }
  if ((await db.link.count()) === 0)
    await db.link.createMany({
      data: [
        {
          label: "Minecraft Server List — cần cấu hình",
          url: "https://example.com/vote",
          kind: "vote",
          enabled: false,
          order: 0,
        },
        {
          label: "Báo cáo người chơi",
          url: "/support?type=REPORT",
          kind: "quick",
          enabled: true,
          order: 1,
        },
        {
          label: "Kháng nghị hình phạt",
          url: "/support?type=APPEAL",
          kind: "quick",
          enabled: true,
          order: 2,
        },
      ],
    });
  const players = [
    "RuneFox",
    "CloudKnight",
    "MintCrafter",
    "PixelNova",
    "SkyWarden",
    "AmberLeaf",
    "FrostByte",
    "StoneSage",
    "CyanWolf",
    "EnderBloom",
    "MoonMiner",
    "BlockPilot",
  ];
  for (const metric of [
    "playtime",
    "kills",
    "wins",
    "bedwars",
    "skypvp",
    "purchasers",
  ]) {
    for (let i = 0; i < players.length; i++) {
      await db.leaderboardEntry.upsert({
        where: { metric_player: { metric, player: players[i] } },
        update: {},
        create: {
          metric,
          player: players[i],
          value: metric === "purchasers" ? (12 - i) * 100000 : (12 - i) * 137,
          unit:
            metric === "playtime"
              ? "giờ"
              : metric === "purchasers"
                ? "VND"
                : metric === "kills"
                  ? "lượt"
                  : "trận",
          isDemo: true,
          source: "Dữ liệu minh họa cố định, không phải người chơi thật",
        },
      });
    }
  }
  console.log(
    "Đã khởi tạo nội dung DEMO. Không tạo tài khoản hay mật khẩu mặc định.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
