import Link from "next/link";
import {
  LayoutDashboard,
  Newspaper,
  Gamepad2,
  ShoppingBag,
  ScrollText,
  Link2,
  Settings,
  Trophy,
  LifeBuoy,
  ArrowUpRight,
} from "lucide-react";
import { LogoutButton } from "@/components/features/logout-button";
const sections = [
  ["", "Tổng quan", LayoutDashboard],
  ["news", "Tin tức", Newspaper],
  ["modes", "Chế độ chơi", Gamepad2],
  ["products", "Cửa hàng", ShoppingBag],
  ["rules", "Quy định", ScrollText],
  ["links", "Liên kết", Link2],
  ["rankings", "Thống kê", Trophy],
  ["tickets", "Yêu cầu hỗ trợ", LifeBuoy],
  ["settings", "Cấu hình website", Settings],
] as const;
export function AdminShell({
  user,
  active = "",
  children,
}: {
  user: { name: string; role: string };
  active?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container admin-layout">
      <aside className="admin-sidebar card">
        <span className="eyebrow">CONTROL CENTER</span>
        <h2>Quản trị network</h2>
        <p>
          {user.name}
          <span className="badge">{user.role}</span>
        </p>
        <nav aria-label="Quản trị">
          {sections
            .filter(
              ([key]) =>
                user.role === "ADMIN" ||
                !["rankings", "tickets", "settings"].includes(key),
            )
            .map(([key, label, Icon]) => (
              <Link
                key={key}
                href={`/admin${key ? `/${key}` : ""}`}
                aria-current={key === active ? "page" : undefined}
                className={key === active ? "active" : ""}
              >
                <Icon size={17} />
                {label}
              </Link>
            ))}
        </nav>
        <Link className="text-link" href="/">
          Xem website
          <ArrowUpRight size={15} />
        </Link>
        <LogoutButton />
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
