"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await fetch("/api/auth/logout", { method: "POST" });
          if (!r.ok) throw Error();
          router.push("/admin/login");
          router.refresh();
        } catch {
          toast.error("Không thể đăng xuất. Thử lại.");
          setBusy(false);
        }
      }}
    >
      <LogOut size={15} />
      Đăng xuất
    </Button>
  );
}
