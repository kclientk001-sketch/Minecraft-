import type { Metadata } from "next";
import { ThumbsUp, Gift, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { getConfig, getLinks } from "@/lib/content";
import { PageHeading, EmptyState } from "@/components/ui/page-heading";
import { ExternalButton } from "@/components/features/external-button";
export const metadata: Metadata = {
  title: "Bình chọn",
  description:
    "Hướng dẫn bình chọn và thông tin kết nối hệ thống vote của network.",
};
export default async function Vote() {
  const [config, all] = await Promise.all([getConfig(), getLinks()]);
  const links = all.filter((l) => l.kind === "vote");
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE VOTE. A BIG DIFFERENCE."
        title="Cùng đưa network vươn xa"
        description="Mỗi bình chọn giúp người chơi mới tìm thấy cộng đồng của bạn."
      />
      <div className="container page-content vote-layout">
        <div>
          <h2 className="content-title">
            Chọn trang bình chọn
            <ThumbsUp size={23} />
          </h2>
          {links.length ? (
            links.map((l, i) => (
              <div className="card vote-link" key={l.id}>
                <span className="icon-box">0{i + 1}</span>
                <div>
                  <h3>{l.label}</h3>
                  <p>
                    Mở trang bên ngoài và làm theo hướng dẫn của đơn vị cung
                    cấp.
                  </p>
                </div>
                <ExternalButton url={l.url}>
                  Bình chọn
                  <ArrowUpRight size={15} />
                </ExternalButton>
              </div>
            ))
          ) : (
            <EmptyState>
              <ThumbsUp size={40} />
              <h3>Chưa có trang vote chính thức</h3>
              <p>
                Quản trị viên cần thêm và bật URL bình chọn thật. Bạn chưa thể
                nhận thưởng vote tại bản cài đặt này.
              </p>
            </EmptyState>
          )}
          <section className="card how-to">
            <h2>Bình chọn như thế nào?</h2>
            {[
              "Mở trang vote chính thức được quản trị viên cung cấp.",
              "Nhập chính xác tên Minecraft của bạn và hoàn thành xác minh trên trang đó.",
              "Kết nối server để nhận thưởng nếu server đã tích hợp Votifier/NuVotifier.",
            ].map((step, i) => (
              <div key={step}>
                <span>0{i + 1}</span>
                <p>{step}</p>
                <CheckCircle2 size={17} />
              </div>
            ))}
          </section>
        </div>
        <aside className="card reward-card">
          <Gift size={40} />
          <span className="eyebrow">VOTE REWARDS</span>
          <h2>Một lời cảm ơn nhỏ</h2>
          <p className="prose-text">{config.VOTE_REWARDS}</p>
          <div className="notice">
            Chưa kết nối backend xác minh vote. Không hiển thị lịch sử hoặc top
            voters giả.
          </div>
        </aside>
      </div>
    </>
  );
}
