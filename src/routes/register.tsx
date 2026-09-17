import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import heroImg from "@/assets/hero-riverside.jpg";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "สมัครสมาชิก · Register — Riverside Kitchen" },
      { name: "description", content: "Create a Riverside Kitchen account to save your reservation history and book faster." },
      { property: "og:title", content: "Register — Riverside Kitchen" },
      { property: "og:description", content: "Create an account to save your reservation history and book faster." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) { toast.error("กรุณากรอกชื่อ-นามสกุล"); return; }
    if (phone.replace(/\D/g, "").length < 9) { toast.error("เบอร์โทรไม่ถูกต้อง"); return; }
    if (!email.includes("@")) { toast.error("กรุณากรอกอีเมลให้ถูกต้อง"); return; }
    if (password.length < 6) { toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"); return; }

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin + "/login",
        data: { full_name: fullName.trim(), phone: phone.trim() },
      },
    });
    setBusy(false);

    if (error) {
      toast.error(
        error.message.toLowerCase().includes("already")
          ? "อีเมลนี้ถูกใช้งานแล้ว"
          : error.message,
      );
      return;
    }

    if (data.session) {
      toast.success("สมัครสมาชิกสำเร็จ");
      navigate({ to: "/home" });
      return;
    }
    setSent(true);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <img src={heroImg} alt="Riverside Kitchen" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative flex items-center justify-center min-h-screen px-5 py-10">
        <div className="w-full max-w-md rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8 animate-fade-up">
          <div className="text-center mb-7">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mx-auto text-4xl shadow-lg">
              🍽️
            </div>
            <h1 className="mt-5 font-display text-3xl font-bold text-white">สมัครสมาชิก</h1>
            <p className="text-yellow-300 tracking-[4px] uppercase text-sm">Create Account</p>
          </div>

          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-white">
                เราได้ส่งอีเมลยืนยันไปที่ <span className="text-yellow-300">{email}</span>
                <br />
                กรุณากดลิงก์ในอีเมลเพื่อยืนยันบัญชี แล้วเข้าสู่ระบบ
              </p>
              <p className="text-sm text-gray-300">
                We sent a confirmation link to your email. Confirm it, then sign in.
              </p>
              <Link
                to="/login"
                className="block text-center w-full py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold hover:opacity-90 transition"
              >
                ไปหน้าเข้าสู่ระบบ · Go to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Field label="ชื่อ - นามสกุล · Full name">
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={80}
                  className={inputCls}
                  placeholder="ชื่อ นามสกุล"
                />
              </Field>

              <Field label="เบอร์โทรศัพท์ · Phone">
                <input
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={20}
                  className={inputCls}
                  placeholder="081-234-5678"
                />
              </Field>

              <Field label="อีเมล · Email">
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="you@example.com"
                />
              </Field>

              <Field label="รหัสผ่าน · Password">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                  placeholder="••••••••"
                />
              </Field>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold hover:opacity-90 transition disabled:opacity-60"
              >
                {busy ? "กำลังสมัคร..." : "สมัครสมาชิก · Register"}
              </button>

              <Link
                to="/login"
                className="block text-center w-full py-3 text-sm text-gray-300 hover:text-white transition"
              >
                มีบัญชีอยู่แล้ว? เข้าสู่ระบบ · Already have an account?
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl bg-white/20 border border-white/30 text-white placeholder:text-gray-300 px-4 py-3.5 outline-none focus:border-yellow-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-white/80 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
