"use client";
import { useEffect, useState } from "react";
import { MessageCircle, Users, ArrowUpRight } from "lucide-react";
import type { SiteConfig } from "@/types";
import { ExternalButton } from "@/components/features/external-button";
import Link from "next/link";
export function DiscordPanel({
  config,
  wide = false,
}: {
  config: SiteConfig;
  wide?: boolean;
}) {
  const [online, setOnline] = useState<number | null>(null);
  useEffect(() => {
    if (window.MC_NETWORK?.staticMode && !window.MC_NETWORK.apiBase) return;
    const ac = new AbortController();
    fetch(`${window.MC_NETWORK?.apiBase || ""}/api/discord`, {
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.connected && typeof d.online === "number") setOnline(d.online);
      })
      .catch(() => {});
    return () => ac.abort();
  }, []);
  return (
    <div className={`discord-panel card ${wide ? "discord-wide" : ""}`}>
      <div className="discord-art" aria-hidden="true">
        <MessageCircle />
        <span>✦</span>
        <span>+</span>
      </div>
      <div className="discord-copy">
        <span className="eyebrow">KHÔNG CHỈ LÀ TRÒ CHƠI</span>
        <h2>
          Tìm đồng đội.
          <br />
          Tạo kỷ niệm.
        </h2>
        <p>
          Tìm bạn cùng chơi, chia sẻ khoảnh khắc và theo dõi thông báo mới từ
          cộng đồng.
        </p>
        <div className="discord-presence">
          <span
            className={`presence-dot ${online !== null ? "is-online" : ""}`}
          />
          {online !== null
            ? `${online.toLocaleString("vi-VN")} thành viên đang online`
            : "Discord chưa kết nối API thống kê"}
          <Users size={14} />
        </div>
        <div className="discord-actions">
          <ExternalButton url={config.DISCORD_INVITE} discord>
            Tham gia Discord
          </ExternalButton>
          {wide && (
            <Link className="text-link" href="/support">
              Cần hỗ trợ?
              <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
