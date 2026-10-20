import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="page-heading">
      <div className="container">
        <div className="breadcrumb">
          <Link href="/">Trang chủ</Link>
          <ChevronRight size={13} />
          <span>{title}</span>
        </div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>
          {title}
          <span className="text-accent">.</span>
        </h1>
        <p>{description}</p>
      </div>
    </header>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  href,
  link = "Khám phá tất cả",
}: {
  eyebrow: string;
  title: string;
  href?: string;
  link?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {href && (
        <Link href={href} className="text-link">
          {link}
          <ArrowUpRight size={17} />
        </Link>
      )}
    </div>
  );
}
export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state card">{children}</div>;
}
