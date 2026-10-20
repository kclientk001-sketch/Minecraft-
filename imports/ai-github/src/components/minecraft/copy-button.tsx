"use client";
import { useState } from "react";
import { Copy, Check, Gamepad2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
export function CopyButton({
  address,
  compact = false,
}: {
  address: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Đã sao chép IP máy chủ", { description: address });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Trình duyệt chưa cho phép sao chép", {
        description: `Chọn và sao chép thủ công: ${address}`,
        duration: 9000,
      });
    }
  }
  return (
    <Button
      onClick={copy}
      className={compact ? "copy-compact" : "copy-server"}
      size={compact ? "sm" : "default"}
      aria-label={`Sao chép IP ${address}`}
    >
      {copied ? (
        <Check size={18} />
      ) : compact ? (
        <Copy size={16} />
      ) : (
        <Gamepad2 size={20} />
      )}
      <span>{copied ? "Đã sao chép!" : compact ? "Copy IP" : address}</span>
      {!compact && <Copy size={16} className="copy-symbol" />}
    </Button>
  );
}
