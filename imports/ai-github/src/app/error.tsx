"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container error-page">
      <span className="eyebrow">CẦN THỬ LẠI</span>
      <h1>Trang đang gặp sự cố.</h1>
      <p>Nội dung chưa thể tải. Vui lòng thử lại sau ít phút.</p>
      <Button onClick={reset}>Tải lại nội dung</Button>
    </div>
  );
}
