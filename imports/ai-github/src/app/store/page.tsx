import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/content";
import { PageHeading } from "@/components/ui/page-heading";
import { StoreCatalog } from "@/components/features/store-catalog";
export const metadata: Metadata = {
  title: "Cửa hàng",
  description:
    "Khám phá rank, vật phẩm trang trí và các cách ủng hộ cộng đồng.",
};
export default async function Store() {
  const [products, config] = await Promise.all([
    db.product.findMany({
      where: { enabled: true },
      orderBy: { price: "asc" },
    }),
    getConfig(),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="SUPPORT THE ADVENTURE"
        title="Phong cách của riêng bạn"
        description="Thêm một chút cá tính vào thế giới khối. Khám phá vật phẩm trang trí và rank của network."
      />
      <div className="container page-content">
        <StoreCatalog products={products} storeUrl={config.STORE_URL} />
      </div>
    </>
  );
}
