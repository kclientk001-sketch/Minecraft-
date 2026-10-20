"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ShoppingBag, ArrowUpRight } from "lucide-react";
import type { Product } from "@/types";
import { AddToCart, useCart } from "@/components/features/cart";
import { money } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalButton } from "@/components/features/external-button";
export function StoreCatalog({
  products,
  storeUrl,
}: {
  products: Product[];
  storeUrl: string;
}) {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("Tất cả");
  const cart = useCart();
  const filtered = products.filter(
    (p) =>
      (category === "Tất cả" || category === p.category) &&
      p.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="notice">
        Giỏ hàng xem thử · Chưa kết nối thanh toán hay plugin cấp vật phẩm. Giá
        có nhãn DEMO là giá minh họa.
      </div>
      <div className="filter-toolbar">
        <div className="filter-tabs">
          {["Tất cả", "Ranks", "Cosmetics", "Crates", "Pets", "Boosters"].map(
            (c) => (
              <button
                className={category === c ? "active" : ""}
                key={c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ),
          )}
        </div>
        <Button variant="outline" size="sm" onClick={cart.open}>
          <ShoppingBag size={16} />
          Xem giỏ hàng ({cart.items.reduce((n, i) => n + i.qty, 0)})
        </Button>
      </div>
      <div className="search-form store-search">
        <Search size={16} />
        <label htmlFor="product-search" className="sr-only">
          Tìm sản phẩm
        </label>
        <input
          id="product-search"
          placeholder="Tìm sản phẩm yêu thích..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="product-grid">
        {filtered.map((p) => (
          <article className="card product-card" key={p.id}>
            <Link href={`/store/${p.slug}`} className="product-image">
              <Image
                src={p.image}
                alt={`Minh họa ${p.name}`}
                width={900}
                height={600}
              />
              {p.isDemo && <Badge className="badge-demo">DEMO</Badge>}
            </Link>
            <div className="product-body">
              <span className="eyebrow">{p.category}</span>
              <h2>
                <Link href={`/store/${p.slug}`}>{p.name}</Link>
              </h2>
              <p>{p.description}</p>
              <div className="product-price">
                <strong>{money(p.price, p.currency)}</strong>
                {p.isDemo && <small>giá minh họa</small>}
              </div>
              <div className="product-actions">
                <AddToCart id={p.id} />
                <Link
                  href={`/store/${p.slug}`}
                  aria-label={`Xem ${p.name}`}
                  className="button button-outline button-icon"
                >
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state card">
          Không có sản phẩm phù hợp với bộ lọc.
        </div>
      )}
      {storeUrl !== "/store" && (
        <div className="official-store">
          <ExternalButton url={storeUrl}>Cửa hàng chính thức</ExternalButton>
          <p className="muted small">
            Giao dịch và giỏ hàng được quản lý riêng tại cửa hàng bên ngoài.
          </p>
        </div>
      )}
    </>
  );
}
