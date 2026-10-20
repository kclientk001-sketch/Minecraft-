"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supportSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
type Values = z.infer<typeof supportSchema>;
export function SupportForm({ initialType }: { initialType: Values["type"] }) {
  const [disconnected, setDisconnected] = useState(false);
  useEffect(() => {
    setDisconnected(
      !!window.MC_NETWORK?.staticMode && !window.MC_NETWORK.apiBase,
    );
  }, []);
  const [ticket, setTicket] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<Values>({
    resolver: zodResolver(supportSchema),
    defaultValues: {
      type: initialType,
      player: "",
      email: "",
      subject: "",
      message: "",
      evidenceUrl: "",
      website: "",
    },
  });
  useEffect(() => {
    if (window.MC_NETWORK?.staticMode) {
      const type = new URLSearchParams(window.location.search).get("type");
      if (type === "REPORT" || type === "APPEAL" || type === "SUPPORT")
        setValue("type", type);
    }
  }, [setValue]);
  async function submit(values: Values) {
    try {
      const res = await fetch(
        `${window.MC_NETWORK?.apiBase || ""}/api/support`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể gửi yêu cầu");
      setTicket(data.id);
      reset();
      toast.success("Đã lưu yêu cầu hỗ trợ");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể gửi yêu cầu");
    }
  }
  if (ticket)
    return (
      <div className="card support-success" role="status">
        <CheckCircle2 size={48} />
        <h2>Đã nhận yêu cầu của bạn</h2>
        <p>
          Mã ticket: <code>{ticket}</code>
        </p>
        <p>
          Yêu cầu đã lưu trong hệ thống quản trị. Hãy giữ mã này và liên hệ kênh
          hỗ trợ chính thức khi cần bổ sung thông tin.
        </p>
        <Button variant="secondary" onClick={() => setTicket(null)}>
          Gửi yêu cầu khác
        </Button>
      </div>
    );
  return (
    <form
      className="card support-form"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      <h2>Gửi yêu cầu hỗ trợ</h2>
      {disconnected && (
        <p className="notice">
          Bản tĩnh chưa kết nối backend. Chưa thể gửi ticket; hãy dùng kênh hỗ
          trợ chính thức sau khi được cấu hình.
        </p>
      )}
      <label>
        Loại yêu cầu
        <select className="input" {...register("type")}>
          <option value="SUPPORT">Hỗ trợ chung</option>
          <option value="REPORT">Báo cáo người chơi</option>
          <option value="APPEAL">Kháng nghị hình phạt</option>
        </select>
      </label>
      <div className="form-grid">
        <label>
          Tên Minecraft
          <input
            className="input"
            autoComplete="nickname"
            aria-label="Tên Minecraft"
            aria-describedby={
              errors.player ? "support-player-error" : undefined
            }
            {...register("player")}
            aria-invalid={!!errors.player}
          />
          {errors.player && (
            <small id="support-player-error" className="field-error">
              {errors.player.message}
            </small>
          )}
        </label>
        <label>
          Email liên hệ
          <input
            type="email"
            className="input"
            autoComplete="email"
            aria-label="Email liên hệ"
            aria-describedby={errors.email ? "support-email-error" : undefined}
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <small id="support-email-error" className="field-error">
              {errors.email.message}
            </small>
          )}
        </label>
      </div>
      <label>
        Tiêu đề
        <input
          className="input"
          aria-label="Tiêu đề"
          aria-describedby={
            errors.subject ? "support-subject-error" : undefined
          }
          {...register("subject")}
          aria-invalid={!!errors.subject}
        />
        {errors.subject && (
          <small id="support-subject-error" className="field-error">
            {errors.subject.message}
          </small>
        )}
      </label>
      <label>
        Nội dung
        <textarea
          className="input"
          rows={6}
          placeholder="Mô tả vấn đề, thời điểm và thông tin cần thiết..."
          aria-label="Nội dung"
          aria-describedby={
            errors.message ? "support-message-error" : undefined
          }
          {...register("message")}
          aria-invalid={!!errors.message}
        />
        {errors.message && (
          <small id="support-message-error" className="field-error">
            {errors.message.message}
          </small>
        )}
      </label>
      <label>
        Link bằng chứng (không bắt buộc)
        <input
          className="input"
          type="url"
          placeholder="https://..."
          {...register("evidenceUrl")}
        />
        {errors.evidenceUrl && (
          <small className="field-error">{errors.evidenceUrl.message}</small>
        )}
      </label>
      <label className="honeypot" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" {...register("website")} />
      </label>
      <p className="muted small">
        Không gửi mật khẩu hoặc mã xác thực. Email chỉ dùng để quản trị viên
        liên hệ khi xử lý yêu cầu. Đọc{" "}
        <a href="/privacy" className="text-accent">
          chính sách quyền riêng tư
        </a>
        .
      </p>
      <Button type="submit" disabled={isSubmitting || disconnected}>
        <Send size={17} />
        {disconnected
          ? "Backend chưa kết nối"
          : isSubmitting
            ? "Đang gửi..."
            : "Gửi yêu cầu"}
      </Button>
    </form>
  );
}
