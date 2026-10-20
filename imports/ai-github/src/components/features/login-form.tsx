"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LockKeyhole, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Nhập mật khẩu"),
});
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  async function submit(values: z.infer<typeof schema>) {
    setError("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Không thể đăng nhập");
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể đăng nhập");
    }
  }
  return (
    <form
      className="card login-card"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      <span className="login-icon">
        <LockKeyhole size={28} />
      </span>
      <span className="eyebrow">NETWORK CONTROL CENTER</span>
      <h1>Đăng nhập quản trị</h1>
      <p className="muted">
        Dành cho quản trị viên và biên tập viên của network.
      </p>
      <label>
        Email
        <input
          className="input"
          type="email"
          autoComplete="username"
          {...register("email")}
        />
        {errors.email && (
          <small className="field-error">{errors.email.message}</small>
        )}
      </label>
      <label>
        Mật khẩu
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && (
          <small className="field-error">{errors.password.message}</small>
        )}
      </label>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Đang xác thực..." : "Đăng nhập"}
        <ArrowRight size={17} />
      </Button>
      <p className="small muted">
        Không có tài khoản hoặc mật khẩu mặc định. Liên hệ chủ website để được
        cấp quyền.
      </p>
    </form>
  );
}
