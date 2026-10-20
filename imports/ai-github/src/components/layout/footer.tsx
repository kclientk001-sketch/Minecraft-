import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Shield, Gamepad2 } from "lucide-react";
import type { SiteConfig } from "@/types";
import { serverAddress } from "@/lib/utils";
export function Footer({ config }: { config: SiteConfig }) {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link className="brand" href="/">
            <Image src="/icons/logo.svg" alt="" width={42} height={42} />
            <span>{config.SERVER_NAME}</span>
          </Link>
          <p>
            Một thế giới khối. Vô vàn câu chuyện.
            <br />
            Câu chuyện tiếp theo là của bạn.
          </p>
          <code>{serverAddress(config.SERVER_IP, config.SERVER_PORT)}</code>
          {config.DEMO_MODE && (
            <small className="muted">IP mẫu · chưa phải máy chủ thật</small>
          )}
        </div>
        <div>
          <h3>Khám phá</h3>
          <Link href="/game-modes">Chế độ chơi</Link>
          <Link href="/news">Tin tức mới</Link>
          <Link href="/leaderboards">Bảng xếp hạng</Link>
          <Link href="/store">Cửa hàng</Link>
        </div>
        <div>
          <h3>Cộng đồng</h3>
          <Link href="/support">
            Discord & hỗ trợ
            <ArrowUpRight size={12} />
          </Link>
          <Link href="/vote">Bình chọn server</Link>
          <Link href="/support?type=REPORT">Báo cáo người chơi</Link>
          <Link href="/support?type=APPEAL">Kháng nghị</Link>
        </div>
        <div>
          <h3>Thông tin</h3>
          <Link href="/rules">Quy định</Link>
          <Link href="/privacy">Quyền riêng tư</Link>
          <Link href="/admin">
            <Shield size={13} />
            Quản trị
          </Link>
          <span className="footer-java">
            <Gamepad2 size={15} />
            JAVA EDITION
          </span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} {config.SERVER_NAME}.
        </span>
        <span>Không liên kết với Mojang hoặc Microsoft.</span>
        <span>
          Được tạo cho những người yêu Minecraft
          <span className="text-accent"> ✦</span>
        </span>
      </div>
    </footer>
  );
}
