import Link from "next/link";
import { Compass } from "lucide-react";
export default function NotFound() {
  return (
    <div className="container error-page">
      <Compass size={60} />
      <span className="eyebrow">404 · LẠC KHỎI BẢN ĐỒ</span>
      <h1>Chunk này chưa được tạo.</h1>
      <p>Trang bạn đang tìm không tồn tại hoặc đã được chuyển đi.</p>
      <Link href="/" className="button button-primary">
        Về sảnh chính
      </Link>
    </div>
  );
}
