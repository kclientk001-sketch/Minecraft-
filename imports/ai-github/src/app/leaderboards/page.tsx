import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Clock } from "lucide-react";
import { db } from "@/lib/db";
import { metrics, type Metric } from "@/config/site";
import { pagination } from "@/lib/content";
import { PageHeading, EmptyState } from "@/components/ui/page-heading";
import { RankingTable, Avatar } from "@/components/features/ranking-table";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { date } from "@/lib/utils";
export const metadata: Metadata = {
  title: "Bảng xếp hạng",
  description:
    "Theo dõi thời gian chơi, chiến thắng, BedWars, SkyPvP và thành tích cộng đồng.",
};
export default async function Leaderboards({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  const metric: Metric = Object.hasOwn(metrics, q.metric || "")
    ? (q.metric as Metric)
    : "playtime";
  const p = pagination(q.page, 10);
  const real = await db.leaderboardEntry.count({
    where: { metric, isDemo: false },
  });
  const where = { metric, isDemo: real === 0 };
  const [entries, total, top] = await Promise.all([
    db.leaderboardEntry.findMany({
      where,
      orderBy: [{ value: "desc" }, { player: "asc" }],
      skip: p.skip,
      take: 10,
    }),
    db.leaderboardEntry.count({ where }),
    db.leaderboardEntry.findMany({
      where,
      orderBy: [{ value: "desc" }, { player: "asc" }],
      take: 3,
    }),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="HALL OF FAME"
        title="Bảng xếp hạng"
        description="Mỗi trận đấu đều là một cơ hội để viết tên mình lên bảng vàng."
      />
      <div className="container page-content">
        <div className="filter-tabs leaderboard-tabs">
          {Object.entries(metrics).map(([key, label]) => (
            <Link
              href={`/leaderboards?metric=${key}`}
              className={key === metric ? "active" : ""}
              key={key}
            >
              {key === "playtime" ? <Clock size={15} /> : <Trophy size={15} />}{" "}
              {label}
            </Link>
          ))}
        </div>
        {real === 0 && (
          <p className="notice">
            DEMO — Tên, avatar và thành tích minh họa cố định. Chưa kết nối dữ
            liệu người chơi thật.
          </p>
        )}
        <div className="podium">
          {top.map((e, i) => (
            <div className={`podium-card card podium-${i + 1}`} key={e.id}>
              <span className="podium-rank">#{i + 1}</span>
              <Avatar name={e.player} size={66} />
              <h2>{e.player}</h2>
              <strong>
                {e.value.toLocaleString("vi-VN")} <small>{e.unit}</small>
              </strong>
              {e.isDemo && <Badge className="badge-demo">DEMO</Badge>}
            </div>
          ))}
        </div>
        <section className="card leaderboard-full">
          <div className="card-heading">
            <Trophy size={20} className="text-accent" />
            <h2>{metrics[metric]}</h2>
            <span className="muted small">Xếp hạng toàn thời gian</span>
          </div>
          {entries.length ? (
            <RankingTable entries={entries} offset={p.skip} />
          ) : (
            <EmptyState>Chưa có thành tích cho bảng xếp hạng này.</EmptyState>
          )}
          <Pagination
            path="/leaderboards"
            page={p.page}
            total={total}
            perPage={10}
            query={{ metric }}
          />
        </section>
        {entries[0] && (
          <p className="muted small">
            Cập nhật: {date(entries[0].updatedAt)} · Avatar minh họa được lưu
            cục bộ. Dữ liệu nhập qua API hoặc quản trị.
          </p>
        )}
      </div>
    </>
  );
}
