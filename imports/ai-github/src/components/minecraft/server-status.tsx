"use client";
import { useEffect, useState } from "react";
import { Activity, Users, Clock, Signal, Server } from "lucide-react";
import type { Status } from "@/types";
export function ServerStatus({ version }: { version: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let abort: AbortController | undefined;
    async function update() {
      if (document.hidden) return;
      abort?.abort();
      abort = new AbortController();
      try {
        const res = await fetch(
          `${window.MC_NETWORK?.apiBase || ""}/api/server-status`,
          { signal: abort.signal },
        );
        if (!res.ok) throw Error();
        const data = (await res.json()) as Status;
        if (active) {
          setStatus(data);
          setFailed(false);
        }
      } catch (e) {
        if (active && !(e instanceof Error && e.name === "AbortError")) {
          setStatus(null);
          setFailed(true);
        }
      }
    }
    if (window.MC_NETWORK?.staticMode && !window.MC_NETWORK.apiBase) {
      setStatus({
        state: "demo",
        demo: true,
        online: null,
        players: null,
        maxPlayers: null,
        version: null,
        motd: "Bản tĩnh iNET chưa kết nối backend trạng thái.",
        latency: null,
        updatedAt: new Date().toISOString(),
      });
      return;
    }
    void update();
    const interval = setInterval(update, 45000);
    const visibility = () => {
      if (!document.hidden) void update();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      active = false;
      abort?.abort();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  const state = failed ? "error" : status?.state;
  const label =
    state === "online"
      ? "Máy chủ đang online"
      : state === "offline"
        ? "Máy chủ offline"
        : state === "demo"
          ? "DEMO · Chưa cấu hình server"
          : state === "error"
            ? "Offline · Chưa xác minh được"
            : "Đang kiểm tra trạng thái";
  return (
    <section
      className="status-bar card"
      aria-label="Trạng thái Minecraft"
      aria-live="polite"
    >
      <div className="status-cell status-primary">
        <span
          className={`status-icon ${state === "online" ? "is-online" : ""}`}
        >
          <Activity size={22} />
        </span>
        <div>
          <small>TRẠNG THÁI MÁY CHỦ</small>
          <strong className={status === null && !failed ? "skeleton" : ""}>
            {label}
          </strong>
        </div>
      </div>
      <div className="status-cell">
        <Users size={18} />
        <div>
          <small>NGƯỜI CHƠI</small>
          <strong>
            {status?.players !== null && status?.players !== undefined
              ? `${status.players} / ${status.maxPlayers}`
              : "— / —"}
          </strong>
        </div>
      </div>
      <div className="status-cell">
        <Server size={18} />
        <div>
          <small>PHIÊN BẢN JAVA</small>
          <strong>{status?.version || version}</strong>
        </div>
      </div>
      <div className="status-cell">
        <Signal size={18} />
        <div>
          <small>ĐỘ TRỄ</small>
          <strong>
            {status?.latency != null ? `${status.latency} ms` : "— ms"}
          </strong>
        </div>
      </div>
      <div className="status-note">
        <Clock size={12} />
        {status
          ? `Cập nhật ${new Date(status.updatedAt).toLocaleTimeString("vi-VN")}`
          : "Tự cập nhật mỗi 45 giây"}
        {status?.motd && <span>{status.motd}</span>}
        {status?.error && <span role="status">{status.error}</span>}
        {failed && (
          <span>Không kết nối được API trạng thái. Sẽ thử lại tự động.</span>
        )}
      </div>
    </section>
  );
}
