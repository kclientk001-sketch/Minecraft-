import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Newspaper,
  Gamepad2,
  ShoppingBag,
  LifeBuoy,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/content";
import { AdminShell } from "@/components/features/admin-shell";
import { ServerStatus } from "@/components/minecraft/server-status";
export default async function Admin() {
  const u = await currentUser();
  if (!u) redirect("/admin/login");
  const [news, modes, products, tickets, c] = await Promise.all([
    db.news.count(),
    db.gameMode.count({ where: { enabled: true } }),
    db.product.count({ where: { enabled: true } }),
    u.role === "ADMIN"
      ? db.supportTicket.count({ where: { status: "OPEN" } })
      : Promise.resolve(null),
    getConfig(),
  ]);
  const stats = [
    ["news", "Bài viết", news, Newspaper],
    ["modes", "Chế độ đang bật", modes, Gamepad2],
    ["products", "Sản phẩm đang bật", products, ShoppingBag],
    ...(tickets !== null
      ? [["tickets", "Ticket đang mở", tickets, LifeBuoy]]
      : []),
  ];
  return (
    <AdminShell user={u}>
      <span className="eyebrow">WELCOME BACK</span>
      <h1>Tổng quan network</h1>
      <p className="muted">
        Nội dung và cấu hình được đọc trực tiếp từ cơ sở dữ liệu của website.
      </p>
      <div className="admin-stats">
        {stats.map(([key, label, value, Icon]) => {
          const I = Icon as typeof Newspaper;
          return (
            <Link
              className="card admin-stat"
              href={`/admin/${key}`}
              key={String(key)}
            >
              <I size={22} />
              <strong>{String(value)}</strong>
              <span>{String(label)}</span>
              <ArrowUpRight size={16} />
            </Link>
          );
        })}
      </div>
      <ServerStatus version={c.SERVER_VERSION} />
      <section className="card admin-welcome">
        <ShieldCheck size={32} />
        <h2>Trước khi đón người chơi đầu tiên</h2>
        <p>
          Thay IP, tên network, link Discord và nội dung mẫu trong các mục quản
          trị. Chỉ tắt DEMO khi đã cấu hình server thật. Hệ thống thống kê và
          cổng thanh toán cần tích hợp riêng.
        </p>
        <Link
          className="button button-secondary"
          href={u.role === "ADMIN" ? "/admin/settings" : "/admin/news"}
        >
          {u.role === "ADMIN" ? "Mở cấu hình website" : "Quản lý bài viết"}
          <ArrowUpRight size={16} />
        </Link>
      </section>
    </AdminShell>
  );
}
