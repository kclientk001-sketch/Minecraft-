import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/content";
import { PageHeading } from "@/components/ui/page-heading";
import { CopyButton } from "@/components/minecraft/copy-button";
import { serverAddress } from "@/lib/utils";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = await db.gameMode.findUnique({
    where: { slug: (await params).slug },
  });
  return {
    title: m?.enabled ? m.name : "Chế độ chơi không tồn tại",
    description: m?.enabled ? m.description : undefined,
  };
}
export default async function ModeDetail({ params }: Props) {
  const [m, c] = await Promise.all([
    db.gameMode.findFirst({
      where: { slug: (await params).slug, enabled: true },
    }),
    getConfig(),
  ]);
  if (!m) notFound();
  return (
    <>
      <PageHeading
        eyebrow="YOUR NEXT CHALLENGE"
        title={m.name}
        description={m.description}
      />
      <div className="container page-content detail-grid">
        <Image
          src={m.image}
          alt={`Minh họa ${m.name}`}
          width={900}
          height={600}
          className="detail-image"
          priority
        />
        <section className="card detail-copy">
          <span className="eyebrow">CÁCH CHƠI</span>
          <h2>Sẵn sàng thử thách?</h2>
          <div className="prose-text">{m.details}</div>
          <p className="muted">
            Kết nối Minecraft Java {c.SERVER_VERSION}, sau đó chọn {m.name} tại
            sảnh. Nội dung hiện tại là cấu hình mẫu; tính khả dụng phụ thuộc
            server thật.
          </p>
          <CopyButton address={serverAddress(c.SERVER_IP, c.SERVER_PORT)} />
          <Link href="/rules" className="text-link">
            Đọc quy định trước khi chơi →
          </Link>
        </section>
      </div>
    </>
  );
}
