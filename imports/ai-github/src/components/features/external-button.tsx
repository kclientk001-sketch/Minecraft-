"use client";
import { toast } from "sonner";
import { MessageCircle, ArrowUpRight } from "lucide-react";
import { placeholderUrl, cn } from "@/lib/utils";
export function ExternalButton({
  url,
  children,
  className,
  discord = false,
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
  discord?: boolean;
}) {
  if (placeholderUrl(url))
    return (
      <button
        className={cn("button button-secondary", className)}
        onClick={() =>
          toast.info("Liên kết mẫu chưa được cấu hình", {
            description:
              "Quản trị viên cần cập nhật URL thật trong Cấu hình website.",
          })
        }
      >
        {discord && <MessageCircle size={18} />} {children}
        <ArrowUpRight size={16} />
      </button>
    );
  return (
    <a
      className={cn("button button-secondary", className)}
      href={url}
      target={url.startsWith("https:") ? "_blank" : undefined}
      rel="noopener noreferrer"
    >
      {discord && <MessageCircle size={18} />} {children}
      <ArrowUpRight size={16} />
    </a>
  );
}
