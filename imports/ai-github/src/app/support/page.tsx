import type { Metadata } from "next";
import { ShieldAlert, Headphones, Scale } from "lucide-react";
import { getConfig } from "@/lib/content";
import { PageHeading } from "@/components/ui/page-heading";
import { DiscordPanel } from "@/components/features/discord-panel";
import { SupportForm } from "@/components/features/support-form";
export const metadata: Metadata = {
  title: "Discord & Hỗ trợ",
  description:
    "Gửi báo cáo người chơi, kháng nghị hình phạt và yêu cầu hỗ trợ đến quản trị viên.",
};
export default async function Support({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const [c, q] = await Promise.all([getConfig(), searchParams]);
  const type = ["REPORT", "APPEAL", "SUPPORT"].includes(q.type || "")
    ? q.type!
    : "SUPPORT";
  return (
    <>
      <PageHeading
        eyebrow="WE ARE HERE TO HELP"
        title="Luôn sẵn sàng lắng nghe"
        description="Có câu hỏi, gặp sự cố hay muốn tìm đồng đội? Cộng đồng là nơi bắt đầu."
      />
      <div className="container page-content">
        <DiscordPanel config={c} wide />
        <div className="support-layout">
          <aside>
            <span className="eyebrow">HỖ TRỢ CỘNG ĐỒNG</span>
            <h2>
              Mọi vấn đề đều
              <br />
              có nơi để sẻ chia.
            </h2>
            <p className="muted">
              Yêu cầu được lưu vào hệ thống ticket để quản trị viên xem và xử
              lý. Website chưa gửi email hay thông báo Discord tự động.
            </p>
            {[
              [
                ShieldAlert,
                "Báo cáo người chơi",
                "Ghi rõ tên, thời điểm và bằng chứng.",
              ],
              [
                Scale,
                "Kháng nghị hình phạt",
                "Trình bày sự việc trung thực, đầy đủ.",
              ],
              [
                Headphones,
                "Hỗ trợ chung",
                "Vấn đề kết nối và câu hỏi về network.",
              ],
            ].map(([Icon, title, desc]) => {
              const I = Icon as typeof ShieldAlert;
              return (
                <div className="support-type" key={String(title)}>
                  <I size={22} />
                  <div>
                    <strong>{String(title)}</strong>
                    <p>{String(desc)}</p>
                  </div>
                </div>
              );
            })}
          </aside>
          <SupportForm initialType={type as "REPORT" | "APPEAL" | "SUPPORT"} />
        </div>
      </div>
    </>
  );
}
