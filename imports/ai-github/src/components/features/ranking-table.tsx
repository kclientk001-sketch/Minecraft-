import Image from "next/image";
import { Crown, Trophy } from "lucide-react";
import type { Ranking } from "@/types";
import { Badge } from "@/components/ui/badge";
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const index = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 12;
  return (
    <Image
      className="pixel-avatar"
      src={`/images/avatar-${index}.svg`}
      width={size}
      height={size}
      alt={`Avatar minh họa của ${name}`}
    />
  );
}
export function RankingTable({
  entries,
  offset = 0,
  compact = false,
}: {
  entries: Ranking[];
  offset?: number;
  compact?: boolean;
}) {
  return (
    <div className={`rankings ${compact ? "compact" : ""}`}>
      <div className="ranking-header">
        <span>HẠNG</span>
        <span>NGƯỜI CHƠI</span>
        <span>THÀNH TÍCH</span>
      </div>
      {entries.map((entry, i) => {
        const rank = i + offset + 1;
        return (
          <div className={`ranking-row rank-${rank}`} key={entry.id}>
            <span className="ranking-position">
              {rank === 1 ? (
                <Crown size={18} />
              ) : rank <= 3 ? (
                <Trophy size={16} />
              ) : (
                String(rank).padStart(2, "0")
              )}
            </span>
            <div className="ranking-player">
              <Avatar name={entry.player} />
              <div>
                <strong>{entry.player}</strong>
                {!compact && <small>{entry.source}</small>}
              </div>
              {entry.isDemo && <Badge className="badge-demo">DEMO</Badge>}
            </div>
            <span className="ranking-value">
              {entry.value.toLocaleString("vi-VN")} <small>{entry.unit}</small>
            </span>
          </div>
        );
      })}
    </div>
  );
}
