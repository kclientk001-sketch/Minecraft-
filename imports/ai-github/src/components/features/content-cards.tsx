import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import type { Mode, NewsItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { date } from "@/lib/utils";
export function ModeCard({ mode, index = 0 }: { mode: Mode; index?: number }) {
  return (
    <Link
      href={`/game-modes/${mode.slug}`}
      className={`mode-card card accent-${mode.accent}`}
    >
      <div className="mode-image">
        <Image
          src={mode.image}
          alt={`Thế giới ${mode.name} — minh họa voxel`}
          width={900}
          height={600}
        />
        <span className="mode-index">0{index + 1}</span>
        <span className="mode-arrow">
          <ArrowUpRight size={21} />
        </span>
      </div>
      <div className="mode-card-body">
        <h3>{mode.name}</h3>
        <p>{mode.description}</p>
        <span className="mode-cta">
          Khám phá chế độ
          <ArrowUpRight size={13} />
        </span>
      </div>
    </Link>
  );
}
export function NewsCard({
  news,
  featured = false,
}: {
  news: NewsItem;
  featured?: boolean;
}) {
  return (
    <article className={`news-card card ${featured ? "news-featured" : ""}`}>
      <Link href={`/news/${news.slug}`} className="news-image">
        <Image src={news.image} alt={news.title} width={900} height={600} />
        <div className="news-badges">
          <Badge>{news.category}</Badge>
          {news.isDemo && <Badge className="badge-demo">DEMO</Badge>}
        </div>
      </Link>
      <div className="news-content">
        <span className="article-date">
          <CalendarDays size={13} />
          {date(news.createdAt)}
          <span>·</span>Network Team
        </span>
        <h3>
          <Link href={`/news/${news.slug}`}>{news.title}</Link>
        </h3>
        <p>{news.excerpt}</p>
        <Link href={`/news/${news.slug}`} className="text-link">
          Đọc bài viết
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </article>
  );
}
