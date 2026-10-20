"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useId,
  type ReactNode,
} from "react";
import Image from "next/image";
import {
  ShoppingBag,
  X,
  Minus,
  Plus,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { money, placeholderUrl } from "@/lib/utils";
type Item = { id: string; qty: number };
type Cart = { items: Item[]; add: (id: string) => void; open: () => void };
const CartContext = createContext<Cart | null>(null);
export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw Error("Cart provider missing");
  return c;
}
export function CartProvider({
  children,
  products,
  storeUrl,
}: {
  children: ReactNode;
  products: Product[];
  storeUrl: string;
}) {
  const [items, setItems] = useState<Item[]>([]),
    [loaded, setLoaded] = useState(false),
    [show, setShow] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("mc-cart-v1") || "[]");
      if (Array.isArray(raw))
        setItems(
          raw
            .filter(
              (x: Item) =>
                x &&
                typeof x.id === "string" &&
                Number.isInteger(x.qty) &&
                x.qty > 0 &&
                x.qty <= 99 &&
                products.some((p) => p.id === x.id),
            )
            .slice(0, 50),
        );
    } catch {}
    setLoaded(true);
  }, [products]);
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem("mc-cart-v1", JSON.stringify(items));
      } catch {}
    }
  }, [items, loaded]);
  useEffect(() => {
    if (show) dialog.current?.showModal();
    else dialog.current?.close();
  }, [show]);
  const change = (id: string, delta: number) =>
    setItems((v) =>
      v
        .map((i) =>
          i.id === id ? { ...i, qty: Math.min(99, i.qty + delta) } : i,
        )
        .filter((i) => i.qty > 0),
    );
  const add = (id: string) => {
    if (!products.some((p) => p.id === id)) return;
    setItems((v) =>
      v.some((i) => i.id === id)
        ? v.map((i) =>
            i.id === id ? { ...i, qty: Math.min(99, i.qty + 1) } : i,
          )
        : [...v, { id, qty: 1 }],
    );
    toast.success("Đã thêm vào giỏ hàng", {
      description: "Giỏ hàng xem thử; chưa kết nối thanh toán.",
    });
  };
  const entries = items.flatMap((i) => {
    const p = products.find((p) => p.id === i.id);
    return p ? [{ ...p, qty: i.qty }] : [];
  });
  const currencies = [...new Set(entries.map((p) => p.currency))];
  const official =
    storeUrl !== "/store" &&
    storeUrl.startsWith("https://") &&
    !placeholderUrl(storeUrl);
  return (
    <CartContext.Provider value={{ items, add, open: () => setShow(true) }}>
      {children}
      <dialog
        ref={dialog}
        onCancel={() => setShow(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShow(false);
        }}
        className="cart-dialog"
        aria-labelledby={titleId}
      >
        <div className="drawer">
          <div className="drawer-heading">
            <h2 id={titleId}>Giỏ hàng</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShow(false)}
              aria-label="Đóng giỏ hàng"
            >
              <X size={22} />
            </Button>
          </div>
          <p className="notice">
            Chế độ xem thử. Không trừ tiền, không cấp vật phẩm.
          </p>
          <div className="cart-items">
            {entries.length === 0 ? (
              <div className="empty-state">
                <ShoppingBag size={40} />
                <p>Giỏ hàng đang trống. Khám phá cửa hàng để chọn vật phẩm.</p>
              </div>
            ) : (
              entries.map((p) => (
                <div className="cart-item" key={p.id}>
                  <Image src={p.image} alt={p.name} width={70} height={55} />
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {p.isDemo ? "DEMO · " : ""}
                      {money(p.price, p.currency)}
                    </small>
                    <div className="qty">
                      <button
                        aria-label={`Giảm ${p.name}`}
                        onClick={() => change(p.id, -1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{p.qty}</span>
                      <button
                        aria-label={`Tăng ${p.name}`}
                        onClick={() => change(p.id, 1)}
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        aria-label={`Xóa ${p.name}`}
                        onClick={() =>
                          setItems((v) => v.filter((i) => i.id !== p.id))
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="cart-total">
            <span>Tạm tính</span>
            <strong>
              {currencies.length > 1
                ? "Nhiều loại tiền"
                : money(
                    entries.reduce((n, p) => n + p.price * p.qty, 0),
                    currencies[0] || "VND",
                  )}
            </strong>
          </div>
          {official ? (
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button button-primary"
            >
              Đến cửa hàng chính thức
              <ArrowUpRight size={16} />
            </a>
          ) : (
            <Button disabled>Chưa kết nối thanh toán</Button>
          )}
          <p className="muted small">
            Cửa hàng bên ngoài quản lý giỏ hàng và giao dịch riêng. Giỏ xem thử
            này không được tự động chuyển.
          </p>
        </div>
      </dialog>
    </CartContext.Provider>
  );
}
export function CartButton() {
  const cart = useCart();
  const count = cart.items.reduce((n, i) => n + i.qty, 0);
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cart.open}
      aria-label={`Giỏ hàng, ${count} sản phẩm`}
      className="cart-button"
    >
      <ShoppingBag size={19} />
      {count > 0 && <span>{count}</span>}
    </Button>
  );
}
export function AddToCart({ id }: { id: string }) {
  const cart = useCart();
  return (
    <Button onClick={() => cart.add(id)}>
      <Plus size={17} />
      Thêm vào giỏ
    </Button>
  );
}
