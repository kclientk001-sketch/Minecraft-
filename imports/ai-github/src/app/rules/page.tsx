import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeading } from "@/components/ui/page-heading";
import { RulesAccordion } from "@/components/ui/accordion";
export const metadata: Metadata = {
  title: "Quy định",
  description:
    "Quy định cộng đồng, trò chuyện, PvP, client, mod và thông tin kháng nghị.",
};
export default async function Rules() {
  const rules = await db.rule.findMany({ orderBy: { order: "asc" } });
  return (
    <>
      <PageHeading
        eyebrow="FAIR PLAY. GREAT COMMUNITY."
        title="Chơi đẹp, vui lâu"
        description="Một cộng đồng tốt bắt đầu từ cách chúng ta đối xử với nhau."
      />
      <div className="container page-content rules-layout">
        <aside className="rules-sidebar card">
          <ShieldCheck className="text-accent" size={30} />
          <h2>Quy định máy chủ</h2>
          <nav aria-label="Mục lục quy định">
            {rules.map((r, i) => (
              <a href={`#${r.slug}`} key={r.id}>
                <span>0{i + 1}</span>
                {r.title}
              </a>
            ))}
          </nav>
          <p className="small muted">
            Nội quy hiện tại là mẫu có thể chỉnh sửa. Kiểm tra thông báo chính
            thức trước khi tham gia server thật.
          </p>
        </aside>
        <RulesAccordion items={rules} />
      </div>
    </>
  );
}
