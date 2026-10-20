import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDown,
  ShieldCheck,
  Swords,
  ChevronRight,
  Newspaper,
  Trophy,
  HeartHandshake,
} from "lucide-react";
import { getConfig, getModes, getLinks } from "@/lib/content";
import { db } from "@/lib/db";
import { CopyButton } from "@/components/minecraft/copy-button";
import { ServerStatus } from "@/components/minecraft/server-status";
import { serverAddress } from "@/lib/utils";
import { ExternalButton } from "@/components/features/external-button";
import { SectionHeading } from "@/components/ui/page-heading";
import { Reveal } from "@/components/ui/reveal";
import { ModeCard, NewsCard } from "@/components/features/content-cards";
import { RankingTable } from "@/components/features/ranking-table";
import { DiscordPanel } from "@/components/features/discord-panel";
import { Badge } from "@/components/ui/badge";
export default async function Home() {
  const [config, modes, links, news, playtime, wins] = await Promise.all([
    getConfig(),
    getModes(),
    getLinks(),
    db.news.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    db.leaderboardEntry.findMany({
      where: { metric: "playtime" },
      orderBy: { value: "desc" },
      take: 5,
    }),
    db.leaderboardEntry.findMany({
      where: { metric: "wins" },
      orderBy: { value: "desc" },
      take: 5,
    }),
  ]);
  return (
    <>
      <section className="hero">
        <Image
          src="/images/hero.webp"
          alt="Lâu đài và các đảo khối lơ lửng trên bầu trời — hình minh họa gốc"
          fill
          priority
          sizes="100vw"
          className="hero-background"
        />
        <div className="hero-overlay" />
        <div className="container hero-inner">
          <Reveal className="hero-copy">
            <div className="hero-eyebrow">
              <span className="tiny-square" />
              {config.SERVER_NAME}
              <span className="hero-edition">JAVA EDITION</span>
            </div>
            <h1>
              {config.TAGLINE.split(". ").map((v, i) => (
                <span key={i} className={i === 1 ? "hero-highlight" : ""}>
                  {v}
                  {i === 0 ? "." : ""}
                </span>
              ))}
            </h1>
            <p>{config.DESCRIPTION}</p>
            <div className="hero-buttons">
              <CopyButton
                address={serverAddress(config.SERVER_IP, config.SERVER_PORT)}
              />
              <ExternalButton url={config.DISCORD_INVITE} discord>
                Join Discord
              </ExternalButton>
            </div>
            <div className="hero-details">
              <span>
                <ShieldCheck size={15} />
                Chơi công bằng
              </span>
              <span>
                <Swords size={15} />
                {modes.length} chế độ để khám phá
              </span>
              {config.DEMO_MODE && (
                <Badge className="badge-demo">DEMO · IP MẪU</Badge>
              )}
            </div>
          </Reveal>
          <div className="hero-side-note">
            <span>KHÁM PHÁ KHÔNG GIỚI HẠN</span>
            <span>01 — YOUR NEXT ADVENTURE</span>
          </div>
          <a
            className="hero-scroll"
            href="#discover"
            aria-label="Khám phá các chế độ chơi"
          >
            <ArrowDown size={16} />
            <span>KÉO XUỐNG ĐỂ KHÁM PHÁ</span>
          </a>
        </div>
      </section>
      <div className="container status-container">
        <ServerStatus version={config.SERVER_VERSION} />
      </div>
      <section className="container section" id="discover">
        <Reveal>
          <SectionHeading
            eyebrow="CHỌN THỬ THÁCH CỦA BẠN"
            title="Mọi phong cách. Một network."
            href="/game-modes"
          />
        </Reveal>
        <div className="mode-grid">
          {modes.slice(0, 4).map((mode, i) => (
            <Reveal key={mode.id}>
              <ModeCard mode={mode} index={i} />
            </Reveal>
          ))}
        </div>
        <div className="section-footnote">
          <span>Chế độ và luật chơi có thể tùy chỉnh theo server của bạn.</span>
          <Link href="/rules">
            Đọc quy định
            <ChevronRight size={14} />
          </Link>
        </div>
      </section>
      <section className="section section-shaded">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="CÓ GÌ MỚI TẠI NETWORK?"
              title="Bản tin từ thế giới khối."
              href="/news"
              link="Tất cả tin tức"
            />
          </Reveal>
          <div className="home-news-grid">
            {news[0] && (
              <Reveal>
                <NewsCard news={news[0]} featured />
              </Reveal>
            )}
            <div className="news-side">
              {news.slice(1).map((n) => (
                <Reveal key={n.id}>
                  <NewsCard news={n} />
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="container section">
        <Reveal>
          <SectionHeading
            eyebrow="NHỮNG CÁI TÊN NỔI BẬT"
            title="Để lại dấu ấn của bạn."
            href="/leaderboards"
            link="Bảng xếp hạng"
          />
        </Reveal>
        <p className="notice ranking-notice">
          Bảng xếp hạng mẫu có nhãn DEMO. Thành tích thật chỉ xuất hiện sau khi
          kết nối nguồn thống kê.
        </p>
        <div className="leaderboard-preview">
          <Reveal className="card">
            <div className="card-heading">
              <span className="icon-box">
                <HeartHandshake size={19} />
              </span>
              <h3>Top thời gian chơi</h3>
              <span className="muted small">Tất cả</span>
            </div>
            <RankingTable entries={playtime} compact />
          </Reveal>
          <Reveal className="card">
            <div className="card-heading">
              <span className="icon-box amber">
                <Trophy size={19} />
              </span>
              <h3>Top chiến thắng</h3>
              <span className="muted small">Tất cả</span>
            </div>
            <RankingTable entries={wins} compact />
          </Reveal>
        </div>
      </section>
      <section className="container section community-section">
        <Reveal>
          <DiscordPanel config={config} wide />
        </Reveal>
      </section>
      <section className="container quick-links">
        {[
          [
            "/news",
            "Tin tức & cập nhật",
            "Đừng bỏ lỡ thông báo mới",
            Newspaper,
          ],
          [
            "/rules",
            "Chơi đẹp. Chơi công bằng.",
            "Quy định của cộng đồng",
            ShieldCheck,
          ],
          [
            "/support",
            "Luôn có nơi để sẻ chia",
            "Gửi yêu cầu hỗ trợ",
            HeartHandshake,
          ],
        ].map(([href, title, subtitle, Icon]) => {
          const I = Icon as typeof Newspaper;
          return (
            <Link className="quick-link" href={String(href)} key={String(href)}>
              <I size={25} />
              <div>
                <strong>{String(title)}</strong>
                <small>{String(subtitle)}</small>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          );
        })}
        {links
          .filter((l) => l.kind === "social" || l.kind === "quick")
          .map((l) => (
            <ExternalButton url={l.url} key={l.id}>
              {l.label}
            </ExternalButton>
          ))}
      </section>
    </>
  );
}
