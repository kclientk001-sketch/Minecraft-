import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
export function Pagination({
  page,
  total,
  perPage = 9,
  path,
  query = {},
}: {
  page: number;
  total: number;
  perPage?: number;
  path: string;
  query?: Record<string, string>;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const url = (p: number) =>
    `${path}?${new URLSearchParams({ ...query, page: String(p) })}`;
  return (
    <nav className="pagination" aria-label="Phân trang">
      {page > 1 ? (
        <Link className="button button-outline button-sm" href={url(page - 1)}>
          <ChevronLeft size={16} />
          Trước
        </Link>
      ) : (
        <span />
      )}
      <span>
        Trang {page} / {pages} · {total} kết quả
      </span>
      {page < pages ? (
        <Link className="button button-outline button-sm" href={url(page + 1)}>
          Sau
          <ChevronRight size={16} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
