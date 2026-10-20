import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { LoginForm } from "@/components/features/login-form";
export default async function Login() {
  if (await currentUser()) redirect("/admin");
  return (
    <div className="container login-page">
      <LoginForm />
    </div>
  );
}
