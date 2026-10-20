import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { date } from "@/lib/utils";
type Props = { params: Promise<{ slug: string }> };
async function article(slug: string) {
  return db.news.findFirst({ where: { slug, published: true } });
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const n = await article((await params).slug);
  return {
    title: n?.title || "Bài viết không tồn tại",
    description: n?.excerpt,
    openGraph: {
      title: n?.title,
      description: n?.excerpt,
      images: n ? [{ url: n.image }] : [],
    },
  };
}
export default async function Article({ params }: Props) {
  const n = await article((await params).slug);
  if (!n) notFound();
  return (
    <article className="container article-page">
      <Link href="/news" className="text-link">
        <ArrowLeft size={16} />
        Tất cả tin tức
      </Link>
      <div className="article-meta">
        <Badge>{n.category}</Badge>
        {n.isDemo && <Badge className="badge-demo">NỘI DUNG DEMO</Badge>}
        <span>{date(n.createdAt)}</span>
      </div>
      <h1>{n.title}</h1>
      <p className="article-intro">{n.excerpt}</p>
      <Image
        className="article-cover"
        src={n.image}
        alt={n.title}
        width={1200}
        height={600}
        priority
      />
      <div className="prose-text article-body">{n.body}</div>
      <div className="article-end">
        <strong>Chia sẻ câu chuyện của bạn cùng cộng đồng.</strong>
        <Link href="/support" className="button button-secondary">
          Discord & hỗ trợ
        </Link>
      </div>
    </article>
  );
}
