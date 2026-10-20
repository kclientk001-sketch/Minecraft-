import type { Metadata } from "next";
import { getConfig } from "@/lib/content";
import { db } from "@/lib/db";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Providers } from "@/components/providers";
import "./globals.css";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const c = await getConfig();
  return {
    metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
    title: {
      default: `${c.SERVER_NAME} · Minecraft Network`,
      template: `%s | ${c.SERVER_NAME}`,
    },
    description: c.DESCRIPTION,
    openGraph: {
      type: "website",
      locale: "vi_VN",
      siteName: c.SERVER_NAME,
      title: c.SERVER_NAME,
      description: c.DESCRIPTION,
      images: [
        {
          url: "/images/hero.webp",
          width: 1672,
          height: 941,
          alt: "Thế giới đảo nổi voxel — hình minh họa riêng",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: c.SERVER_NAME,
      description: c.DESCRIPTION,
      images: ["/images/hero.webp"],
    },
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [config, products] = await Promise.all([
    getConfig(),
    db.product.findMany({ where: { enabled: true } }),
  ]);
  return (
    <html lang="vi">
      <body>
        <a className="skip-link" href="#main">
          Bỏ qua điều hướng
        </a>
        <Providers products={products} storeUrl={config.STORE_URL}>
          <Navbar config={config} />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <Footer config={config} />
        </Providers>
      </body>
    </html>
  );
}
