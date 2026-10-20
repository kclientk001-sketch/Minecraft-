import type { Metadata } from "next";
import { getModes } from "@/lib/content";
import { PageHeading, EmptyState } from "@/components/ui/page-heading";
import { ModeCard } from "@/components/features/content-cards";
export const metadata: Metadata = {
  title: "Chế độ chơi",
  description:
    "Khám phá BedWars, SkyWars, SkyPvP, Practice, Survival và nhiều thử thách khác.",
};
export default async function GameModes() {
  const modes = await getModes();
  return (
    <>
      <PageHeading
        eyebrow="FIND YOUR GAME"
        title="Chọn cuộc phiêu lưu"
        description="Một trận đấu nhanh hay cả một hành trình dài — luôn có một thế giới dành cho bạn."
      />
      <div className="container page-content">
        {modes.length ? (
          <div className="mode-grid mode-grid-full">
            {modes.map((m, i) => (
              <ModeCard key={m.id} mode={m} index={i} />
            ))}
          </div>
        ) : (
          <EmptyState>Chưa có chế độ chơi được bật.</EmptyState>
        )}
      </div>
    </>
  );
}
