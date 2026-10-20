import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { pagination } from "@/lib/content";
import { PageHeading, EmptyState } from "@/components/ui/page-heading";
import { Pagination } from "@/components/ui/pagination";
import { NewsCard } from "@/components/features/content-cards";
export const metadata: Metadata = {
  title: "Tin tức",
  description: "Thông báo, hướng dẫn và câu chuyện từ cộng đồng Minecraft.",
};
export default async function News({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  const search = (q.q || "").slice(0, 100),
    category = (q.category || "").slice(0, 50);
  const p = pagination(q.page);
  const where = {
    published: true,
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { excerpt: { contains: search } },
          ],
        }
      : {}),
    ...(category ? { category } : {}),
  };
  const [news, total, categories] = await Promise.all([
    db.news.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: p.skip,
      take: p.take,
    }),
    db.news.count({ where }),
    db.news.findMany({
      where: { published: true },
      distinct: ["category"],
      select: { category: true },
    }),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="NETWORK JOURNAL"
        title="Tin tức & cập nhật"
        description="Những câu chuyện mới nhất, hướng dẫn và thông báo từ cộng đồng."
      />
      <div className="container page-content">
        <div className="filter-toolbar">
          <div className="filter-tabs">
            <Link
              className={!category ? "active" : ""}
              href={`/news?${new URLSearchParams({ q: search })}`}
            >
              Tất cả
            </Link>
            {categories.map((c) => (
              <Link
                key={c.category}
                className={category === c.category ? "active" : ""}
                href={`/news?${new URLSearchParams({ q: search, category: c.category })}`}
              >
                {c.category}
              </Link>
            ))}
          </div>
          <form className="search-form" action="/news">
            <label className="sr-only" htmlFor="news-search">
              Tìm tin tức
            </label>
            <Search size={16} />
            <input
              id="news-search"
              name="q"
              placeholder="Tìm kiếm bài viết..."
              defaultValue={search}
            />
            <input type="hidden" name="category" value={category} />
            <button type="submit" aria-label="Tìm kiếm">
              <Search size={17} />
            </button>
          </form>
        </div>
        {news.length ? (
          <div className="news-grid">
            {news.map((n) => (
              <NewsCard key={n.id} news={n} />
            ))}
          </div>
        ) : (
          <EmptyState>
            Không tìm thấy bài viết. Hãy thử từ khóa hoặc danh mục khác.
          </EmptyState>
        )}
        <Pagination
          page={p.page}
          total={total}
          path="/news"
          query={{ q: search, category }}
        />
      </div>
    </>
  );
}
