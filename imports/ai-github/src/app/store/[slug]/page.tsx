import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { db } from "@/lib/db";
import { PageHeading } from "@/components/ui/page-heading";
import { Badge } from "@/components/ui/badge";
import { AddToCart } from "@/components/features/cart";
import { money } from "@/lib/utils";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await db.product.findFirst({
    where: { slug: (await params).slug, enabled: true },
  });
  return {
    title: p?.name || "Sản phẩm không tồn tại",
    description: p?.description,
  };
}
export default async function Product({ params }: Props) {
  const p = await db.product.findFirst({
    where: { slug: (await params).slug, enabled: true },
  });
  if (!p) notFound();
  return (
    <>
      <PageHeading
        eyebrow={p.category.toUpperCase()}
        title={p.name}
        description="Khám phá chi tiết vật phẩm và thể hiện phong cách của bạn."
      />
      <div className="container page-content detail-grid">
        <Image
          src={p.image}
          alt={p.name}
          className="detail-image"
          width={900}
          height={600}
          priority
        />
        <section className="card detail-copy">
          {p.isDemo && (
            <Badge className="badge-demo">SẢN PHẨM & GIÁ DEMO</Badge>
          )}
          <h2>{p.name}</h2>
          <div className="prose-text">{p.description}</div>
          <strong className="detail-price">{money(p.price, p.currency)}</strong>
          <AddToCart id={p.id} />
          <p className="notice">
            Chưa kết nối thanh toán. Thêm vào giỏ chỉ lưu lựa chọn trên trình
            duyệt, không tạo giao dịch hoặc cấp vật phẩm.
          </p>
        </section>
      </div>
    </>
  );
}
